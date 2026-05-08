-- Seed data for local development and manual QA.
-- Compatible con supabase db push --include-seed
-- NO usa TEMPORARY TABLE (no funcionan bien en sesiones de Supabase CLI)

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
-- 2) Usuarios demo
-- Usamos IDs fijos para poder reejecutar el seed sin duplicados.
-- El bloque DO crea primero el usuario en auth.users, luego en public.users.
-- -----------------------------------------------------
do $$
declare
  v_admin_auth_id  uuid := '20000000-0000-0000-0000-000000000001';
  v_aux_auth_id    uuid := '20000000-0000-0000-0000-000000000002';
  v_coll_auth_id   uuid := '20000000-0000-0000-0000-000000000003';
  v_admin_app_id   uuid := '10000000-0000-0000-0000-000000000001';
  v_aux_app_id     uuid := '10000000-0000-0000-0000-000000000002';
  v_coll_app_id    uuid := '10000000-0000-0000-0000-000000000003';
begin
  -- ── auth.users ──────────────────────────────────────────────────────────
  if to_regclass('auth.users') is not null then
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at
    ) values
      (
        '00000000-0000-0000-0000-000000000000',
        v_admin_auth_id, 'authenticated', 'authenticated',
        'admin@demo.local',
        extensions.crypt('Admin123*', extensions.gen_salt('bf')),
        now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Admin Demo","role":"ADMIN","status":"active"}'::jsonb,
        false, now(), now()
      ),
      (
        '00000000-0000-0000-0000-000000000000',
        v_aux_auth_id, 'authenticated', 'authenticated',
        'aux@demo.local',
        extensions.crypt('Aux12345*', extensions.gen_salt('bf')),
        now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Auxiliar Demo","role":"AUX","status":"active"}'::jsonb,
        false, now(), now()
      ),
      (
        '00000000-0000-0000-0000-000000000000',
        v_coll_auth_id, 'authenticated', 'authenticated',
        'cobrador@demo.local',
        extensions.crypt('Collector123*', extensions.gen_salt('bf')),
        now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Cobrador Demo","role":"COLLECTOR","status":"active"}'::jsonb,
        false, now(), now()
      )
    on conflict (id) do update set
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = excluded.email_confirmed_at,
      updated_at         = now();

    -- identities
    if to_regclass('auth.identities') is not null then
      insert into auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) values
        (
          '21000000-0000-0000-0000-000000000001',
          v_admin_auth_id,
          jsonb_build_object('sub', v_admin_auth_id::text, 'email', 'admin@demo.local'),
          'email', 'admin@demo.local', now(), now(), now()
        ),
        (
          '21000000-0000-0000-0000-000000000002',
          v_aux_auth_id,
          jsonb_build_object('sub', v_aux_auth_id::text, 'email', 'aux@demo.local'),
          'email', 'aux@demo.local', now(), now(), now()
        ),
        (
          '21000000-0000-0000-0000-000000000003',
          v_coll_auth_id,
          jsonb_build_object('sub', v_coll_auth_id::text, 'email', 'cobrador@demo.local'),
          'email', 'cobrador@demo.local', now(), now(), now()
        )
      on conflict (id) do update set
        user_id       = excluded.user_id,
        identity_data = excluded.identity_data,
        updated_at    = now();
    end if;
  end if;

  -- ── public.users ────────────────────────────────────────────────────────
  insert into public.users (
    id, auth_user_id, full_name, email, cc,
    password_hash, status, created_by, last_login_at
  ) values
    (
      v_admin_app_id, v_admin_auth_id,
      'Admin Demo', 'admin@demo.local', '1000000001',
      extensions.crypt('Admin123*', extensions.gen_salt('bf')),
      'ACTIVE', null, now()
    ),
    (
      v_aux_app_id, v_aux_auth_id,
      'Auxiliar Demo', 'aux@demo.local', '1000000002',
      extensions.crypt('Aux12345*', extensions.gen_salt('bf')),
      'ACTIVE', v_admin_app_id, now()
    ),
    (
      v_coll_app_id, v_coll_auth_id,
      'Cobrador Demo', 'cobrador@demo.local', '1000000003',
      extensions.crypt('Collector123*', extensions.gen_salt('bf')),
      'ACTIVE', v_admin_app_id, now()
    )
  on conflict (id) do update set
    auth_user_id  = excluded.auth_user_id,
    full_name     = excluded.full_name,
    email         = excluded.email,
    cc            = excluded.cc,
    password_hash = excluded.password_hash,
    status        = excluded.status,
    last_login_at = excluded.last_login_at,
    updated_at    = now();

  -- ── user_roles ───────────────────────────────────────────────────────────
  insert into public.user_roles (user_id, role_id)
  select v_admin_app_id, r.id from public.roles r where r.code = 'ADMIN'
  on conflict (user_id, role_id) do nothing;

  insert into public.user_roles (user_id, role_id)
  select v_aux_app_id, r.id from public.roles r where r.code = 'AUX'
  on conflict (user_id, role_id) do nothing;

  insert into public.user_roles (user_id, role_id)
  select v_coll_app_id, r.id from public.roles r where r.code = 'COLLECTOR'
  on conflict (user_id, role_id) do nothing;

end $$;

-- -----------------------------------------------------
-- 3) System settings
-- -----------------------------------------------------
update public.system_settings
set
  business_timezone = 'America/Bogota',
  workday_start     = '08:00:00',
  sunday_counts     = false,
  grace_hours       = 2,
  days_to_writeoff  = 45,
  auto_close_time   = '23:59:00',
  updated_at        = now()
where id = true;

-- -----------------------------------------------------
-- 4) Master data
-- -----------------------------------------------------
insert into public.tariffs (id, name, commission_pct, rules, active)
values (
  '30000000-0000-0000-0000-000000000001',
  'Tarifa Estandar Diario',
  5.0000,
  '{"frequency":"daily","notes":"tarifa seed"}',
  true
)
on conflict (id) do update set
  name           = excluded.name,
  commission_pct = excluded.commission_pct,
  rules          = excluded.rules,
  active         = excluded.active,
  updated_at     = now();

insert into public.late_fee_policies (
  id, name, rule_type, value, grace_hours, active, created_by
) values (
  '30000000-0000-0000-0000-000000000002',
  'Mora diaria 1.5%',
  'PER_DAY_PERCENTAGE',
  1.5000,
  2,
  true,
  '10000000-0000-0000-0000-000000000001'
)
on conflict (id) do update set
  name        = excluded.name,
  rule_type   = excluded.rule_type,
  value       = excluded.value,
  grace_hours = excluded.grace_hours,
  active      = excluded.active,
  updated_at  = now();

-- -----------------------------------------------------
-- 5) Clientes
-- -----------------------------------------------------
insert into public.clients (
  id, full_name, document_number, phone, address,
  score, traffic_light, status, assigned_collector_id, last_payment_at
) values
  (
    '40000000-0000-0000-0000-000000000001',
    'Maria Gomez', '9001001', '3001112233', 'Calle 10 #15-20',
    780, 'AL_DIA', 'ACTIVE',
    '10000000-0000-0000-0000-000000000003', now()
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'Carlos Perez', '9001002', '3002223344', 'Carrera 8 #23-40',
    640, 'EN_RIESGO', 'ACTIVE',
    '10000000-0000-0000-0000-000000000003', now() - interval '2 days'
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    'Laura Rojas', '9001003', '3003334455', 'Transversal 12 #33-15',
    510, 'CASTIGO', 'ACTIVE',
    '10000000-0000-0000-0000-000000000003', now() - interval '10 days'
  )
on conflict (id) do update set
  full_name              = excluded.full_name,
  phone                  = excluded.phone,
  address                = excluded.address,
  score                  = excluded.score,
  traffic_light          = excluded.traffic_light,
  assigned_collector_id  = excluded.assigned_collector_id,
  last_payment_at        = excluded.last_payment_at,
  updated_at             = now();

-- -----------------------------------------------------
-- 6) Préstamos
-- -----------------------------------------------------
insert into public.loans (
  id, client_id, collector_id, tariff_id, late_fee_policy_id,
  principal, interest_rate, total_due, term_installments,
  start_date, status, arrears_days, moved_to_writeoff_at, notes
) values
  (
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    1500000.00, 0.1800, 1770000.00, 4,
    current_date - 21, 'ACTIVE', 0, null,
    'Prestamo vigente con pagos al dia'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    900000.00, 0.1333, 1020000.00, 4,
    current_date - 35, 'IN_ARREARS', 12, null,
    'Prestamo con mora operativa'
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    800000.00, 0.2000, 960000.00, 4,
    current_date - 90, 'WRITEOFF', 60,
    now() - interval '2 days',
    'Prestamo enviado a castigo'
  )
on conflict (id) do update set
  status              = excluded.status,
  arrears_days        = excluded.arrears_days,
  moved_to_writeoff_at= excluded.moved_to_writeoff_at,
  updated_at          = now();

-- -----------------------------------------------------
-- 7) Cuotas
-- -----------------------------------------------------
insert into public.installments (
  id, loan_id, installment_number, due_date, amount_due, status, paid_at
) values
  ('60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001',1,current_date-14,442500.00,'PAID',now()-interval '8 days'),
  ('60000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001',2,current_date-7, 442500.00,'PAID',now()-interval '1 hour'),
  ('60000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000001',3,current_date+1, 442500.00,'PENDING',null),
  ('60000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000001',4,current_date+8, 442500.00,'PENDING',null),
  ('60000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000002',1,current_date-28,255000.00,'PAID',now()-interval '20 days'),
  ('60000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000002',2,current_date-21,255000.00,'LATE',null),
  ('60000000-0000-0000-0000-000000000007','50000000-0000-0000-0000-000000000002',3,current_date-14,255000.00,'LATE',null),
  ('60000000-0000-0000-0000-000000000008','50000000-0000-0000-0000-000000000002',4,current_date-7, 255000.00,'LATE',null),
  ('60000000-0000-0000-0000-000000000009','50000000-0000-0000-0000-000000000003',1,current_date-70,240000.00,'PAID',now()-interval '62 days'),
  ('60000000-0000-0000-0000-000000000010','50000000-0000-0000-0000-000000000003',2,current_date-63,240000.00,'LATE',null),
  ('60000000-0000-0000-0000-000000000011','50000000-0000-0000-0000-000000000003',3,current_date-56,240000.00,'LATE',null),
  ('60000000-0000-0000-0000-000000000012','50000000-0000-0000-0000-000000000003',4,current_date-49,240000.00,'LATE',null)
on conflict (id) do update set
  status     = excluded.status,
  paid_at    = excluded.paid_at,
  updated_at = now();

-- -----------------------------------------------------
-- 8) Pagos
-- -----------------------------------------------------
insert into public.payments (
  id, client_payment_uuid, loan_id, installment_id,
  collector_id, amount, paid_at, method, notes
) values
  ('70000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000003',442500.00,now()-interval '8 days','CASH','Pago en ruta'),
  ('70000000-0000-0000-0000-000000000002','71000000-0000-0000-0000-000000000002',
   '50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000003',442500.00,now()-interval '1 hour','CASH','Pago del dia'),
  ('70000000-0000-0000-0000-000000000003','71000000-0000-0000-0000-000000000003',
   '50000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000003',255000.00,now()-interval '20 days','TRANSFER','Abono transferencia'),
  ('70000000-0000-0000-0000-000000000004','71000000-0000-0000-0000-000000000004',
   '50000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000009',
   '10000000-0000-0000-0000-000000000003',240000.00,now()-interval '62 days','DAVIPLATA','Ultimo pago antes de castigo')
on conflict (id) do nothing;

-- -----------------------------------------------------
-- 9) Caja
-- -----------------------------------------------------
update public.cash_sessions
set
  status         = 'AUTO_CLOSED',
  closed_at      = coalesce(closed_at, now()),
  auto_closed    = true,
  closing_balance= coalesce(closing_balance, opening_balance),
  updated_at     = now()
where collector_id = '10000000-0000-0000-0000-000000000003'
  and status = 'OPEN'
  and id <> '80000000-0000-0000-0000-000000000001';

insert into public.cash_sessions (
  id, collector_id, opened_at, closed_at,
  opening_balance, closing_balance, status, auto_closed, notes
) values
  (
    '80000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    date_trunc('day', now()) + interval '8 hours',
    null, 120000.00, null, 'OPEN', false,
    'Caja abierta para pruebas del dia'
  ),
  (
    '80000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    date_trunc('day', now()) - interval '1 day' + interval '8 hours',
    date_trunc('day', now()) - interval '1 day' + interval '18 hours',
    100000.00, 330000.00, 'CLOSED', false,
    'Sesion cerrada del dia anterior'
  )
on conflict (id) do update set
  status          = excluded.status,
  closed_at       = excluded.closed_at,
  closing_balance = excluded.closing_balance,
  updated_at      = now();

insert into public.cash_movements (
  id, cash_session_id, type, amount, concept, ref_payment_id, created_by
) values
  ('90000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001','IN', 442500.00,'Ingreso por pago cuota','70000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003'),
  ('90000000-0000-0000-0000-000000000002','80000000-0000-0000-0000-000000000001','OUT', 30000.00,'Cambio operativo de ruta',null,'10000000-0000-0000-0000-000000000003'),
  ('90000000-0000-0000-0000-000000000003','80000000-0000-0000-0000-000000000002','IN', 255000.00,'Ingreso por transferencia','70000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003'),
  ('90000000-0000-0000-0000-000000000004','80000000-0000-0000-0000-000000000002','OUT', 12000.00,'Ajuste por transporte',null,'10000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;

insert into public.collector_expenses (
  id, cash_session_id, amount, category, description, created_by
) values
  ('91000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001',18000.00,'Transporte','Desplazamiento entre rutas','10000000-0000-0000-0000-000000000003'),
  ('91000000-0000-0000-0000-000000000002','80000000-0000-0000-0000-000000000002',15000.00,'Alimentacion','Gasto jornada anterior','10000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;

-- -----------------------------------------------------
-- 10) Notificaciones
-- -----------------------------------------------------
insert into public.notifications (
  id, user_id, channel, type, payload, status, created_at, sent_at, read_at
) values
  (
    'a1000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    'IN_APP', 'cash.session.open',
    '{"title":"Caja abierta","message":"Inicia tu ruta y registra movimientos en tiempo real."}',
    'PENDING', now()-interval '30 minutes', null, null
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'IN_APP', 'dashboard.alert',
    '{"title":"Mora critica detectada","message":"Hay prestamos en estado de castigo para seguimiento."}',
    'READ', now()-interval '1 day', now()-interval '1 day', now()-interval '20 hours'
  )
on conflict (id) do nothing;

commit;