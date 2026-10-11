import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);

// Exercise the real route, validator, NextResponse, and Supabase SDK without
// opening ports or using live credentials. Only the provider transport is fake.
function loadTsModule(path, dependencies = {}, fetchImpl = fetch) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const loaded = { exports: {} };
  new Function("require", "module", "exports", "fetch", outputText)(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name),
    loaded, loaded.exports, fetchImpl,
  );
  return loaded.exports;
}

const validator = loadTsModule("../lib/rsvp.ts");
const statusDefinitions = loadTsModule("../lib/rsvp-status.ts");
const valid = { names: "  Test Guest  ", phone: "+49 151 23456789", attending: true, guest_count: 4, message: "  Five guests, vegetarian please.  " };
const invalidPhones = [undefined, null, 4915123456789, "", "4915123456789", "004915123456789", "+", "+49", "+49-151-23456789", "+49 (151) 23456789", "+49 abc", "+49\t15123456789", "+49\n15123456789", "+4915123456789\n", "\t+4915123456789", "+04915123456789", "+1234567890123456", "+４９１５１２３４５６７８９", "+49" + " ".repeat(70) + "15123456789"];

function routeWithProvider(fetchImpl, env = {}, path = "../app/api/rsvp/route.ts") {
  const client = loadTsModule("../lib/supabase.ts", {
    "server-only": {}, // Build separately verifies the server-only import boundary.
    "node:process": { env },
  }, fetchImpl);
  return loadTsModule(path, {
    "@/lib/rsvp": validator,
    "@/lib/rsvp-status": statusDefinitions,
    "@/lib/supabase": client,
  }).POST;
}

function submitTo(post, data, headers = {}) {
  return post(new Request("http://localhost:3000/api/rsvp", {
    method: "POST", headers: { "Content-Type": "application/json", Host: "localhost:3000", ...headers },
    body: typeof data === "string" ? data : JSON.stringify(data),
  }));
}

const fixtureEnv = { NEXT_PUBLIC_SUPABASE_URL: "http://supabase.test", SUPABASE_SECRET_KEY: "sb_secret_test_fixture" };

test("shared form/server phone validation rejects missing + and invalid characters, and normalizes spaces", () => {
  for (const phone of invalidPhones) {
    const result = validator.validateRsvp({ ...valid, phone });
    assert.equal(result.field, "phone", `Reject ${JSON.stringify(phone)}`);
    assert.match(result.error, /starting with \+/);
  }
  for (const phone of ["+4915123456789", "+49 151 23456789", "  +49 151 23456789  "]) {
    assert.equal(validator.validateRsvp({ ...valid, phone }).data.phone, "+4915123456789");
  }
  assert.equal(validator.validatePhone("+1234567"), "+1234567");
  assert.equal(validator.validatePhone("+123456789012345"), "+123456789012345");
});

test("RSVP API sends a phone conflict upsert; repeated and differently spaced numbers update one fixture record", async () => {
  const replies = new Map();
  const requests = [];
  const provider = async (input, init) => {
    const url = new URL(String(input));
    const headers = new Headers(init.headers);
    assert.equal(init.method, "POST");
    assert.equal(url.origin, "http://supabase.test");
    assert.equal(url.pathname, "/rest/v1/rsvps");
    assert.equal(url.searchParams.get("on_conflict"), "phone");
    assert.match(headers.get("prefer"), /resolution=merge-duplicates/);
    assert.doesNotMatch(headers.get("prefer"), /return=representation/);
    assert.equal(headers.get("apikey"), "sb_secret_test_fixture");
    const row = JSON.parse(init.body);
    assert.deepEqual(Object.keys(row).sort(), ["attending", "guest_count", "message", "names", "phone"]);
    requests.push(row);
    const previous = replies.get(row.phone);
    replies.set(row.phone, { ...previous, id: previous?.id ?? replies.size + 1, ...row });
    return new Response(null, { status: 201 });
  };
  const post = routeWithProvider(provider, fixtureEnv);
  const submit = (data, headers) => submitTo(post, data, headers);
  const response = await submit(valid, { Origin: "http://localhost:3000" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  const phone = "+4915123456789";
  const original = replies.get(phone);
  assert.deepEqual(original, { id: 1, ...valid, phone, names: "Test Guest", message: "Five guests, vegetarian please." });
  const adminFields = { admin_comments: "Room reserved by administrator", room_confirmed: true };
  replies.set(phone, { ...original, ...adminFields });
  const declined = { ...valid, names: "Updated Guest", attending: false, guest_count: 0, message: "Plans changed." };
  assert.equal((await submit({ ...declined, admin_comments: "Guest forgery", room_confirmed: false })).status, 200);
  assert.equal(replies.size, 1, "The exact same phone submitted twice must update one record");
  assert.deepEqual(replies.get(phone), { ...declined, id: original.id, phone, ...adminFields });
  const revised = { ...valid, phone, guest_count: 2, message: "We can come after all." };
  assert.equal((await submit(revised)).status, 200);
  assert.equal(replies.size, 1, "Changing phone spacing must not create a duplicate");
  assert.deepEqual(replies.get(phone), { ...revised, names: "Test Guest", id: original.id, ...adminFields });
  await Promise.all([submit({ ...revised, guest_count: 1 }), submit({ ...revised, guest_count: 3 })]);
  assert.equal(replies.size, 1, "Concurrent retries must use the same conflict identifier");
  assert.equal((await submit({ ...valid, phone: "+91 98765 43210" })).status, 200);
  assert.equal(replies.size, 2, "A different phone must create a separate RSVP");
  assert.equal(requests.length, 6);
});

test("invalid RSVP requests never reach Supabase", async () => {
  let providerCalls = 0;
  const post = routeWithProvider(async () => { providerCalls++; return new Response(null, { status: 201 }); }, fixtureEnv);
  const submit = (data, headers) => submitTo(post, data, headers);
  for (const phone of invalidPhones) {
    const response = await submit({ ...valid, phone });
    assert.equal(response.status, 400);
    const result = await response.json();
    assert.equal(result.field, "phone");
    assert.match(result.error, /starting with \+/);
  }
  for (const invalid of [null, {}, { ...valid, names: "   " }, { ...valid, names: "x".repeat(161) },
    { ...valid, attending: "false" }, { ...valid, guest_count: 5 }, { ...valid, guest_count: 1.5 },
    { ...valid, attending: false, guest_count: 1 }, { ...valid, message: "x".repeat(2001) },
  ]) assert.equal((await submit(invalid)).status, 400);
  assert.equal((await submit("{invalid json")).status, 400);
  assert.equal((await submit("x".repeat(13000))).status, 413);
  assert.equal((await submit(valid, { "Content-Type": "text/plain" })).status, 415);
  assert.equal((await submit(valid, { Origin: "https://unrelated.example" })).status, 403);
  assert.equal((await submit(valid, { Origin: "null" })).status, 403);
  assert.equal(providerCalls, 0);
});

test("provider failures and network errors never produce a false success or expose provider details", async (t) => {
  t.mock.method(console, "error", () => {});
  for (const code of ["42501", "23505"]) {
    const post = routeWithProvider(async () => new Response(JSON.stringify({ code, message: "Private provider error" }), {
      status: 403, headers: { "Content-Type": "application/json" },
    }), fixtureEnv);
    const response = await submitTo(post, valid);
    assert.equal(response.status, 502);
    assert.doesNotMatch(JSON.stringify(await response.json()), /Private provider error|42501|23505|success/);
  }
  const post = routeWithProvider(async () => { throw new TypeError("Private network details"); }, fixtureEnv);
  const response = await submitTo(post, valid);
  assert.equal(response.status, 502);
  assert.doesNotMatch(JSON.stringify(await response.json()), /Private network details|success/);
});

test("missing server credentials refuse submissions, even if an anonymous public key is configured", async () => {
  const post = routeWithProvider(async () => { assert.fail("Must never contact Supabase without a server key"); }, {
    NEXT_PUBLIC_SUPABASE_URL: "http://supabase.test", NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_test_fixture",
  });
  assert.equal((await submitTo(post, valid)).status, 503);
});

test("legacy service-role keys remain supported only on the server", async () => {
  const post = routeWithProvider(async (_input, init) => {
    assert.equal(new Headers(init.headers).get("apikey"), "legacy-service-role-fixture");
    return new Response(null, { status: 201 });
  }, { NEXT_PUBLIC_SUPABASE_URL: "http://supabase.test", SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role-fixture" });
  assert.equal((await submitTo(post, valid)).status, 200);
});

test("status lookup uses an exact normalized phone and returns only guest-visible summary fields", async () => {
  for (const room_confirmed of [true, false, null]) {
    let calls = 0;
    const admin_comments = room_confirmed === true ? "Welcome! Your room is ready." : room_confirmed === false ? "" : null;
    const post = routeWithProvider(async (input, init) => {
      calls++;
      const url = new URL(String(input));
      assert.equal(init.method, "GET");
      assert.equal(url.pathname, "/rest/v1/rsvps");
      assert.equal(url.searchParams.get("select"), "*");
      assert.equal(url.searchParams.get("phone"), "eq.+4915123456789");
      assert.equal(new Headers(init.headers).get("accept"), "application/vnd.pgrst.object+json");
      return new Response(JSON.stringify({
        id: 123, names: "Test Guest", attending: room_confirmed !== null, guest_count: room_confirmed === null ? 0 : 2,
        room_confirmed, admin_comments, phone: "+4915123456789", message: "Private guest message",
      }), { headers: { "Content-Type": "application/json" } });
    }, fixtureEnv, "../app/api/rsvp/status/route.ts");
    const response = await submitTo(post, { phone: "+49 151 23456789", room_confirmed: true }, { Origin: "http://localhost:3000" });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await response.json(), { data: {
      names: "Test Guest", attending: room_confirmed !== null, guest_count: room_confirmed === null ? 0 : 2, room_confirmed: room_confirmed === true, admin_comments,
    } });
    assert.equal(calls, 1);
  }
});

test("status lookup returns the requested not-found message and handles provider failures without leaking details", async (t) => {
  t.mock.method(console, "error", () => {});
  const cases = [
    { code: "PGRST116", status: 406, expected: 404 },
    { code: "42501", status: 403, expected: 502 },
    { code: "42703", status: 400, expected: 502 },
  ];
  for (const { code, status, expected } of cases) {
    const post = routeWithProvider(async () => new Response(JSON.stringify({ code, message: "Private provider details" }), {
      status, headers: { "Content-Type": "application/json" },
    }), fixtureEnv, "../app/api/rsvp/status/route.ts");
    const response = await submitTo(post, { phone: valid.phone });
    assert.equal(response.status, expected);
    const result = await response.json();
    if (expected === 404) assert.equal(result.error, statusDefinitions.STATUS_NOT_FOUND);
    assert.doesNotMatch(JSON.stringify(result), /Private provider details|admin_comments|room_confirmed|data/);
    assert.match(response.headers.get("cache-control"), /no-store/);
  }
  const post = routeWithProvider(async () => { throw new TypeError("Private network details"); }, fixtureEnv, "../app/api/rsvp/status/route.ts");
  const response = await submitTo(post, { phone: valid.phone });
  assert.equal(response.status, 502);
  assert.doesNotMatch(JSON.stringify(await response.json()), /Private network details/);
});

test("status lookup rejects invalid requests before contacting Supabase and requires server credentials", async () => {
  let calls = 0;
  const provider = async () => { calls++; assert.fail("Invalid request must not query the database"); };
  const post = routeWithProvider(provider, fixtureEnv, "../app/api/rsvp/status/route.ts");
  for (const phone of invalidPhones) assert.equal((await submitTo(post, { phone })).status, 400);
  for (const input of [null, {}, "{bad json"]) assert.equal((await submitTo(post, input)).status, 400);
  assert.equal((await submitTo(post, "x".repeat(1025))).status, 413);
  assert.equal((await submitTo(post, { phone: valid.phone }, { Origin: "https://unrelated.example" })).status, 403);
  assert.equal((await submitTo(post, { phone: valid.phone }, { Origin: "null" })).status, 403);
  assert.equal((await submitTo(post, { phone: valid.phone }, { "Content-Type": "text/plain" })).status, 415);
  const unconfigured = routeWithProvider(provider, {}, "../app/api/rsvp/status/route.ts");
  assert.equal((await submitTo(unconfigured, { phone: valid.phone })).status, 503);
  assert.equal(calls, 0);
});

test("rendered summary shows Confirmed only for true, Pending Assignment for false/null, and both attendance states", () => {
  const { RsvpStatusSummary } = loadTsModule("../components/rsvp-status.tsx", {
    "@/lib/rsvp": validator, "@/lib/rsvp-status": statusDefinitions,
  });
  for (const room_confirmed of [true, false, null]) {
    for (const attending of [true, false]) {
      const html = renderToStaticMarkup(createElement(RsvpStatusSummary, { status: {
        names: "Priya & Arjun", attending, guest_count: attending ? 2 : 0, room_confirmed,
      } }));
      assert.match(html, /Priya &amp; Arjun/);
      assert.ok(html.includes(attending ? "Attending" : "Celebrating from afar"));
      assert.ok(html.includes(room_confirmed === true ? "Confirmed" : "Pending Assignment"));
      assert.ok(!html.includes(room_confirmed === true ? "Pending Assignment" : ">Confirmed<"));
      assert.match(html, new RegExp(`<dd[^>]*>${attending ? 2 : 0}</dd>`));
    }
  }
});

test("host notes render after Room Status as escaped text, and null/empty notes render no section", () => {
  const { RsvpStatusSummary } = loadTsModule("../components/rsvp-status.tsx", {
    "@/lib/rsvp": validator, "@/lib/rsvp-status": statusDefinitions,
  });
  for (const admin_comments of [null, "", "Welcome!\nYour room is ready.", "<script>alert('test')</script>"]) {
    const html = renderToStaticMarkup(createElement(RsvpStatusSummary, { status: {
      names: "Test Guest", attending: true, guest_count: 2, room_confirmed: true, admin_comments,
    } }));
    assert.equal(html.includes("Note from the Hosts"), Boolean(admin_comments));
    if (admin_comments) {
      assert.ok(html.indexOf("Note from the Hosts") > html.indexOf("Room Status"));
      assert.match(html, /italic/);
    }
    if (admin_comments?.startsWith("<script>")) {
      assert.ok(html.includes("&lt;script&gt;"));
      assert.ok(!html.includes("<script>"));
    }
  }
});
