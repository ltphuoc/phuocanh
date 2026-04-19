create or replace function public.has_any_couple()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couples
  );
$$;

revoke all on function public.has_any_couple() from public;
grant execute on function public.has_any_couple() to authenticated;
