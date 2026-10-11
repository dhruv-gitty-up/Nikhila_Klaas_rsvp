"use client";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, ChevronDown, Heart, LoaderCircle } from "lucide-react";
import { Ornament } from "@/components/ornaments";
import { PHONE_ERROR, validatePhone, validateRsvp, type RsvpPayload } from "@/lib/rsvp";

export function RsvpForm() {
  const [attending, setAttending] = useState<boolean | null>(null);
  const [guestCount, setGuestCount] = useState("1");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitted, setSubmitted] = useState<RsvpPayload | null>(null);
  const inFlight = useRef(false);
  const statusRef = useRef<HTMLDivElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const fields = new FormData(event.currentTarget);
    setError("");
    setPhoneError("");
    if (!validatePhone(fields.get("phone"))) {
      setPhoneError(PHONE_ERROR);
      event.currentTarget.querySelector<HTMLInputElement>("#phone")?.focus();
      return;
    }
    const result = validateRsvp({
      names: fields.get("names"), phone: fields.get("phone"), attending,
      guest_count: attending === false ? 0 : Number(fields.get("guest_count")),
      message: fields.get("message") ?? "",
    });
    if (!result.data) { setError(result.error); return; }
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/rsvp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data), signal: AbortSignal.timeout(20000),
      });
      const reply = await response.json();
      if (!response.ok && reply.field === "phone") { setPhoneError(reply.error || PHONE_ERROR); return; }
      if (!response.ok || reply.success !== true) throw new Error(reply.error || "We couldn’t save your RSVP. Please try again.");
      setSubmitted(result.data);
      requestAnimationFrame(() => {
        statusRef.current?.focus({ preventScroll: true });
        statusRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
      });
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "TimeoutError" && cause.name !== "TypeError" ? cause.message : "We couldn’t connect just now. Your details are still here — please try again.");
    } finally { inFlight.current = false; setPending(false); }
  }

  return <div className="rsvp-card border border-gold p-6 sm:p-10">
    {submitted ? <div ref={statusRef} role="status" tabIndex={-1} className="flex min-h-[490px] flex-col items-center justify-center text-center">
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-gold text-forest"><Check size={28} strokeWidth={1.4} aria-hidden="true" /></span>
      <h2 id="rsvp-title" className="w-full font-serif text-3xl text-crimson [overflow-wrap:anywhere] sm:text-4xl">Thank you!</h2>
      <p className="mt-5 max-w-sm text-base leading-7">Your RSVP has been saved. You can use your phone number to update your response later.</p>
      <Heart className="mt-8 text-gold" size={24} strokeWidth={1.25} aria-hidden="true" />
      <p className="mt-4 font-serif text-xl text-crimson">With love, Nikhila &amp; Klaas</p>
    </div> : <>
      <Ornament short />
      <h2 id="rsvp-title" className="mt-4 text-center font-serif text-4xl text-crimson sm:text-[42px]">Kindly RSVP</h2>
      <p className="mb-7 mt-2 text-center text-sm sm:text-base">We would love to celebrate with you.</p>
      <form onSubmit={submit} aria-busy={pending}>
        <fieldset disabled={pending} className="space-y-5">
          <div>
            <label htmlFor="names" className="mb-2 block text-sm">Your Name(s) <span className="sr-only">(required)</span></label>
            <input id="names" name="names" type="text" required maxLength={160} autoComplete="name" placeholder="e.g. Priya & Arjun Sharma" className="form-control" />
          </div>
          <div>
            <label htmlFor="phone" className="mb-2 block text-sm">Phone Number (WhatsApp) <span className="sr-only">(required)</span></label>
            <input id="phone" name="phone" type="tel" required maxLength={64} autoComplete="tel" placeholder="e.g. +49 151 23456789" aria-invalid={phoneError ? true : undefined} aria-describedby={phoneError ? "phone-note phone-error" : "phone-note"} onChange={() => setPhoneError("")} onInvalid={(event) => {
              event.preventDefault();
              setPhoneError(PHONE_ERROR);
              event.currentTarget.focus();
            }} className="form-control" />
            <p id="phone-note" className="mt-2 text-xs leading-5">Please include your country code (e.g., +49, +91)</p>
            {phoneError ? <p id="phone-error" role="alert" className="mt-2 text-sm leading-6 text-crimson">{phoneError}</p> : null}
          </div>
          <fieldset>
            <legend className="mb-2 text-sm">Will you be joining us? <span className="sr-only">(required)</span></legend>
            <div className="grid gap-1 sm:grid-cols-2 sm:gap-4">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input type="radio" name="attending" value="true" required checked={attending === true} onChange={() => setAttending(true)} className="h-5 w-5 shrink-0 accent-crimson" />Wouldn&apos;t miss it!
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input type="radio" name="attending" value="false" required checked={attending === false} onChange={() => setAttending(false)} className="h-5 w-5 shrink-0 accent-crimson" />Celebrating from afar
              </label>
            </div>
          </fieldset>
          <div>
            <label htmlFor="guest_count" className="mb-2 block text-sm">Number of guests</label>
            <div className="relative">
              <select id="guest_count" name="guest_count" value={guestCount} onChange={(event) => setGuestCount(event.target.value)} disabled={attending === false} aria-describedby={attending === false ? "declined-note" : "guest-note"} className="form-control appearance-none pr-10">
                <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4+</option>
              </select>
              <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-4 top-4" />
            </div>
            {attending === false ? <p id="declined-note" className="mt-2 text-xs">No guests will be counted for this reply.</p> : <p id="guest-note" className={guestCount === "4" ? "mt-2 text-xs leading-5" : "sr-only"}>Include yourself. For 4 or more, please share your exact guest count in the message.</p>}
          </div>
          <div>
            <label htmlFor="message" className="mb-2 block text-sm leading-6">Dietary requirements / Message to the couple</label>
            <textarea id="message" name="message" rows={3} maxLength={2000} placeholder="Anything you’d like us to know…" className="form-control min-h-24 resize-y" />
          </div>
          {error ? <p role="alert" className="border-l-2 border-crimson bg-crimson/5 px-4 py-3 text-sm leading-6 text-crimson">{error}</p> : null}
          <button type="submit" disabled={pending} className="flex min-h-12 w-full items-center justify-center gap-3 bg-crimson px-6 py-3 font-serif text-lg tracking-wider text-white transition-colors hover:bg-[#662020] disabled:opacity-70">
            {pending ? <>Sending your RSVP <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /></> : <>Send RSVP <ArrowRight size={20} strokeWidth={1.4} aria-hidden="true" /></>}
          </button>
        </fieldset>
      </form>
    </>}
  </div>;
}
