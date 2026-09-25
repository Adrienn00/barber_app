-- =============================================================================
-- Tesztadatok a helyi fejlesztéshez (supabase db reset futtatja). ÉLESBE NEM KERÜL.
-- Minden fiók jelszava: Jelszo123!
--
--   admin@barber.test   platform admin
--   peti@barber.test    Kovács Péter – jóváhagyott barber (kovacs-peter), 5 perc puffer
--   laci@barber.test    Nagy László  – jóváhagyott barber (nagy-laci)
--   zoli@barber.test    Szabó Zoltán – függő barberjelentkezés (szabo-zoli)
--   anna@vendeg.test    Tóth Anna    – vendég, mindkét barbernél foglalt
--   bela@vendeg.test    Fekete Béla  – vendég, csak Lacinál foglalt
-- =============================================================================

-- Felhasználók (a profilt a handle_new_user trigger hozza létre)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('Jelszo123!', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.full_name), now(), now(),
  '', '', '', ''
from (values
  ('10000000-0000-0000-0000-000000000001'::uuid, 'admin@barber.test', 'Platform Admin'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'peti@barber.test',  'Kovács Péter'),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'laci@barber.test',  'Nagy László'),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'zoli@barber.test',  'Szabó Zoltán'),
  ('10000000-0000-0000-0000-000000000005'::uuid, 'anna@vendeg.test',  'Tóth Anna'),
  ('10000000-0000-0000-0000-000000000006'::uuid, 'bela@vendeg.test',  'Fekete Béla')
) as u (id, email, full_name);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u;

update public.profiles set is_admin = true where id = '10000000-0000-0000-0000-000000000001';

update public.profiles p set phone = v.phone, terms_accepted_at = now()
from (values
  ('10000000-0000-0000-0000-000000000002'::uuid, '+40 740 111 222'),
  ('10000000-0000-0000-0000-000000000003'::uuid, '+40 740 333 444'),
  ('10000000-0000-0000-0000-000000000004'::uuid, '+40 740 555 666'),
  ('10000000-0000-0000-0000-000000000005'::uuid, '+40 745 123 456'),
  ('10000000-0000-0000-0000-000000000006'::uuid, '+40 745 654 321')
) as v (id, phone)
where p.id = v.id;

-- Barberek (a barber_settings sort a trigger hozza létre)
insert into public.barbers (id, user_id, slug, display_name, bio, city, address, phone, instagram, status, approved_at)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'kovacs-peter', 'Peti Barber',
   'Klasszikus és modern hajvágások, szakállformázás.', 'Kolozsvár', 'Főtér 12.', '+40 740 111 222', 'peti.barber',
   'approved', now()),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'nagy-laci', 'Laci Borbély',
   'Borotválás régi módon.', 'Marosvásárhely', 'Rózsák tere 5.', '+40 740 333 444', null,
   'approved', now()),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', 'szabo-zoli', 'Zoli Cuts',
   'Most indulok!', 'Csíkszereda', 'Szabadság tér 1.', '+40 740 555 666', null,
   'pending', null);

update public.barber_settings set buffer_min = 5 where barber_id = '20000000-0000-0000-0000-000000000001';

-- Szolgáltatások
insert into public.services (id, barber_id, name, duration_min, price, sort_order, is_active) values
  ('30000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000001', 'Hajvágás', 30, 60, 1, true),
  ('30000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000001', 'Hajvágás + szakáll', 45, 90, 2, true),
  ('30000000-0000-0000-0000-000000000103', '20000000-0000-0000-0000-000000000001', 'Gyerek hajvágás', 20, 40, 3, true),
  ('30000000-0000-0000-0000-000000000104', '20000000-0000-0000-0000-000000000001', 'Hajfestés (szünetel)', 60, 120, 4, false),
  ('30000000-0000-0000-0000-000000000201', '20000000-0000-0000-0000-000000000002', 'Hajvágás', 40, 70, 1, true),
  ('30000000-0000-0000-0000-000000000202', '20000000-0000-0000-0000-000000000002', 'Borotválás', 30, 50, 2, true),
  ('30000000-0000-0000-0000-000000000301', '20000000-0000-0000-0000-000000000003', 'Hajvágás', 30, 50, 1, true);

-- Munkaidő (0 = vasárnap). Peti: H–P 9–13 és 14–18 (ebédszünet), Szo 9–14. Laci: K–Szo 10–19.
insert into public.working_hours (barber_id, weekday, start_time, end_time)
select '20000000-0000-0000-0000-000000000001'::uuid, d, t.s, t.e
from generate_series(1, 5) d, (values ('09:00'::time, '13:00'::time), ('14:00', '18:00')) t (s, e)
union all
select '20000000-0000-0000-0000-000000000001', 6, '09:00', '14:00'
union all
select '20000000-0000-0000-0000-000000000002', d, '10:00', '19:00'
from generate_series(2, 6) d;

-- Foglalások és magánprogramok a következő hétre (helyi idő szerint)
do $$
declare
  mon date := date_trunc('week', (now() at time zone 'Europe/Bucharest'))::date + 7;  -- jövő hétfő
  peti uuid := '20000000-0000-0000-0000-000000000001';
  laci uuid := '20000000-0000-0000-0000-000000000002';
  anna uuid := '10000000-0000-0000-0000-000000000005';
  bela uuid := '10000000-0000-0000-0000-000000000006';
begin
  -- Peti: Anna hétfő 10:00 (megerősített), kézi vendég hétfő 11:00, Anna kedd 15:00 (függő)
  insert into public.bookings (barber_id, customer_id, guest_name, guest_phone, service_id, starts_at, ends_at, block_end, status, expires_at, decided_at)
  values
    (peti, anna, null, null, '30000000-0000-0000-0000-000000000101',
     (mon + time '10:00') at time zone 'Europe/Bucharest',
     (mon + time '10:30') at time zone 'Europe/Bucharest',
     (mon + time '10:35') at time zone 'Europe/Bucharest', 'confirmed', null, now()),
    (peti, null, 'Kiss János', '+40 755 000 111', '30000000-0000-0000-0000-000000000102',
     (mon + time '11:00') at time zone 'Europe/Bucharest',
     (mon + time '11:45') at time zone 'Europe/Bucharest',
     (mon + time '11:50') at time zone 'Europe/Bucharest', 'confirmed', null, now()),
    (peti, anna, null, null, '30000000-0000-0000-0000-000000000103',
     ((mon + 1) + time '15:00') at time zone 'Europe/Bucharest',
     ((mon + 1) + time '15:20') at time zone 'Europe/Bucharest',
     ((mon + 1) + time '15:25') at time zone 'Europe/Bucharest', 'pending', now() + interval '2 hours', null);

  -- Laci: Béla kedd 12:00 (megerősített), Anna szerda 16:00 (megerősített)
  insert into public.bookings (barber_id, customer_id, service_id, starts_at, ends_at, block_end, status, decided_at)
  values
    (laci, bela, '30000000-0000-0000-0000-000000000201',
     ((mon + 1) + time '12:00') at time zone 'Europe/Bucharest',
     ((mon + 1) + time '12:40') at time zone 'Europe/Bucharest',
     ((mon + 1) + time '12:40') at time zone 'Europe/Bucharest', 'confirmed', now()),
    (laci, anna, '30000000-0000-0000-0000-000000000202',
     ((mon + 2) + time '16:00') at time zone 'Europe/Bucharest',
     ((mon + 2) + time '16:30') at time zone 'Europe/Bucharest',
     ((mon + 2) + time '16:30') at time zone 'Europe/Bucharest', 'confirmed', now());

  -- Magánprogramok
  insert into public.private_events (barber_id, title, note, starts_at, ends_at, all_day, repeat, repeat_until)
  values
    (peti, 'Fogorvos', 'Dr. Szilágyi, 2. emelet',
     ((mon + 2) + time '12:00') at time zone 'Europe/Bucharest',
     ((mon + 2) + time '13:00') at time zone 'Europe/Bucharest', false, 'none', null),
    (peti, 'Edzés', null,
     ((mon + 3) + time '17:00') at time zone 'Europe/Bucharest',
     ((mon + 3) + time '18:00') at time zone 'Europe/Bucharest', false, 'weekly', mon + 60),
    (laci, 'Szabadnap', 'Családi program',
     ((mon + 4) + time '00:00') at time zone 'Europe/Bucharest',
     ((mon + 5) + time '00:00') at time zone 'Europe/Bucharest', true, 'none', null);
end;
$$;
