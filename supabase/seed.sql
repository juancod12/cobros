-- Seed data for local development and manual QA.
-- This file is executed by `supabase db reset` (configured in supabase/config.toml).

begin;

-- -----------------------------------------------------
-- 1) Base RBAC catalog
-- -----------------------------------------------------
insert into public.roles (code, name, description)
values
  ('ADMIN', 'Administrador', 'Control total del sistema'),
  ('AUX', 'Auxiliar', 'Operacion administrativa y soporte'),
  ('COLLECTOR', 'Cobrador', 'Gestion de cobros y gastos en calle')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = timezone('utc', now());

insert into public.permissions (code, name, description)
values
  ('users.manage', 'Gestionar usuarios', 'Crear, editar y desactivar usuarios'),
  ('roles.manage', 'Gestionar roles', 'Asignacion y mantenimiento de RBAC'),
  ('clients.manage', 'Gestionar clientes', 'CRUD y calificacion de clientes'),
  ('loans.manage', 'Gestionar prestamos', 'Creacion y edicion de prestamos'),
  ('payments.create', 'Registrar pagos', 'Registrar pagos de clientes'),
  ('cash.manage', 'Gestionar caja', 'Apertura, movimientos y cierre de caja'),
  ('expenses.manage', 'Gestionar gastos', 'Registro de gastos del cobrador'),
  ('reports.view', 'Ver reportes', 'Consulta y exportacion de reportes')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = timezone('utc', now());

with role_permission_matrix as (
  select
    r.id as role_id,
    p.id as permission_id
  from public.roles r
  join public.permissions p
    on (
      r.code = 'ADMIN'
      or (
        r.code = 'AUX'
        and p.code in (
          'clients.manage',
          'loans.manage',
          'payments.create',
          'cash.manage',
          'expenses.manage',
          'reports.view'
        )
      )
      or (
        r.code = 'COLLECTOR'
        and p.code in (
          'clients.manage',
          'loans.manage',
          'payments.create',
          'cash.manage',
          'expenses.manage'
        )
      )
    )
)
insert into public.role_permissions (role_id, permission_id)
select role_id, permission_id
from role_permission_matrix
on conflict (role_id, permission_id) do nothing;

-- -----------------------------------------------------
-- 2) Usuarios demo (auth.users + public.users)
-- -----------------------------------------------------
create temporary table tmp_seed_users (
  app_user_id uuid primary key,
  preferred_auth_user_id uuid not null,
  preferred_identity_id uuid not null,
  email text not null unique,
  password_plain text not null,
  full_name text not null,
  cc text not null,
  role_code text not null,
  app_status public.user_status not null,
  created_by uuid,
  resolved_auth_user_id uuid
) on commit drop;

insert into tmp_seed_users (
  app_user_id,
  preferred_auth_user_id,
  preferred_identity_id,
  email,
  password_plain,
  full_name,
  cc,
  role_code,
  app_status,
  created_by
)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '21000000-0000-0000-0000-000000000001',
    'admin@demo.local',
    'Admin123*',
    'Admin Demo',
    '1000000001',
    'ADMIN',
    'ACTIVE',
    null
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '21000000-0000-0000-0000-000000000002',
    'aux@demo.local',
    'Aux12345*',
    'Auxiliar Demo',
    '1000000002',
    'AUX',
    'ACTIVE',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    '21000000-0000-0000-0000-000000000003',
    'cobrador@demo.local',
    'Collector123*',
    'Cobrador Demo',
    '1000000003',
    'COLLECTOR',
    'ACTIVE',
    '10000000-0000-0000-0000-000000000001'
  );

do $$
declare
  v_seed_user tmp_seed_users%rowtype;
  v_auth_user_id uuid;
  v_identity_id uuid;
begin
  for v_seed_user in select * from tmp_seed_users order by app_user_id loop
    v_auth_user_id := v_seed_user.preferred_auth_user_id;

    if to_regclass('auth.users') is not null then
      select u.id
      into v_auth_user_id
      from auth.users u
      where lower(u.email) = lower(v_seed_user.email)
      order by u.created_at asc nulls last
      limit 1;

      if v_auth_user_id is null then
        v_auth_user_id := v_seed_user.preferred_auth_user_id;
      end if;

      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmed_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at
      )
      values (
        '00000000-0000-0000-0000-000000000000',
        v_auth_user_id,
        'authenticated',
        'authenticated',
        lower(v_seed_user.email),
        crypt(v_seed_user.password_plain, gen_salt('bf')),
        timezone('utc', now()),
        timezone('utc', now()),
        timezone('utc', now()),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
          'full_name', v_seed_user.full_name,
          'role', v_seed_user.role_code,
          'status', 'active'
        ),
        false,
        timezone('utc', now()),
        timezone('utc', now())
      )
      on conflict (id) do update
      set
        email = excluded.email,
        encrypted_password = excluded.encrypted_password,
        email_confirmed_at = excluded.email_confirmed_at,
        confirmed_at = excluded.confirmed_at,
        last_sign_in_at = excluded.last_sign_in_at,
        raw_app_meta_data = excluded.raw_app_meta_data,
        raw_user_meta_data = excluded.raw_user_meta_data,
        updated_at = timezone('utc', now());

      if to_regclass('auth.identities') is not null then
        select i.id
        into v_identity_id
        from auth.identities i
        where i.provider = 'email'
          and lower(i.provider_id) = lower(v_seed_user.email)
        order by i.created_at asc nulls last
        limit 1;

        if v_identity_id is null then
          v_identity_id := v_seed_user.preferred_identity_id;
        end if;

        insert into auth.identities (
          id,
          user_id,
          identity_data,
          provider,
          provider_id,
          last_sign_in_at,
          created_at,
          updated_at
        )
        values (
          v_identity_id,
          v_auth_user_id,
          jsonb_build_object(
            'sub', v_auth_user_id::text,
            'email', lower(v_seed_user.email)
          ),
          'email',
          lower(v_seed_user.email),
          timezone('utc', now()),
          timezone('utc', now()),
          timezone('utc', now())
        )
        on conflict (id) do update
        set
          user_id = excluded.user_id,
          provider = excluded.provider,
          provider_id = excluded.provider_id,
          identity_data = excluded.identity_data,
          last_sign_in_at = excluded.last_sign_in_at,
          updated_at = excluded.updated_at;
      end if;
    end if;

    update tmp_seed_users
    set resolved_auth_user_id = coalesce(v_auth_user_id, preferred_auth_user_id)
    where app_user_id = v_seed_user.app_user_id;
  end loop;
exception
  when others then
    raise exception 'Fallo al sincronizar usuarios auth/public en seed: %', sqlerrm;
end
$$;

insert into public.users (
  id,
  auth_user_id,
  full_name,
  email,
  cc,
  password_hash,
  status,
  created_by,
  last_login_at
)
select
  s.app_user_id,
  s.resolved_auth_user_id,
  s.full_name,
  lower(s.email),
  s.cc,
  crypt(s.password_plain, gen_salt('bf')),
  s.app_status,
  s.created_by,
  timezone('utc', now())
from tmp_seed_users s
on conflict (id) do update
set
  auth_user_id = excluded.auth_user_id,
  full_name = excluded.full_name,
  email = excluded.email,
  cc = excluded.cc,
  password_hash = excluded.password_hash,
  status = excluded.status,
  created_by = excluded.created_by,
  last_login_at = excluded.last_login_at,
  updated_at = timezone('utc', now());

do $$
begin
  if to_regclass('auth.users') is not null then
    update public.users pu
    set
      auth_user_id = au.id,
      updated_at = timezone('utc', now())
    from auth.users au
    where lower(pu.email) = lower(au.email)
      and pu.id in (select app_user_id from tmp_seed_users);
  end if;
end
$$;

insert into public.user_roles (user_id, role_id)
select s.app_user_id, r.id
from tmp_seed_users s
join public.roles r on r.code = s.role_code
on conflict (user_id, role_id) do nothing;

update public.system_settings
set
  business_timezone = 'America/Bogota',
  workday_start = '08:00:00',
  sunday_counts = false,
  grace_hours = 2,
  days_to_writeoff = 45,
  auto_close_time = '23:59:00',
  updated_at = timezone('utc', now())
where id = true;

-- -----------------------------------------------------
-- 4) Master data and collections data
-- -----------------------------------------------------
insert into public.tariffs (id, name, commission_pct, rules, active)
values
  (
    '30000000-0000-0000-0000-000000000001',
    'Tarifa Estandar Diario',
    5.0000,
    '{"frequency":"daily","notes":"tarifa seed"}',
    true
  )
on conflict (id) do update
set
  name = excluded.name,
  commission_pct = excluded.commission_pct,
  rules = excluded.rules,
  active = excluded.active,
  updated_at = timezone('utc', now());

insert into public.late_fee_policies (
  id,
  name,
  rule_type,
  value,
  grace_hours,
  active,
  created_by
)
values
  (
    '30000000-0000-0000-0000-000000000002',
    'Mora diaria 1.5%',
    'PER_DAY_PERCENTAGE',
    1.5000,
    2,
    true,
    '10000000-0000-0000-0000-000000000001'
  )
on conflict (id) do update
set
  name = excluded.name,
  rule_type = excluded.rule_type,
  value = excluded.value,
  grace_hours = excluded.grace_hours,
  active = excluded.active,
  created_by = excluded.created_by,
  updated_at = timezone('utc', now());

insert into public.clients (
  id,
  full_name,
  document_number,
  phone,
  address,
  score,
  traffic_light,
  status,
  assigned_collector_id,
  last_payment_at
)
values
  (
    '40000000-0000-0000-0000-000000000001',
    'Maria Gomez',
    '9001001',
    '3001112233',
    'Calle 10 #15-20',
    780,
    'AL_DIA',
    'ACTIVE',
    '10000000-0000-0000-0000-000000000003',
    timezone('utc', now())
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'Carlos Perez',
    '9001002',
    '3002223344',
    'Carrera 8 #23-40',
    640,
    'EN_RIESGO',
    'ACTIVE',
    '10000000-0000-0000-0000-000000000003',
    timezone('utc', now()) - interval '2 days'
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    'Laura Rojas',
    '9001003',
    '3003334455',
    'Transversal 12 #33-15',
    510,
    'CASTIGO',
    'ACTIVE',
    '10000000-0000-0000-0000-000000000003',
    timezone('utc', now()) - interval '10 days'
  )
on conflict (id) do update
set
  full_name = excluded.full_name,
  document_number = excluded.document_number,
  phone = excluded.phone,
  address = excluded.address,
  score = excluded.score,
  traffic_light = excluded.traffic_light,
  status = excluded.status,
  assigned_collector_id = excluded.assigned_collector_id,
  last_payment_at = excluded.last_payment_at,
  updated_at = timezone('utc', now());

insert into public.client_ratings (id, client_id, rating, reason, created_by)
values
  (
    '41000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    5,
    'Cliente puntual y colaborador',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '41000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    3,
    'Presenta retrasos intermitentes',
    '10000000-0000-0000-0000-000000000001'
  )
on conflict (id) do update
set
  client_id = excluded.client_id,
  rating = excluded.rating,
  reason = excluded.reason,
  created_by = excluded.created_by;

insert into public.loans (
  id,
  client_id,
  collector_id,
  tariff_id,
  late_fee_policy_id,
  principal,
  interest_rate,
  total_due,
  term_installments,
  start_date,
  status,
  arrears_days,
  moved_to_writeoff_at,
  notes
)
values
  (
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    1500000.00,
    0.1800,
    1770000.00,
    4,
    current_date - 21,
    'ACTIVE',
    0,
    null,
    'Prestamo vigente con pagos al dia'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    900000.00,
    0.1333,
    1020000.00,
    4,
    current_date - 35,
    'IN_ARREARS',
    12,
    null,
    'Prestamo con mora operativa'
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    800000.00,
    0.2000,
    960000.00,
    4,
    current_date - 90,
    'WRITEOFF',
    60,
    timezone('utc', now()) - interval '2 days',
    'Prestamo enviado a castigo'
  )
on conflict (id) do update
set
  client_id = excluded.client_id,
  collector_id = excluded.collector_id,
  tariff_id = excluded.tariff_id,
  late_fee_policy_id = excluded.late_fee_policy_id,
  principal = excluded.principal,
  interest_rate = excluded.interest_rate,
  total_due = excluded.total_due,
  term_installments = excluded.term_installments,
  start_date = excluded.start_date,
  status = excluded.status,
  arrears_days = excluded.arrears_days,
  moved_to_writeoff_at = excluded.moved_to_writeoff_at,
  notes = excluded.notes,
  updated_at = timezone('utc', now());

insert into public.installments (
  id,
  loan_id,
  installment_number,
  due_date,
  amount_due,
  status,
  paid_at
)
values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1, current_date - 14, 442500.00, 'PAID', timezone('utc', now()) - interval '8 days'),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 2, current_date - 7, 442500.00, 'PAID', timezone('utc', now()) - interval '1 hours'),
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 3, current_date + 1, 442500.00, 'PENDING', null),
  ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000001', 4, current_date + 8, 442500.00, 'PENDING', null),
  ('60000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000002', 1, current_date - 28, 255000.00, 'PAID', timezone('utc', now()) - interval '20 days'),
  ('60000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000002', 2, current_date - 21, 255000.00, 'LATE', null),
  ('60000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000002', 3, current_date - 14, 255000.00, 'LATE', null),
  ('60000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000002', 4, current_date - 7, 255000.00, 'LATE', null),
  ('60000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000003', 1, current_date - 70, 240000.00, 'PAID', timezone('utc', now()) - interval '62 days'),
  ('60000000-0000-0000-0000-000000000010', '50000000-0000-0000-0000-000000000003', 2, current_date - 63, 240000.00, 'LATE', null),
  ('60000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000003', 3, current_date - 56, 240000.00, 'LATE', null),
  ('60000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000003', 4, current_date - 49, 240000.00, 'LATE', null)
on conflict (id) do update
set
  loan_id = excluded.loan_id,
  installment_number = excluded.installment_number,
  due_date = excluded.due_date,
  amount_due = excluded.amount_due,
  status = excluded.status,
  paid_at = excluded.paid_at,
  updated_at = timezone('utc', now());

insert into public.payments (
  id,
  client_payment_uuid,
  loan_id,
  installment_id,
  collector_id,
  amount,
  paid_at,
  method,
  latitude,
  longitude,
  notes
)
values
  (
    '70000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    442500.00,
    timezone('utc', now()) - interval '8 days',
    'CASH',
    4.6097000,
    -74.0817000,
    'Pago registrado en ruta'
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '71000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    442500.00,
    timezone('utc', now()) - interval '1 hours',
    'CASH',
    4.6101000,
    -74.0821000,
    'Pago del dia para pruebas de dashboard'
  ),
  (
    '70000000-0000-0000-0000-000000000003',
    '71000000-0000-0000-0000-000000000003',
    '50000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000003',
    255000.00,
    timezone('utc', now()) - interval '20 days',
    'TRANSFER',
    null,
    null,
    'Abono recibido por transferencia'
  ),
  (
    '70000000-0000-0000-0000-000000000004',
    '71000000-0000-0000-0000-000000000004',
    '50000000-0000-0000-0000-000000000003',
    '60000000-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000003',
    240000.00,
    timezone('utc', now()) - interval '62 days',
    'DAVIPLATA',
    null,
    null,
    'Ultimo pago antes de castigo'
  )
on conflict (id) do update
set
  client_payment_uuid = excluded.client_payment_uuid,
  loan_id = excluded.loan_id,
  installment_id = excluded.installment_id,
  collector_id = excluded.collector_id,
  amount = excluded.amount,
  paid_at = excluded.paid_at,
  method = excluded.method,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  notes = excluded.notes;

-- Ensure a single open session for the demo collector.
update public.cash_sessions
set
  status = 'AUTO_CLOSED',
  closed_at = coalesce(closed_at, timezone('utc', now())),
  auto_closed = true,
  closing_balance = coalesce(closing_balance, opening_balance),
  updated_at = timezone('utc', now())
where collector_id = '10000000-0000-0000-0000-000000000003'
  and status = 'OPEN'
  and id <> '80000000-0000-0000-0000-000000000001';

insert into public.cash_sessions (
  id,
  collector_id,
  opened_at,
  closed_at,
  opening_balance,
  closing_balance,
  status,
  auto_closed,
  notes
)
values
  (
    '80000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    date_trunc('day', timezone('utc', now())) + interval '8 hours',
    null,
    120000.00,
    null,
    'OPEN',
    false,
    'Caja abierta para pruebas del dia'
  ),
  (
    '80000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    date_trunc('day', timezone('utc', now())) - interval '1 day' + interval '8 hours',
    date_trunc('day', timezone('utc', now())) - interval '1 day' + interval '18 hours',
    100000.00,
    330000.00,
    'CLOSED',
    false,
    'Sesion cerrada del dia anterior'
  )
on conflict (id) do update
set
  collector_id = excluded.collector_id,
  opened_at = excluded.opened_at,
  closed_at = excluded.closed_at,
  opening_balance = excluded.opening_balance,
  closing_balance = excluded.closing_balance,
  status = excluded.status,
  auto_closed = excluded.auto_closed,
  notes = excluded.notes,
  updated_at = timezone('utc', now());

insert into public.cash_movements (
  id,
  cash_session_id,
  type,
  amount,
  concept,
  ref_payment_id,
  created_by
)
values
  (
    '90000000-0000-0000-0000-000000000001',
    '80000000-0000-0000-0000-000000000001',
    'IN',
    442500.00,
    'Ingreso por pago cuota',
    '70000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003'
  ),
  (
    '90000000-0000-0000-0000-000000000002',
    '80000000-0000-0000-0000-000000000001',
    'OUT',
    30000.00,
    'Cambio operativo de ruta',
    null,
    '10000000-0000-0000-0000-000000000003'
  ),
  (
    '90000000-0000-0000-0000-000000000003',
    '80000000-0000-0000-0000-000000000002',
    'IN',
    255000.00,
    'Ingreso por transferencia confirmada',
    '70000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003'
  ),
  (
    '90000000-0000-0000-0000-000000000004',
    '80000000-0000-0000-0000-000000000002',
    'OUT',
    12000.00,
    'Ajuste por transporte',
    null,
    '10000000-0000-0000-0000-000000000003'
  )
on conflict (id) do update
set
  cash_session_id = excluded.cash_session_id,
  type = excluded.type,
  amount = excluded.amount,
  concept = excluded.concept,
  ref_payment_id = excluded.ref_payment_id,
  created_by = excluded.created_by;

insert into public.collector_expenses (
  id,
  cash_session_id,
  amount,
  category,
  description,
  created_by
)
values
  (
    '91000000-0000-0000-0000-000000000001',
    '80000000-0000-0000-0000-000000000001',
    18000.00,
    'Transporte',
    'Desplazamiento entre rutas',
    '10000000-0000-0000-0000-000000000003'
  ),
  (
    '91000000-0000-0000-0000-000000000002',
    '80000000-0000-0000-0000-000000000002',
    15000.00,
    'Alimentacion',
    'Gasto operativo jornada anterior',
    '10000000-0000-0000-0000-000000000003'
  )
on conflict (id) do update
set
  cash_session_id = excluded.cash_session_id,
  amount = excluded.amount,
  category = excluded.category,
  description = excluded.description,
  created_by = excluded.created_by;

insert into public.notifications (
  id,
  user_id,
  channel,
  type,
  payload,
  status,
  created_at,
  sent_at,
  read_at
)
values
  (
    'a1000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    'IN_APP',
    'cash.session.open',
    '{"title":"Caja abierta","message":"Inicia tu ruta y registra movimientos en tiempo real."}',
    'PENDING',
    timezone('utc', now()) - interval '30 minutes',
    null,
    null
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'IN_APP',
    'dashboard.alert',
    '{"title":"Mora critica detectada","message":"Hay prestamos en estado de castigo para seguimiento."}',
    'READ',
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) - interval '20 hours'
  )
on conflict (id) do update
set
  user_id = excluded.user_id,
  channel = excluded.channel,
  type = excluded.type,
  payload = excluded.payload,
  status = excluded.status,
  created_at = excluded.created_at,
  sent_at = excluded.sent_at,
  read_at = excluded.read_at;

commit;
