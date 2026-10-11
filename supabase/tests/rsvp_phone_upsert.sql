-- Run in the Supabase SQL editor after the phone migration. All test data rolls
-- back. This is a real PostgreSQL constraint/upsert test, not an HTTP fixture.
begin;
set local role service_role;

do $test$
declare
  first_id text;
  second_id text;
  test_phone text;
  row_count integer;
begin
  -- Randomized reserved +999 test identifier; avoid touching a guest's RSVP.
  loop
    test_phone := '+999' || lpad(floor(random() * 100000000000)::bigint::text, 11, '0');
    exit when not exists (select 1 from public.rsvps where phone = test_phone);
  end loop;

  insert into public.rsvps (names, phone, attending, guest_count, message)
    values ('Phone upsert verification', test_phone, true, 2, 'First response')
    on conflict (phone) do update set names = excluded.names,
      attending = excluded.attending, guest_count = excluded.guest_count,
      message = excluded.message
    returning id::text into first_id;

  update public.rsvps set admin_comments = 'Administrator room notes',
    room_confirmed = true where phone = test_phone;

  insert into public.rsvps (names, phone, attending, guest_count, message)
    values ('Updated phone upsert verification', test_phone, false, 0, 'Updated response')
    on conflict (phone) do update set names = excluded.names,
      attending = excluded.attending, guest_count = excluded.guest_count,
      message = excluded.message
    returning id::text into second_id;

  select count(*) into row_count from public.rsvps where phone = test_phone;
  if first_id is distinct from second_id or row_count <> 1 then
    raise exception 'Same phone did not update the original single row';
  end if;
  if not exists (
    select 1 from public.rsvps where phone = test_phone
      and names = 'Updated phone upsert verification'
      and not attending and guest_count = 0 and message = 'Updated response'
      and admin_comments = 'Administrator room notes' and room_confirmed = true
  ) then
    raise exception 'Updated RSVP values were not persisted or admin fields were overwritten';
  end if;

  begin
    insert into public.rsvps (names, phone, attending, guest_count, message)
      values ('Invalid phone verification', '4915123456789', false, 0, '');
    raise exception 'Database accepted a phone without +';
  exception when check_violation or not_null_violation then null;
  end;

  begin
    insert into public.rsvps (names, attending, guest_count, message)
      values ('Missing phone verification', false, 0, '');
    raise exception 'Database accepted a missing phone';
  exception when check_violation or not_null_violation then null;
  end;

  raise notice 'PASS: same-phone upsert preserves one row and its ID, updates all RSVP values, and rejects missing/invalid phones';
end;
$test$;

rollback;
