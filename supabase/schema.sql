-- ============================================================
--  AYM Propiedades — Esquema de base de datos
--  Ejecutar UNA VEZ en Supabase: SQL Editor -> New query -> Run
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

create index if not exists propiedades_visible_idx   on public.propiedades (visible);
create index if not exists propiedades_operation_idx on public.propiedades (operation);
create index if not exists propiedades_codigo_idx    on public.propiedades (codigo);

-- updated_at automatico
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists propiedades_touch on public.propiedades;
create trigger propiedades_touch
  before update on public.propiedades
  for each row execute function public.touch_updated_at();

-- ---------- 2. SIGUIENTE CODIGO AM-XXX ----------
-- El panel llama a esto para no repetir codigos nunca.
create or replace function public.siguiente_codigo()
returns text language sql stable as $$
  select 'AM-' || lpad(
    (coalesce(max(nullif(regexp_replace(codigo,'\D','','g'),'')::int), 0) + 1)::text,
    3, '0')
  from public.propiedades;
$$;

-- ---------- 3. PERMISOS (RLS) ----------
alter table public.propiedades enable row level security;

-- El publico (sitio web) SOLO ve las propiedades marcadas como visibles.
drop policy if exists "publico lee visibles" on public.propiedades;
create policy "publico lee visibles"
  on public.propiedades for select
  to anon
  using (visible = true);

-- Quien inicio sesion (tu mama) ve TODO, incluso lo oculto.
drop policy if exists "admin lee todo" on public.propiedades;
create policy "admin lee todo"
  on public.propiedades for select
  to authenticated
  using (true);

-- Y solo quien inicio sesion puede crear, editar y borrar.
drop policy if exists "admin escribe" on public.propiedades;
create policy "admin escribe"
  on public.propiedades for insert
  to authenticated
  with check (true);

drop policy if exists "admin actualiza" on public.propiedades;
create policy "admin actualiza"
  on public.propiedades for update
  to authenticated
  using (true) with check (true);

drop policy if exists "admin borra" on public.propiedades;
create policy "admin borra"
  on public.propiedades for delete
  to authenticated
  using (true);

-- ---------- 4. ALMACEN DE FOTOS ----------
insert into storage.buckets (id, name, public)
values ('fotos','fotos', true)
on conflict (id) do update set public = true;

-- Cualquiera puede VER las fotos (el sitio es publico).
drop policy if exists "fotos lectura publica" on storage.objects;
create policy "fotos lectura publica"
  on storage.objects for select
  to public
  using (bucket_id = 'fotos');

-- Solo quien inicio sesion puede subir, reemplazar o borrar fotos.
drop policy if exists "fotos suben autenticados" on storage.objects;
create policy "fotos suben autenticados"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'fotos');

drop policy if exists "fotos actualizan autenticados" on storage.objects;
create policy "fotos actualizan autenticados"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'fotos');

drop policy if exists "fotos borran autenticados" on storage.objects;
create policy "fotos borran autenticados"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'fotos');
