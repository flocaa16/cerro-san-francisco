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
    insert into public.perfiles (id, correo, nombre, apellido, telefono, comuna, nacimiento)
    values (
        new.id,
        new.email,
        coalesce(datos ->> 'nombre', datos ->> 'given_name', split_part(completo, ' ', 1), ''),
        coalesce(datos ->> 'apellido', datos ->> 'family_name',
                 nullif(substr(completo, length(split_part(completo, ' ', 1)) + 2), ''), ''),
        coalesce(datos ->> 'telefono', ''),
        coalesce(datos ->> 'comuna', ''),
        coalesce(datos ->> 'nacimiento', '')
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

-- Datos del evento (para el correo de confirmación y la lista de la fundación)
alter table public.inscripciones add column if not exists evento_titulo text;
alter table public.inscripciones add column if not exists evento_fecha  text;
alter table public.inscripciones add column if not exists evento_hora   text;
alter table public.inscripciones add column if not exists evento_lugar  text;
alter table public.inscripciones add column if not exists evento_inicio text;  -- 2026-06-13T10:00
alter table public.inscripciones add column if not exists evento_fin    text;
alter table public.inscripciones add column if not exists evento_direccion text; -- dirección para el mapa y el calendario
alter table public.inscripciones add column if not exists evento_cupos     int;  -- cupos del evento al inscribirse (lo pone Supabase)
alter table public.inscripciones add column if not exists evento_encargado text; -- a quién avisar (lo pone Supabase desde "eventos")

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


-- 2b. PERMISOS --------------------------------------------------------------
-- Los proyectos nuevos de Supabase no dan acceso automático a las tablas creadas por SQL.
-- Esto permite usar las tablas desde la web; las reglas de arriba (RLS) siguen decidiendo
-- QUÉ filas puede ver o cambiar cada persona.
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.perfiles to authenticated;
grant insert on public.inscripciones to anon, authenticated;
grant select, delete on public.inscripciones to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;


-- 2c. CUPOS Y ENCARGADO DE CADA EVENTO -------------------------------------------
-- Se configuran SOLO aquí, en Supabase → Table Editor → tabla "eventos" (una fila por evento):
--   evento     el mismo nombre corto de eventos.js (ej. 'aves')
--   cupos      máximo de personas (0 = sin límite)
--   encargado  a quién avisar: nombre corto definido en config-cerro.php como 'NOMBRE_destino'
-- La web no puede leer ni cambiar esta tabla, así que nadie puede saltarse los cupos.
-- Un evento que no está en la tabla no tiene límite y avisa a 'inscripciones_destino'.
create table if not exists public.eventos (
    evento    text primary key,
    cupos     int not null default 0 check (cupos >= 0),
    encargado text check (encargado ~ '^[a-z0-9_]{1,40}$')
);

alter table public.eventos enable row level security;  -- sin reglas: la web no tiene acceso
revoke all on public.eventos from anon, authenticated;

-- La web solo puede preguntar si cada evento tiene las inscripciones cerradas (no cuántos cupos quedan)
drop function if exists public.cupos_ocupados(text[]);
drop function if exists public.eventos_cerrados(text[], int[]);
create or replace function public.eventos_cerrados(ids text[])
returns table (evento text, cerrado boolean)
language sql stable security definer set search_path = '' as $$
    select e.evento,
           coalesce((select sum(i.cantidad) from public.inscripciones i where i.evento = e.evento), 0) >= e.cupos
    from public.eventos e
    where e.evento = any (ids) and e.cupos > 0;
$$;

revoke all on function public.eventos_cerrados(text[]) from public;
grant execute on function public.eventos_cerrados(text[]) to anon, authenticated;

-- Antes de guardar una inscripción (aunque dos personas se inscriban al mismo tiempo):
--   · la cantidad nunca es menor que el número de personas inscritas
--   · cupos y encargado se toman de la tabla "eventos" (lo que mande la web se ignora)
--   · un invitado no puede inscribirse dos veces con el mismo correo al mismo evento (YA_INSCRITO)
--   · si no hay cupos se rechaza: CUPOS_AGOTADOS (lleno) o CUPOS_INSUFICIENTES (no caben todos)
create or replace function public.revisar_cupos()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
    ajustes  record;
    ocupados int;
begin
    new.cantidad := greatest(new.cantidad, coalesce(cardinality(new.personas), 0));

    select e.cupos, e.encargado into ajustes from public.eventos e where e.evento = new.evento;
    new.evento_cupos := nullif(ajustes.cupos, 0);
    new.evento_encargado := ajustes.encargado;

    perform pg_advisory_xact_lock(hashtext('cupos:' || new.evento));

    if new.user_id is null and exists (
        select 1 from public.inscripciones i
        where i.evento = new.evento and i.user_id is null and lower(i.correo) = lower(new.correo)
    ) then
        raise exception 'YA_INSCRITO';
    end if;

    if new.evento_cupos is null then
        return new;
    end if;

    -- Un Amigo del Cerro que cambia su inscripción no se cuenta dos veces
    select coalesce(sum(i.cantidad), 0) into ocupados
    from public.inscripciones i
    where i.evento = new.evento
      and (new.user_id is null or i.user_id is distinct from new.user_id);

    if ocupados >= new.evento_cupos then
        raise exception 'CUPOS_AGOTADOS';
    elsif ocupados + new.cantidad > new.evento_cupos then
        raise exception 'CUPOS_INSUFICIENTES';
    end if;
    return new;
end;
$$;

drop trigger if exists inscripciones_cupos on public.inscripciones;
create trigger inscripciones_cupos before insert on public.inscripciones
    for each row execute function public.revisar_cupos();

-- Un Amigo del Cerro tiene una sola inscripción por evento: al guardar la nueva se borra la anterior
-- (en la base de datos, para que nunca queden dos ocupando cupos)
create or replace function public.reemplazar_inscripcion()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    if new.user_id is not null then
        delete from public.inscripciones i
        where i.user_id = new.user_id and i.evento = new.evento and i.id <> new.id;
    end if;
    return null;
end;
$$;

drop trigger if exists inscripciones_reemplazar on public.inscripciones;
create trigger inscripciones_reemplazar after insert on public.inscripciones
    for each row execute function public.reemplazar_inscripcion();


-- 3. VISTA PARA LA FUNDACIÓN -------------------------------------------------
-- Lista de inscritos por evento. Se ve en Table Editor (no es pública: solo el panel de Supabase la lee).
create or replace view public.inscritos_por_evento
with (security_invoker = true) as
select evento, tipo, nombre, apellido, correo, telefono, comuna,
       array_to_string(personas, ', ') as personas, cantidad, creado
from public.inscripciones
order by evento, creado;

revoke all on public.inscritos_por_evento from anon, authenticated;
