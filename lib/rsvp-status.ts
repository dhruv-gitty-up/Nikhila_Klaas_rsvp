export type RsvpStatus = {
  names: string;
  attending: boolean;
  guest_count: number;
  room_confirmed: boolean | null;
  admin_comments: string | null;
};

export const STATUS_NOT_FOUND = "No RSVP found for this number. Please ensure you included your country code.";
