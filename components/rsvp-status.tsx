"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, LoaderCircle } from "lucide-react";
import { PHONE_ERROR, validatePhone } from "@/lib/rsvp";
import { type RsvpStatus } from "@/lib/rsvp-status";

export function RsvpStatusSummary({ status }: { status: RsvpStatus }) {
  const confirmed = status.room_confirmed === true;
  return <div className="mt-6 rounded-sm border border-gold/70 bg-forest/[0.03] p-5 sm:p-6">
    <h3 className="mb-5 font-serif text-xl text-forest">Your RSVP details</h3>
    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <div className="min-w-0 sm:col-span-2">
        <dt className="text-xs tracking-wider">Name</dt>
        <dd className="mt-1 font-serif text-xl text-forest [overflow-wrap:anywhere]">{status.names}</dd>
      </div>
      <div><dt className="text-xs tracking-wider">Attendance</dt><dd className="mt-1 text-sm leading-6 text-forest">{status.attending ? "Attending" : "Celebrating from afar"}</dd></div>
      <div><dt className="text-xs tracking-wider">Guests</dt><dd className="mt-1 text-sm leading-6 text-forest">{status.guest_count}</dd></div>
      <div className="sm:col-span-2">
        <dt className="text-xs tracking-wider">Room Status</dt>
        <dd className={`mt-2 flex items-center gap-2 text-sm leading-6 ${confirmed ? "text-forest" : "text-[#746f68]"}`}>
          {confirmed ? <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" /> : <Clock3 className="h-5 w-5 shrink-0" aria-hidden="true" />}
          {confirmed ? "Confirmed" : "Pending Assignment"}
        </dd>
      </div>
      {status.admin_comments ? <div className="min-w-0 sm:col-span-2">
        <dt className="text-xs tracking-wider">Note from the Hosts</dt>
        <dd className="mt-2 whitespace-pre-wrap rounded-sm bg-[#F1EDE5] px-3 py-3 text-sm italic leading-6 text-[#746f68] [overflow-wrap:anywhere]">{status.admin_comments}</dd>
      </div> : null}
    </dl>
  </div>;
}

export function RsvpStatusCard() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<RsvpStatus | null>(null);
  const inFlight = useRef(false);
  const phoneRef = useRef<HTMLInputElement>(null);

  async function checkStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");
    setStatus(null);
    const phone = validatePhone(new FormData(event.currentTarget).get("phone"));
    if (!phone) { setError(PHONE_ERROR); phoneRef.current?.focus(); return; }
    inFlight.current = true;
    setPending(true);
    try {
      const response = await fetch("/api/rsvp/status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }), signal: AbortSignal.timeout(20000), cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.data) throw new Error(result.error || "We couldn’t check your status. Please try again.");
      setStatus(result.data);
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "TimeoutError" && cause.name !== "TypeError" ? cause.message : "We couldn’t connect just now. Please try again in a moment.");
    } finally { inFlight.current = false; setPending(false); }
  }

  return <div className="rsvp-card border border-gold p-6 sm:p-10">
    <h2 id="status-title" className="text-center font-serif text-3xl text-forest sm:text-4xl">Check Your Status</h2>
    <p id="status-phone-note" className="mb-6 mt-3 text-center text-sm leading-6">Enter the phone number you used to RSVP, including your country code.</p>
    <form onSubmit={checkStatus} aria-busy={pending}>
      <fieldset disabled={pending}>
        <label htmlFor="status-phone" className="mb-2 block text-sm">Phone Number <span className="sr-only">(required)</span></label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input ref={phoneRef} id="status-phone" name="phone" type="tel" required maxLength={64} autoComplete="tel" placeholder="e.g. +49 151 23456789" aria-describedby="status-phone-note" onChange={() => { setError(""); setStatus(null); }} onInvalid={(event) => { event.preventDefault(); setError(PHONE_ERROR); event.currentTarget.focus(); }} className="form-control min-w-0 sm:flex-1" />
          <button type="submit" className="flex min-h-12 shrink-0 items-center justify-center gap-2 bg-crimson px-6 py-3 font-serif text-lg text-white transition-colors hover:bg-[#662020] disabled:opacity-70" disabled={pending}>
            {pending ? <>Checking <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /></> : "Check Status"}
          </button>
        </div>
      </fieldset>
    </form>
    {error ? <p role="alert" className="mt-4 rounded-sm bg-crimson/5 px-4 py-3 text-sm leading-6 text-crimson">{error}</p> : null}
    <div role="status" aria-live="polite" aria-atomic="true">
      {pending ? <p className="sr-only">Checking your RSVP status.</p> : null}
      {status ? <RsvpStatusSummary status={status} /> : null}
    </div>
  </div>;
}
