CREATE OR REPLACE FUNCTION public.redeem_contribution_code(_code text)
 RETURNS TABLE(type text, amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_id uuid; v_type text; v_amount numeric;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select cc.id, cc.type, cc.amount into v_id, v_type, v_amount
    from public.contribution_codes cc
    where cc.code = _code and cc.used = false for update;
  if v_id is null then raise exception 'Invalid or already used code'; end if;

  update public.contribution_codes
    set used = true, used_by = v_uid, used_at = now() where id = v_id;

  insert into public.contributions (member_id, code_id, type, amount, month, year)
    values (v_uid, v_id, v_type, v_amount,
            extract(month from now())::int, extract(year from now())::int);

  return query select v_type, v_amount;
end $function$;
