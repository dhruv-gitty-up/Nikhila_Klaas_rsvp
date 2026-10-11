-- Apply this file in the wedding project's SQL editor if public.rsvps already
-- exists with names, attending (boolean), guest_count, and message columns.
-- This grants guest insert access and keeps anonymous replies private.
begin;

alter table public.rsvps enable row level security;
grant usage on schema public to anon;
revoke all on public.rsvps from anon;
grant insert (names, attending, guest_count, message) on public.rsvps to anon;

-- Support either UUID IDs or an existing serial/identity-generated ID.
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
      execute format('grant usage on sequence %s to anon', sequence_name);
    end if;
  end loop;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'rsvps'
      and policyname = 'wedding_guests_can_submit_rsvp'
  ) then
    execute $policy$
      create policy wedding_guests_can_submit_rsvp
      on public.rsvps for insert to anon
      with check (
        char_length(btrim(names)) between 1 and 160
        and char_length(coalesce(message, '')) <= 2000
        and ((attending and guest_count between 1 and 4)
          or (not attending and guest_count = 0))
      )
    $policy$;
  end if;
end;
$body$;

commit;
