-- ============================================================
--  AYM Propiedades — Esquema de base de datos
--  Ejecutar en Supabase: SQL Editor -> New query -> Run
--  (supabase/setup.sql trae este archivo + la carga inicial en
--   un solo paso; es seguro ejecutarlo más de una vez)
-- ============================================================

-- ---------- 1. TABLA DE PROPIEDADES ----------
create table if not exists public.propiedades (
  id          uuid primary key default gen_random_uuid(),
  codigo      text unique not null,               -- AM-001, AM-002, ...
  title       text not null,
  operation   text not null default 'Venta',
  type        text not null default 'Casa',
  commune     text,
  address     text,
  status      text not null default 'Disponible',
  price_clp   bigint,
  price_uf    numeric(12,2),
  summary     text,
  description text,
  bedrooms    int,
  bathrooms   int,
  surface     numeric(10,2),                      -- m2 construidos
  terrain     numeric(10,2),                      -- m2 terreno
  images      jsonb not null default '[]'::jsonb, -- la PRIMERA es la portada
  visible     boolean not null default true,      -- se muestra en el sitio publico
  orden       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Valores permitidos (si ya existen, no falla)
do $$ begin
  alter table public.propiedades
    add constraint propiedades_operation_check
    check (operation in ('Venta','Arriendo'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.propiedades
    add constraint propiedades_status_check
    check (status in ('Disponible','Reservada','Vendida','Arrendada'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.propiedades
    add constraint propiedades_images_es_lista
    check (jsonb_typeof(images) = 'array');
exception when duplicate_object then null; end $$;

create index if not exists propiedades_visible_idx   on public.propiedades (visible);
create index if not exists propiedades_operation_idx on public.propiedades (operation);

-- updated_at automatico
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists propiedades_touch on public.propiedades;
create trigger propiedades_touch
  before update on public.propiedades
  for each row execute function public.touch_updated_at();

-- ---------- 2. QUIÉNES PUEDEN ADMINISTRAR ----------
-- Solo los correos de esta tabla pueden crear, editar o borrar.
-- Tener cuenta no basta: hay que estar en la lista. Así, aunque
-- alguien lograra registrarse, no podría tocar nada.
create table if not exists public.administradores (
  email       text primary key,
  nombre      text,
  created_at  timestamptz not null default now()
);
alter table public.administradores enable row level security;
-- Sin políticas: nadie la lee ni la edita desde el sitio. Solo desde el
-- panel de Supabase (Table Editor) o con es_admin() más abajo.

-- Los correos se guardan siempre en minúsculas y sin espacios, aunque se
-- escriban a mano en el Table Editor ("Fanny@Gmail.com " -> "fanny@gmail.com").
create or replace function public.normalizar_email_admin()
returns trigger language plpgsql set search_path = public as $$
begin
  new.email = lower(trim(new.email));
  return new;
end $$;

drop trigger if exists administradores_normaliza on public.administradores;
create trigger administradores_normaliza
  before insert or update on public.administradores
  for each row execute function public.normalizar_email_admin();

-- PRIMERA VEZ: si la lista está vacía, las cuentas confirmadas que ya existen
-- en Authentication -> Users quedan como administradoras. Por eso el README
-- pide crear el usuario antes de correr este SQL. Si la lista ya tiene a
-- alguien, volver a ejecutar este archivo NO agrega a nadie más.
-- Para agregar otra persona después: Table Editor -> administradores -> Insert row.
insert into public.administradores (email)
select lower(trim(email)) from auth.users
where coalesce(email, '') <> ''
  and email_confirmed_at is not null
  and coalesce(is_anonymous, false) = false
  and not exists (select 1 from public.administradores)
on conflict (email) do nothing;

create or replace function public.es_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
     and exists (
       select 1 from public.administradores a
       where a.email = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
     );
$$;
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated, anon;

-- ---------- 3. SIGUIENTE CODIGO AM-XXX ----------
-- El panel llama a esto para no repetir códigos nunca.
create or replace function public.siguiente_codigo()
returns text
language sql stable security invoker
set search_path = public
as $$
  with n as (
    select coalesce(max((regexp_match(codigo, '^AM-(\d{1,9})$'))[1]::int), 0) + 1 as sig
    from public.propiedades
  )
  select 'AM-' || case when sig < 1000 then lpad(sig::text, 3, '0') else sig::text end
  from n;
$$;
revoke all on function public.siguiente_codigo() from public, anon;
grant execute on function public.siguiente_codigo() to authenticated;

-- ---------- 4. PERMISOS ----------
-- a) Qué OPERACIONES puede intentar cada rol desde la API. Se deja explícito
--    para no depender de la opción "Automatically expose new tables" con que
--    se haya creado el proyecto.
revoke all on public.propiedades     from anon, authenticated;
revoke all on public.administradores from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select                         on public.propiedades to anon;
grant select, insert, update, delete on public.propiedades to authenticated;

-- b) Qué FILAS (RLS): las políticas de abajo.
alter table public.propiedades enable row level security;

-- Políticas de versiones anteriores (si existen, se reemplazan)
drop policy if exists "publico lee visibles" on public.propiedades;
drop policy if exists "admin lee todo"       on public.propiedades;
drop policy if exists "admin escribe"        on public.propiedades;
drop policy if exists "admin actualiza"      on public.propiedades;
drop policy if exists "admin borra"          on public.propiedades;

-- Cualquiera (también alguien con sesión que no es administradora) ve
-- SOLO las propiedades marcadas como visibles.
create policy "publico lee visibles"
  on public.propiedades for select
  to anon, authenticated
  using (visible = true);

-- Las administradoras ven TODO, incluso lo oculto.
create policy "admin lee todo"
  on public.propiedades for select
  to authenticated
  using (public.es_admin());

-- Y solo ellas pueden crear, editar y borrar.
create policy "admin escribe"
  on public.propiedades for insert
  to authenticated
  with check (public.es_admin());

create policy "admin actualiza"
  on public.propiedades for update
  to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "admin borra"
  on public.propiedades for delete
  to authenticated
  using (public.es_admin());

-- ---------- 5. ALMACEN DE FOTOS ----------
-- Bucket público: cualquiera puede VER una foto si tiene su dirección
-- (no hace falta política para eso). Máximo 10 MB por archivo y solo
-- imágenes: nadie puede usarlo de disco duro gratis.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos lectura publica"         on storage.objects;
drop policy if exists "fotos suben autenticados"      on storage.objects;
drop policy if exists "fotos actualizan autenticados" on storage.objects;
drop policy if exists "fotos borran autenticados"     on storage.objects;
drop policy if exists "fotos admin lista"             on storage.objects;
drop policy if exists "fotos admin sube"              on storage.objects;
drop policy if exists "fotos admin actualiza"         on storage.objects;
drop policy if exists "fotos admin borra"             on storage.objects;

-- Listar el bucket (ver qué archivos hay) solo las administradoras:
-- un anónimo no puede enumerar las fotos de propiedades ocultas.
create policy "fotos admin lista"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'fotos' and public.es_admin());

create policy "fotos admin sube"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'fotos' and public.es_admin());

create policy "fotos admin actualiza"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'fotos' and public.es_admin())
  with check (bucket_id = 'fotos' and public.es_admin());

create policy "fotos admin borra"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'fotos' and public.es_admin());
