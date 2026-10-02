-- Amigos del Cerro: tablas y reglas de seguridad para Supabase
-- Cómo usarlo: en Supabase → SQL Editor → New query → pegar todo este archivo → Run.
-- Se puede volver a correr sin problemas (no borra datos).

-- 1. PERFILES (un perfil por cuenta) ---------------------------------------
create table if not exists public.perfiles (
    id          uuid primary key references auth.users (id) on delete cascade,
    nombre      text not null default '',
    apellido    text not null default '',
    correo      text,
    telefono    text not null default '',
    comuna      text not null default '',
    nacimiento  text not null default '',          -- dd/mm/aaaa
    personas    jsonb not null default '[]'::jsonb, -- acompañantes guardados (hijos, amigos...)
    creado      timestamptz not null default now(),
    actualizado timestamptz not null default now()
);

alter table public.perfiles enable row level security;

-- Cada persona solo puede ver y editar su propio perfil
drop policy if exists "perfil: ver el propio" on public.perfiles;
create policy "perfil: ver el propio" on public.perfiles
    for select to authenticated using (id = (select auth.uid()));

drop policy if exists "perfil: crear el propio" on public.perfiles;
create policy "perfil: crear el propio" on public.perfiles
    for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists "perfil: editar el propio" on public.perfiles;
create policy "perfil: editar el propio" on public.perfiles
    for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Fecha de última modificación
create or replace function public.marcar_actualizado()
returns trigger language plpgsql as $$
begin
    new.actualizado := now();
    return new;
end;
$$;

drop trigger if exists perfiles_actualizado on public.perfiles;
create trigger perfiles_actualizado before update on public.perfiles
    for each row execute function public.marcar_actualizado();

-- Crear el perfil automáticamente cuando alguien crea su cuenta (con correo o con Google)
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
    datos jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
    completo text := coalesce(datos ->> 'full_name', datos ->> 'name', '');
begin
    insert into public.perfiles (id, correo, nombre, apellido, telefono, comuna)
    values (
        new.id,
        new.email,
        coalesce(datos ->> 'nombre', datos ->> 'given_name', split_part(completo, ' ', 1), ''),
        coalesce(datos ->> 'apellido', datos ->> 'family_name',
                 nullif(substr(completo, length(split_part(completo, ' ', 1)) + 2), ''), ''),
        coalesce(datos ->> 'telefono', ''),
        coalesce(datos ->> 'comuna', '')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
    for each row execute function public.crear_perfil();


-- 2. INSCRIPCIONES A EVENTOS -------------------------------------------------
create table if not exists public.inscripciones (
    id           bigint generated always as identity primary key,
    user_id      uuid references auth.users (id) on delete set null, -- vacío si es invitado
    evento       text not null,              -- 'aves', 'nubes', ...
    tipo         text not null,              -- 'Amigo del Cerro' o 'Invitado'
    nombre       text not null,
    apellido     text not null default '',
    correo       text not null,
    telefono     text not null default '',
    comuna       text,
    personas     text[] not null default '{}', -- nombres de las personas inscritas
    cantidad     int not null default 1 check (cantidad between 1 and 20),
    crear_cuenta boolean not null default false,
    creado       timestamptz not null default now(),
    check (char_length(nombre) <= 100 and char_length(correo) <= 200)
);

create index if not exists inscripciones_evento on public.inscripciones (evento);
create index if not exists inscripciones_usuario on public.inscripciones (user_id);

alter table public.inscripciones enable row level security;

-- Cualquiera puede inscribirse (invitados sin cuenta), pero nadie puede leer las inscripciones de otros
drop policy if exists "inscripcion: invitados" on public.inscripciones;
create policy "inscripcion: invitados" on public.inscripciones
    for insert to anon with check (user_id is null);

drop policy if exists "inscripcion: amigos" on public.inscripciones;
create policy "inscripcion: amigos" on public.inscripciones
    for insert to authenticated with check (user_id is null or user_id = (select auth.uid()));

drop policy if exists "inscripcion: ver las propias" on public.inscripciones;
create policy "inscripcion: ver las propias" on public.inscripciones
    for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "inscripcion: cancelar las propias" on public.inscripciones;
create policy "inscripcion: cancelar las propias" on public.inscripciones
    for delete to authenticated using (user_id = (select auth.uid()));


-- 3. VISTA PARA LA FUNDACIÓN -------------------------------------------------
-- Lista de inscritos por evento. Se ve en Table Editor (no es pública: solo el panel de Supabase la lee).
create or replace view public.inscritos_por_evento
with (security_invoker = true) as
select evento, tipo, nombre, apellido, correo, telefono, comuna,
       array_to_string(personas, ', ') as personas, cantidad, creado
from public.inscripciones
order by evento, creado;

revoke all on public.inscritos_por_evento from anon, authenticated;
