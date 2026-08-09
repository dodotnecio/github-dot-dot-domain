
-- ============== ROLES ==============
create type public.app_role as enum ('admin', 'member');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
-- Only one admin allowed total
create unique index only_one_admin on public.user_roles ((role)) where role = 'admin';

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users see their own roles" on public.user_roles for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- ============== PROFILES ==============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  fullname text not null,
  email text not null,
  birthday date,
  reg_code_used text,
  registered_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "own profile select" on public.profiles for select to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated
  with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = id or public.has_role(auth.uid(), 'admin'));

-- ============== REGISTRATION CODES ==============
create table public.registration_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  amount numeric not null,
  used boolean not null default false,
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.registration_codes to authenticated;
grant all on public.registration_codes to service_role;
alter table public.registration_codes enable row level security;

create policy "admin manages reg codes" on public.registration_codes for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============== CONTRIBUTION CODES ==============
create table public.contribution_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type text not null check (type in ('birthday','medical','calamity','maternity')),
  amount numeric not null,
  used boolean not null default false,
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.contribution_codes to authenticated;
grant all on public.contribution_codes to service_role;
alter table public.contribution_codes enable row level security;

create policy "admin manages contrib codes" on public.contribution_codes for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============== CONTRIBUTIONS ==============
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  code_id uuid references public.contribution_codes(id),
  type text not null check (type in ('birthday','medical','calamity','maternity')),
  amount numeric not null,
  month int,
  year int,
  created_at timestamptz not null default now()
);
grant select, insert on public.contributions to authenticated;
grant all on public.contributions to service_role;
alter table public.contributions enable row level security;

create policy "own contribs select" on public.contributions for select to authenticated
  using (auth.uid() = member_id or public.has_role(auth.uid(), 'admin'));
create policy "own contribs insert" on public.contributions for insert to authenticated
  with check (auth.uid() = member_id);

-- ============== ASSISTANCE RECIPIENTS ==============
create table public.assistance_recipients (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('birthday','medical','calamity','maternity')),
  name text,
  month int,
  year int,
  created_at timestamptz not null default now()
);
grant select on public.assistance_recipients to anon, authenticated;
grant insert, update, delete on public.assistance_recipients to authenticated;
grant all on public.assistance_recipients to service_role;
alter table public.assistance_recipients enable row level security;

create policy "public read recipients" on public.assistance_recipients for select to anon, authenticated using (true);
create policy "admin manage recipients" on public.assistance_recipients for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============== PAGE IMAGES ==============
create table public.page_images (
  id uuid primary key default gen_random_uuid(),
  type text unique not null check (type in ('birthday','medical','calamity','maternity')),
  url text not null,
  updated_at timestamptz not null default now()
);
grant select on public.page_images to anon, authenticated;
grant insert, update, delete on public.page_images to authenticated;
grant all on public.page_images to service_role;
alter table public.page_images enable row level security;

create policy "public read images" on public.page_images for select to anon, authenticated using (true);
create policy "admin manage images" on public.page_images for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============== PUBLIC HELPER FUNCTIONS (security definer) ==============

create or replace function public.get_member_count()
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from public.user_roles where role = 'member'
$$;
grant execute on function public.get_member_count() to anon, authenticated;

create or replace function public.get_fund_summary(_type text)
returns table(total numeric, recipients int)
language sql stable security definer set search_path = public as $$
  select
    coalesce((select sum(amount) from public.contributions where type = _type), 0)::numeric as total,
    coalesce((select count(*) from public.assistance_recipients where type = _type), 0)::int as recipients
$$;
grant execute on function public.get_fund_summary(text) to anon, authenticated;

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where role = 'admin')
$$;
grant execute on function public.admin_exists() to anon, authenticated;

-- Validate a registration code without revealing other code data (anon callable)
create or replace function public.validate_registration_code(_code text)
returns numeric language sql stable security definer set search_path = public as $$
  select amount from public.registration_codes where code = _code and used = false
$$;
grant execute on function public.validate_registration_code(text) to anon, authenticated;

-- Atomic member registration: validate code, create profile, grant role, mark code used
create or replace function public.complete_member_registration(
  _fullname text, _email text, _birthday date, _code text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_code_id uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select id into v_code_id from public.registration_codes
    where code = _code and used = false for update;
  if v_code_id is null then raise exception 'Invalid or already used registration code'; end if;

  insert into public.profiles (id, fullname, email, birthday, reg_code_used)
    values (v_uid, _fullname, _email, _birthday, _code);

  insert into public.user_roles (user_id, role) values (v_uid, 'member');

  update public.registration_codes
    set used = true, used_by = v_uid, used_at = now()
    where id = v_code_id;
end $$;
grant execute on function public.complete_member_registration(text, text, date, text) to authenticated;

-- Atomic admin registration: only allowed if no admin exists
create or replace function public.complete_admin_registration(_fullname text, _email text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if exists(select 1 from public.user_roles where role = 'admin') then
    raise exception 'An admin already exists';
  end if;
  insert into public.profiles (id, fullname, email) values (v_uid, _fullname, _email);
  insert into public.user_roles (user_id, role) values (v_uid, 'admin');
end $$;
grant execute on function public.complete_admin_registration(text, text) to authenticated;

-- Redeem a contribution code: validate, mark used, insert contribution
create or replace function public.redeem_contribution_code(_code text)
returns table(type text, amount numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid; v_type text; v_amount numeric;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select id, type, amount into v_id, v_type, v_amount
    from public.contribution_codes
    where code = _code and used = false for update;
  if v_id is null then raise exception 'Invalid or already used code'; end if;

  update public.contribution_codes
    set used = true, used_by = v_uid, used_at = now() where id = v_id;

  insert into public.contributions (member_id, code_id, type, amount, month, year)
    values (v_uid, v_id, v_type, v_amount,
            extract(month from now())::int, extract(year from now())::int);

  return query select v_type, v_amount;
end $$;
grant execute on function public.redeem_contribution_code(text) to authenticated;

-- ============== REALTIME ==============
alter publication supabase_realtime add table public.user_roles;
alter publication supabase_realtime add table public.contributions;
alter publication supabase_realtime add table public.page_images;
