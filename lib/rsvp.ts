export type RsvpPayload = {
  names: string;
  phone: string;
  attending: boolean;
  guest_count: number;
  message: string;
};

export const PHONE_ERROR = "Please enter a phone number starting with + and your country code, using 7–15 digits and optional spaces only.";

export function validatePhone(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 64 || /[^+0-9 ]/.test(value) || !/^\+[0-9 ]+$/.test(value.trim())) return null;
  const phone = value.trim().replace(/ /g, "");
  return /^\+[1-9][0-9]{6,14}$/.test(phone) ? phone : null;
}

export function validateRsvp(value: unknown):
  | { data: RsvpPayload; error?: never }
  | { data?: never; error: string; field?: "phone" } {
  if (!value || typeof value !== "object") return { error: "Please complete the RSVP form." };
  const input = value as Record<string, unknown>;
  if (typeof input.names !== "string" || !input.names.trim() || input.names.trim().length > 160) {
    return { error: "Please enter your name(s), using at most 160 characters." };
  }
  const phone = validatePhone(input.phone);
  if (!phone) return { error: PHONE_ERROR, field: "phone" };
  if (typeof input.attending !== "boolean") {
    return { error: "Please let us know whether you can join us." };
  }
  if (typeof input.guest_count !== "number" || !Number.isInteger(input.guest_count) ||
    (input.attending ? input.guest_count < 1 || input.guest_count > 4 : input.guest_count !== 0)) {
    return { error: "Please select the number of guests joining us." };
  }
  if (typeof input.message !== "string" || input.message.trim().length > 2000) {
    return { error: "Please keep your message under 2,000 characters." };
  }
  return { data: {
    names: input.names.trim(), phone, attending: input.attending,
    guest_count: input.guest_count, message: input.message.trim(),
  } };
}
