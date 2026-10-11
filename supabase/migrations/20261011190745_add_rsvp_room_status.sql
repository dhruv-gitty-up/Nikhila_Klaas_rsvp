-- Administrative fields are maintained in the Supabase dashboard. Guest API
-- writes explicitly omit both columns; status responses show the host note.
alter table public.rsvps
  add column if not exists admin_comments text,
  add column if not exists room_confirmed boolean default false;

comment on column public.rsvps.admin_comments is 'Administrator-written host note, displayed to the matching guest.';
comment on column public.rsvps.room_confirmed is 'Room assignment confirmation, editable only by administrators.';

-- Keep the table private. Phone status lookups run through the server API.
alter table public.rsvps enable row level security;
