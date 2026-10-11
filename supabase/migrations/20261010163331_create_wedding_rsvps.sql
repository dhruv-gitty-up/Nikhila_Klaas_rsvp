-- For a new wedding project only. This migration has not been applied remotely.
begin;

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  names text not null check (char_length(btrim(names)) between 1 and 160),
  attending boolean not null,
  guest_count smallint not null,
  message text not null default '' check (char_length(message) <= 2000),
  created_at timestamptz not null default now(),
  constraint rsvp_guest_count_matches_attending check (
    (attending and guest_count between 1 and 4)
    or (not attending and guest_count = 0)
  )
);

comment on column public.rsvps.guest_count is '0 for declined; 4 represents 4+ guests. Exact larger counts can be supplied in message.';

alter table public.rsvps enable row level security;
revoke all on public.rsvps from anon, authenticated;
grant insert (names, attending, guest_count, message) on public.rsvps to anon;
grant all on public.rsvps to service_role;

create policy "Guests can submit an RSVP"
  on public.rsvps for insert to anon
  with check (
    char_length(btrim(names)) between 1 and 160
    and char_length(message) <= 2000
    and ((attending and guest_count between 1 and 4) or (not attending and guest_count = 0))
  );

-- No SELECT, UPDATE or DELETE policy: only the hosts can access guest replies.
commit;
