-- =============================================================================
-- 4. fázis eleje – a barber heti munkaidejének mentése egyben (atomikusan)
-- A teljes hetet egyszerre cseréli: vagy minden sáv elmentődik, vagy semmi.
-- p_slots: [{ "weekday": 1, "start": "09:00", "end": "13:00" }, …]  (0 = vasárnap)
-- =============================================================================
create function public.set_my_working_hours(p_slots jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_barber_id uuid := private.my_barber_id();
begin
  if v_barber_id is null then
    raise exception 'Csak barber állíthat be munkaidőt.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_slots) <> 'array' then
    raise exception 'Érvénytelen munkaidő.' using errcode = '22023';
  end if;

  delete from public.working_hours where barber_id = v_barber_id;

  begin
    insert into public.working_hours (barber_id, weekday, start_time, end_time)
    select v_barber_id,
           (s ->> 'weekday')::smallint,
           (s ->> 'start')::time,
           (s ->> 'end')::time
      from jsonb_array_elements(p_slots) s;
  exception
    when exclusion_violation then
      raise exception 'Egy napon belül a sávok nem fedhetik egymást.' using errcode = '22023';
    when check_violation then
      raise exception 'A sáv vége legyen később, mint az eleje.' using errcode = '22023';
    when invalid_datetime_format or invalid_text_representation or datetime_field_overflow then
      raise exception 'Érvénytelen időpont a munkaidőben.' using errcode = '22023';
  end;
end;
$$;

revoke execute on function public.set_my_working_hours(jsonb) from public, anon;
grant execute on function public.set_my_working_hours(jsonb) to authenticated;
