-- Extension enterprise: empresas, sucursales y asignacion organizacional de usuarios.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  legal_id text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, name)
);

create unique index if not exists uq_branches_company_code
  on public.branches(company_id, code)
  where code is not null;

alter table public.users
  add column if not exists company_id uuid references public.companies(id),
  add column if not exists branch_id uuid references public.branches(id);

create index if not exists idx_users_company on public.users(company_id);
create index if not exists idx_users_branch on public.users(branch_id);
create index if not exists idx_branches_company on public.branches(company_id);

do $trigger$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_companies_updated_at'
  ) then
    create trigger trg_companies_updated_at before update on public.companies
    for each row execute function public.set_updated_at();
  end if;
end
$trigger$;

do $trigger$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_branches_updated_at'
  ) then
    create trigger trg_branches_updated_at before update on public.branches
    for each row execute function public.set_updated_at();
  end if;
end
$trigger$;

insert into public.companies (name, legal_id, active)
values ('Empresa Demo', '900000000-0', true)
on conflict (legal_id) do nothing;

insert into public.branches (company_id, name, code, address, active)
select c.id, 'Sucursal Principal', 'MAIN', 'Sin direccion', true
from public.companies c
where c.legal_id = '900000000-0'
on conflict (company_id, name) do nothing;

update public.users u
set
  company_id = c.id,
  branch_id = b.id
from public.companies c
left join public.branches b on b.company_id = c.id and b.code = 'MAIN'
where c.legal_id = '900000000-0'
  and (u.company_id is null or u.branch_id is null);
