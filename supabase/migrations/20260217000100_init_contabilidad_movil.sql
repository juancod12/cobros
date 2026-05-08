-- Contabilidad móvil - esquema inicial para Supabase/PostgreSQL
-- Incluye: RBAC, clientes, préstamos/cobros, caja/gastos, notificaciones, reportes y auditoría.

create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- =====================================================
-- Enums
-- =====================================================
create type public.user_status as enum ('ACTIVE', 'INACTIVE', 'SUSPENDED');
create type public.loan_status as enum ('ACTIVE', 'PAID', 'IN_ARREARS', 'IN_COLLECTION', 'WRITEOFF');
create type public.installment_status as enum ('PENDING', 'PAID', 'LATE', 'SKIPPED');
create type public.cash_session_status as enum ('OPEN', 'CLOSED', 'AUTO_CLOSED');
create type public.cash_movement_type as enum ('IN', 'OUT', 'ADJUST');
create type public.payment_method as enum ('CASH', 'TRANSFER', 'NEQUI', 'DAVIPLATA', 'OTHER');
create type public.notification_status as enum ('PENDING', 'SENT', 'FAILED', 'READ');
create type public.notification_channel as enum ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'IN_APP');
create type public.client_traffic_light as enum ('AL_DIA', 'EN_RIESGO', 'MOROSO', 'CASTIGO');

-- =====================================================
-- Helpers
-- =====================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Normaliza el inicio de "día de cobro" a las 08:00.
-- Si el evento ocurre antes de 08:00, pertenece al día hábil anterior.
create or replace function public.business_day(p_ts timestamptz)
returns date
language sql
immutable
as $$
  select (p_ts - interval '8 hours')::date;
$$;

-- Cuenta días de mora respetando reglas:
-- 1) Domingo no cuenta.
-- 2) Si diferencia <= 2 horas frente al pago previo, no suma día.
create or replace function public.calculate_arrears_days(
  p_previous_payment_at timestamptz,
  p_reference_at timestamptz,
  p_grace_hours int default 2
)
returns int
language plpgsql
as $$
declare
  start_day date;
  end_day date;
  d date;
  days_count int := 0;
  delta interval;
begin
  if p_previous_payment_at is null then
    return 0;
  end if;

  if p_reference_at <= p_previous_payment_at then
    return 0;
  end if;

  delta := p_reference_at - p_previous_payment_at;
  if delta <= make_interval(hours => p_grace_hours) then
    return 0;
  end if;

  start_day := public.business_day(p_previous_payment_at) + 1;
  end_day := public.business_day(p_reference_at);

  if end_day < start_day then
    return 0;
  end if;

  d := start_day;
  while d <= end_day loop
    -- ISO day: 1=lunes ... 7=domingo
    if extract(isodow from d) <> 7 then
      days_count := days_count + 1;
    end if;
    d := d + 1;
  end loop;

  return greatest(days_count, 0);
end;
$$;

-- =====================================================
-- Catálogos y parámetros
-- =====================================================
create table public.system_settings (
  id boolean primary key default true,
  business_timezone text not null default 'America/Bogota',
  workday_start time not null default '08:00:00',
  sunday_counts boolean not null default false,
  grace_hours int not null default 2 check (grace_hours between 0 and 24),
  days_to_writeoff int not null default 45 check (days_to_writeoff > 0),
  auto_close_time time not null default '23:59:00',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.system_settings (id) values (true)
on conflict (id) do nothing;

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (role_id, permission_id)
);

-- Puede mapearse a auth.users(id) de Supabase
create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  full_name text not null,
  email text not null unique,
  cc text not null unique,
  password_hash text,
  status public.user_status not null default 'ACTIVE',
  created_by uuid references public.users(id),
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, role_id)
);

create table public.late_fee_policies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rule_type text not null check (rule_type in ('FIXED', 'PERCENTAGE', 'PER_DAY_FIXED', 'PER_DAY_PERCENTAGE')),
  value numeric(12, 4) not null check (value >= 0),
  grace_hours int not null default 2 check (grace_hours between 0 and 24),
  active boolean not null default true,
  created_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.tariffs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  commission_pct numeric(7, 4) not null default 0 check (commission_pct >= 0),
  rules jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- =====================================================
-- Core #1: clientes, préstamos, cuotas, pagos
-- =====================================================
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  document_number text not null unique,
  phone text,
  address text,
  score int,
  traffic_light public.client_traffic_light not null default 'AL_DIA',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'BLOCKED')),
  assigned_collector_id uuid references public.users(id),
  last_payment_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.client_ratings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  reason text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  collector_id uuid not null references public.users(id),
  tariff_id uuid references public.tariffs(id),
  late_fee_policy_id uuid references public.late_fee_policies(id),
  principal numeric(14, 2) not null check (principal > 0),
  interest_rate numeric(8, 4) not null default 0 check (interest_rate >= 0),
  total_due numeric(14, 2) not null check (total_due > 0),
  term_installments int not null check (term_installments > 0),
  start_date date not null,
  status public.loan_status not null default 'ACTIVE',
  arrears_days int not null default 0 check (arrears_days >= 0),
  moved_to_writeoff_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  installment_number int not null check (installment_number > 0),
  due_date date not null,
  amount_due numeric(14, 2) not null check (amount_due > 0),
  status public.installment_status not null default 'PENDING',
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (loan_id, installment_number)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_payment_uuid uuid not null unique,
  loan_id uuid not null references public.loans(id),
  installment_id uuid references public.installments(id),
  collector_id uuid not null references public.users(id),
  amount numeric(14, 2) not null check (amount > 0),
  paid_at timestamptz not null,
  method public.payment_method not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  evidence_url text,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

-- =====================================================
-- Core #2: caja, turno y gastos
-- =====================================================
create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  collector_id uuid not null references public.users(id),
  opened_at timestamptz not null,
  closed_at timestamptz,
  opening_balance numeric(14, 2) not null check (opening_balance >= 0),
  closing_balance numeric(14, 2),
  status public.cash_session_status not null default 'OPEN',
  auto_closed boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index uq_cash_sessions_one_open_per_collector
  on public.cash_sessions(collector_id)
  where status = 'OPEN';

create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  cash_session_id uuid not null references public.cash_sessions(id) on delete cascade,
  type public.cash_movement_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  concept text not null,
  ref_payment_id uuid references public.payments(id),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.collector_expenses (
  id uuid primary key default gen_random_uuid(),
  cash_session_id uuid not null references public.cash_sessions(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  category text not null,
  description text,
  receipt_url text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

-- =====================================================
-- Transversales
-- =====================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  channel public.notification_channel not null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.notification_status not null default 'PENDING',
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz,
  read_at timestamptz
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.users(id),
  action text not null,
  entity text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- =====================================================
-- Índices
-- =====================================================
create index idx_users_email on public.users(email);
create index idx_users_status on public.users(status);
create index idx_clients_assigned_collector on public.clients(assigned_collector_id);
create index idx_clients_traffic_light on public.clients(traffic_light);
create index idx_loans_collector_status on public.loans(collector_id, status);
create index idx_loans_client on public.loans(client_id);
create index idx_installments_loan_due_date on public.installments(loan_id, due_date);
create index idx_installments_status on public.installments(status);
create index idx_payments_loan_paid_at on public.payments(loan_id, paid_at);
create index idx_payments_collector_paid_at on public.payments(collector_id, paid_at);
create index idx_cash_sessions_collector_status on public.cash_sessions(collector_id, status);
create index idx_cash_movements_session on public.cash_movements(cash_session_id, created_at);
create index idx_expenses_session on public.collector_expenses(cash_session_id, created_at);
create index idx_notifications_user_status on public.notifications(user_id, status, created_at desc);
create index idx_audit_entity_created_at on public.audit_log(entity, created_at desc);

-- =====================================================
-- Triggers updated_at
-- =====================================================
create trigger trg_system_settings_updated_at before update on public.system_settings
for each row execute function public.set_updated_at();
create trigger trg_roles_updated_at before update on public.roles
for each row execute function public.set_updated_at();
create trigger trg_permissions_updated_at before update on public.permissions
for each row execute function public.set_updated_at();
create trigger trg_users_updated_at before update on public.users
for each row execute function public.set_updated_at();
create trigger trg_late_fee_policies_updated_at before update on public.late_fee_policies
for each row execute function public.set_updated_at();
create trigger trg_tariffs_updated_at before update on public.tariffs
for each row execute function public.set_updated_at();
create trigger trg_clients_updated_at before update on public.clients
for each row execute function public.set_updated_at();
create trigger trg_loans_updated_at before update on public.loans
for each row execute function public.set_updated_at();
create trigger trg_installments_updated_at before update on public.installments
for each row execute function public.set_updated_at();
create trigger trg_cash_sessions_updated_at before update on public.cash_sessions
for each row execute function public.set_updated_at();

-- =====================================================
-- Funciones de dominio
-- =====================================================
-- Actualiza estado de castigo para préstamos con mora > 45 días (configurable en system_settings).
create or replace function public.mark_loans_as_writeoff()
returns int
language plpgsql
as $$
declare
  v_threshold int;
  v_count int;
begin
  select days_to_writeoff into v_threshold from public.system_settings where id = true;

  update public.loans
  set status = 'WRITEOFF',
      moved_to_writeoff_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where status in ('ACTIVE', 'IN_ARREARS', 'IN_COLLECTION')
    and arrears_days > v_threshold;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Cierre automático de cajas abiertas a las 23:59.
create or replace function public.auto_close_cash_sessions()
returns int
language plpgsql
as $$
declare
  v_count int;
begin
  update public.cash_sessions cs
  set status = 'AUTO_CLOSED',
      closed_at = timezone('utc', now()),
      auto_closed = true,
      closing_balance = coalesce(closing_balance, opening_balance),
      updated_at = timezone('utc', now())
  where status = 'OPEN';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Job diario 23:59 (timezone definida en DB/project).
do $job$
begin
  if not exists (
    select 1 from cron.job where jobname = 'auto-close-cash-sessions-daily'
  ) then
    perform cron.schedule(
      'auto-close-cash-sessions-daily',
      '59 23 * * *',
      'select public.auto_close_cash_sessions();'
    );
  end if;
end $job$;

-- =====================================================
-- Semillas RBAC mínimas (MVP)
-- =====================================================
insert into public.roles (code, name, description)
values
  ('ADMIN', 'Administrador', 'Control total del sistema'),
  ('AUX', 'Auxiliar', 'Operación administrativa y soporte'),
  ('COLLECTOR', 'Cobrador', 'Gestión de cobros y gastos en calle')
on conflict (code) do nothing;

insert into public.permissions (code, name, description)
values
  ('users.manage', 'Gestionar usuarios', 'Crear/editar/desactivar usuarios'),
  ('roles.manage', 'Gestionar roles', 'Asignación y mantenimiento de RBAC'),
  ('clients.manage', 'Gestionar clientes', 'CRUD y calificación de clientes'),
  ('loans.manage', 'Gestionar préstamos', 'Creación y edición de préstamos'),
  ('payments.create', 'Registrar pagos', 'Registrar pagos de clientes'),
  ('cash.manage', 'Gestionar caja', 'Apertura, movimientos y cierre de caja'),
  ('expenses.manage', 'Gestionar gastos', 'Registro de gastos del cobrador'),
  ('reports.view', 'Ver reportes', 'Consulta y exportación de reportes')
on conflict (code) do nothing;
