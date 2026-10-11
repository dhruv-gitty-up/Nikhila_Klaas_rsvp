# Nikhila & Klaas — Wedding RSVP

A responsive wedding invitation for **31 March – 1 April 2027, Chennai, India**, built with Next.js App Router, TypeScript, Tailwind CSS, Playfair Display, Lato, Lucide, and Supabase.

## Run locally

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). For production, run `npm run build` followed by `npm start`.

## Supabase configuration

Set these values in `.env.local` and your hosting environment (see `.env.example`):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_ONLY_SECRET_KEY
```

Use an existing Supabase secret API key from the wedding project's API Keys settings. The legacy `SUPABASE_SERVICE_ROLE_KEY` is also supported. **Never give either key a `NEXT_PUBLIC_` prefix or send it to the browser.** The client in `lib/supabase.ts` is server-only and reads credentials at runtime; restart the server after changing them. An anonymous/publishable key alone is insufficient for this upsert implementation.

The `/api/rsvp` endpoint upserts only validated `names`, `phone`, `attending`, `guest_count`, and `message` into `public.rsvps`, with `onConflict: "phone"`. It returns only `{ success: true }`, without exposing guest replies. A server-only key allows updates while keeping public SELECT/UPDATE access disabled. Supabase's [API key documentation](https://supabase.com/docs/guides/getting-started/api-keys) explains the distinction between public and secret keys; see also [upsert](https://supabase.com/docs/reference/javascript/upsert) and [row level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

### Required migration and rollout

1. Configure the server-only key locally and in hosting before enabling the new API.
2. For the existing wedding database, apply `supabase/migrations/20261011181027_add_rsvp_phone_upserts.sql` in the project's SQL editor. For a new database, apply all migrations in timestamp order.
3. Deploy/restart the updated application together with the migration. The migration revokes the earlier anonymous insert grants, so the old anonymous-key application must be replaced during rollout.
4. Apply `supabase/migrations/20261011190745_add_rsvp_room_status.sql` to add the administrative columns when absent. The current wedding database already exposes both columns. Run `supabase/tests/rsvp_phone_upsert.sql` after both migrations. It verifies that two submissions with one phone retain a single row and its ID, preserve admin notes and room confirmation, and rolls back its synthetic data.
5. Submit through the form locally, reload, and submit changed attendance/count/message with the same phone. Both submissions should show the saved confirmation; check the single updated row in the dashboard.

The migration adds the phone column, its canonical format check, and a unique constraint required by `ON CONFLICT`, reusing existing phone constraints when present. For databases that previously lacked phone numbers, historical RSVPs remain intact with `phone = NULL` because their numbers cannot be inferred. A `NOT VALID` check requires a non-null phone for new or updated rows without rejecting historical data during migration. Backfill legacy replies with correct, distinct numbers before running `ALTER TABLE public.rsvps VALIDATE CONSTRAINT rsvps_phone_required`. A legacy reply without a backfilled phone cannot be matched to a new submission. The current wedding database already has a `NOT NULL UNIQUE` phone column, so it needs no backfill.

**Live verification:** the migration was applied through the already signed-in Safari Supabase dashboard. The transactional SQL verification passed under `service_role`: two submissions with the same phone retained one row and its ID, updated all RSVP values, and rejected invalid/missing phones. Synthetic data was rolled back. A follow-up query confirmed RLS, phone uniqueness, the phone format check, no anonymous SELECT/INSERT/UPDATE access, no authenticated SELECT access, and zero residual test replies. The existing project secret key is configured in the gitignored local `.env.local`; configure the same server-only variable in hosting when deploying this code. The separately connected Supabase management account cannot access the wedding project.

## RSVP behavior

- Required names, WhatsApp phone number, and attendance; validation runs on both client and server.
- Phone numbers start with `+`, contain 7–15 digits with a nonzero country code, and accept ordinary spaces. Invalid phones show an error below the field; dashes, parentheses, letters, tabs, and newlines are rejected.
- Spaces are removed before saving, so `+49 151 23456789` and `+4915123456789` identify the same reply. Reusing the number replaces names, attendance, count, and message.
- “Wouldn't miss it!” sends `attending: true`; “Celebrating from afar” sends `attending: false`.
- Attending guest counts are 1–4, with 4 representing 4+; the form asks for a larger exact count in the message. Declined replies store zero guests.
- Controls disable while sending. Errors retain the guest's details. The thank-you screen appears only after a successful upsert: “Thank you! Your RSVP has been saved. You can use your phone number to update your response later.”
- Client requests time out after 20 seconds; Supabase requests after 12 seconds. Retrying with the same normalized phone updates the existing reply.

## Files

- `app/page.tsx`: floral mandap hero, events, travel cards, footer.
- `app/globals.css`, `app/layout.tsx`: design tokens, typography, focus styles, reduced motion.
- `components/rsvp-form.tsx`: form, inline phone error, and success state.
- `components/rsvp-status.tsx`: phone lookup below the travel cards and responsive RSVP/room summary.
- `app/api/rsvp/status/route.ts`, `lib/rsvp-status.ts`: server-only status lookup and public summary contract.
- `app/api/rsvp/route.ts`, `lib/rsvp.ts`, `lib/supabase.ts`: validation and server-only upsert.
- `supabase/migrations/20261011181027_add_rsvp_phone_upserts.sql`: phone uniqueness and private server access.
- `supabase/tests/rsvp_phone_upsert.sql`: transactional database verification.
- `supabase/migrations/20261011190745_add_rsvp_room_status.sql`: administrative room fields for fresh databases.
- `docs/design-notes.md`: design references and retained artwork.

## Verification

```sh
npm run lint
npm run build
npm test
```

The automated tests invoke the real route, shared validator, NextResponse, and Supabase SDK in process with an isolated provider transport fixture. They verify rejection of phones without `+`, invalid characters/length, normalization, exact upsert conflict settings, same-phone updates preserving the fixture ID, different-phone inserts, concurrent retry targeting, attendance/count changes, invalid requests, browser origins, missing server credentials, and provider/network failures. They never use live credentials or open server ports. These are API/SDK tests, not proof that the remote migration has been applied; use the SQL verification file and browser flow for that.

### Check Your Status

The card below the travel grid posts a normalized phone number to `/api/rsvp/status`. The server queries `.select("*").eq("phone", phone).single()` with the existing server-only client, then returns `names`, `attending`, `guest_count`, `room_confirmed`, and `admin_comments`. The administrator-written comment is guest-visible as “Note from the Hosts” below Room Status when nonempty; null and empty comments omit the section. Notes render as escaped text in a muted, italic cream container, preserving line breaks and wrapping long text. Guest messages, phone numbers, and database IDs are not returned. Responses use `Cache-Control: private, no-store`; phones are sent in the request body rather than URLs. Direct public table reads remain disabled.

Only a boolean `true` displays “Confirmed”; `false` and `null` display “Pending Assignment”. Missing replies show “No RSVP found for this number. Please ensure you included your country code.” Loading disables the controls, errors allow retries, and editing the phone clears the previous summary. Administrators maintain `admin_comments` and `room_confirmed` in Supabase; RSVP validation constructs exactly the five guest-editable fields even if a caller submits forged admin values.

Local lint, production build, and all **11** automated tests passed. Tests cover the exact single-row SDK query, normalized phones, response field filtering, no-store headers, not-found/provider errors, rendered confirmation for true/false/null, both attendance states, conditional host notes, text escaping, and admin-field omission/preservation during upserts. Earlier live phone database verification passed as described above; the extended SQL admin-preservation assertion has not yet been run remotely.

Rendered QA passed using the installed Playwright runtime against `http://localhost:3100` because the Browser plugin is unavailable. Status responses were intercepted with synthetic fixtures; no guest records were modified. At 320, 375, 768, and 1440 pixels the controls and summary fit without horizontal overflow. Invalid-phone, loading, confirmed, pending (false/null), declined, missing-record, network-error, and stale-result clearing flows passed with no runtime errors. The only console errors were the intentionally simulated 404 and network failure. Screenshots and the temporary QA script are kept outside the repository.

Host-note QA also passed against `http://localhost:3101`: all 16 combinations of null, empty, multiline, and long unbroken notes at 320, 375, 768, and 1440 pixels rendered correctly, without overflow or console errors. Null/empty notes create no label or container. Populated notes appear directly below Room Status in italic text with preserved line breaks.
