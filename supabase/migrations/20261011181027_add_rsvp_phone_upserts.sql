-- Apply after the existing RSVP migrations. Configure the server-only Supabase
-- key before deploying the new API. No existing replies are deleted or invented.
begin;

alter table public.rsvps add column if not exists phone text;
do $constraints$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.rsvps'::regclass and conname = 'rsvps_phone_format') then
    alter table public.rsvps add constraint rsvps_phone_format check (phone ~ '^\+[1-9][0-9]{6,14}$');
  end if;
  -- Reuse an existing single-column UNIQUE/PRIMARY KEY on phone if present.
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.rsvps'::regclass and contype in ('u', 'p')
      and conkey = array[(select attnum from pg_attribute where attrelid = 'public.rsvps'::regclass and attname = 'phone')]
  ) then
    alter table public.rsvps add constraint rsvps_phone_unique unique (phone);
  end if;
  -- Preserve legacy replies while requiring phone on all future writes.
  if not exists (select 1 from pg_attribute where attrelid = 'public.rsvps'::regclass and attname = 'phone' and attnotnull)
    and not exists (select 1 from pg_constraint where conrelid = 'public.rsvps'::regclass and conname = 'rsvps_phone_required') then
    alter table public.rsvps add constraint rsvps_phone_required check (phone is not null) not valid;
  end if;
end;
$constraints$;
comment on column public.rsvps.phone is 'Unique RSVP identifier: country code prefixed with +, 7–15 digits, no spaces. Historical replies must be backfilled before validating rsvps_phone_required.';

alter table public.rsvps enable row level security;
revoke all on public.rsvps from anon, authenticated;
-- Earlier migrations granted column INSERT privileges; table revocation alone
-- does not remove column grants in PostgreSQL.
revoke insert (names, attending, guest_count, message) on public.rsvps from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update on public.rsvps to service_role;

-- Also support an existing serial/identity ID instead of the UUID schema.
do $body$
declare
  sequence_name text;
begin
  for sequence_name in
    select pg_get_serial_sequence('public.rsvps', attname)
    from pg_attribute
    where attrelid = 'public.rsvps'::regclass
      and attnum > 0 and not attisdropped
  loop
    if sequence_name is not null then
      execute format('grant usage on sequence %s to service_role', sequence_name);
    end if;
  end loop;
end;
$body$;

commit;
