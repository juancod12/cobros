# Supabase Schema (MVP Contabilidad Móvil)

Este directorio contiene la migración inicial para PostgreSQL/Supabase con:

- RBAC (usuarios, roles, permisos).
- Core #1: clientes, préstamos, cuotas y pagos.
- Core #2: caja, movimientos y gastos de cobrador.
- Reglas base de negocio (gracia 2h, jornada 8am, castigo >45 días, cierre automático 23:59).

## Archivo principal

- `migrations/20260217000100_init_contabilidad_movil.sql`

## Cómo aplicarlo en Supabase

1. Instala y autentica Supabase CLI.
2. Vincula tu proyecto:

```bash
supabase link --project-ref <tu-project-ref>
```

3. Empuja las migraciones:

```bash
supabase db push
```

## Notas

- El esquema crea `pg_cron` para programar cierre automático diario de caja.
- Para autenticación, puedes mapear `users.auth_user_id` a `auth.users.id`.
- Ajusta zona horaria y parámetros de negocio en `system_settings`.

## Seed de pruebas (usuario por defecto)

El proyecto queda configurado para cargar `supabase/seed.sql` en `db reset` (local) y en `db push --include-seed` (remoto).

El seed incluye:

- Usuario ADMIN por defecto.
- Usuarios AUX y COLLECTOR.
- Sincronizacion automatica `auth.users` -> `public.users.auth_user_id` por email.
- Datos de prueba para clientes, prestamos, cuotas, pagos, caja, gastos y notificaciones.

Credenciales de prueba:

- `admin@demo.local` / `Admin123*`
- `aux@demo.local` / `Aux12345*`
- `cobrador@demo.local` / `Collector123*`

Para entorno local:

```bash
supabase db reset
```

Para entorno remoto (linked project):

```bash
supabase db push --linked --include-seed
```
