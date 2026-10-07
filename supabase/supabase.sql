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


-- 2c. EVENTOS (contenido, cupos y encargado) -------------------------------------
-- Los eventos se crean y editan en Supabase → Table Editor → tabla "eventos" (una fila por evento).
-- La web muestra solo los datos públicos (función eventos_publicos, más abajo); los cupos y el
-- encargado NUNCA salen de Supabase, así que nadie puede verlos ni saltárselos desde la web.
-- El estado ("Inscripciones abiertas", "Quedan pocos cupos", "Inscripciones cerradas", "Finalizado")
-- se calcula solo. Ver supabase/LEEME.md (sección 9) para la explicación de cada columna.
create table if not exists public.eventos (
    evento    text primary key,
    cupos     int not null default 0 check (cupos >= 0),
    encargado text
);

-- Contenido del evento (lo que se ve en la web)
alter table public.eventos add column if not exists titulo              text;
alter table public.eventos add column if not exists fecha               date;
alter table public.eventos add column if not exists hora_inicio         time;   -- hora de Chile
alter table public.eventos add column if not exists hora_fin            time;   -- hora de Chile
alter table public.eventos add column if not exists lugar               text;
alter table public.eventos add column if not exists direccion           text;
alter table public.eventos add column if not exists mapa                text;
alter table public.eventos add column if not exists imagen              text;
alter table public.eventos add column if not exists imagen_alt          text;
alter table public.eventos add column if not exists texto               text;
alter table public.eventos add column if not exists inscripcion_externa text;
alter table public.eventos add column if not exists publicado           boolean not null default true;
alter table public.eventos add column if not exists finalizado          boolean not null default false;

-- Versión anterior (inicio/fin con fecha y hora, hora y estado escritos a mano): se pasan los datos
-- a fecha / hora_inicio / hora_fin y se quitan esas columnas. El estado ahora es automático.
do $$
begin
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'eventos' and column_name = 'inicio') then
        drop function if exists public.eventos_publicos();
        update public.eventos set
            fecha = coalesce(fecha, inicio::date),
            hora_inicio = coalesce(hora_inicio, case when hora ilike '%confirmar%' then null else inicio::time end),
            hora_fin = coalesce(hora_fin, case when hora ilike '%confirmar%' then null else fin::time end);
        alter table public.eventos drop column inicio, drop column fin, drop column hora;
    end if;
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'eventos' and column_name = 'estado') then
        drop function if exists public.eventos_publicos();
        alter table public.eventos drop column estado;
    end if;
end;
$$;

-- Ayuda que se ve en Table Editor al pasar sobre cada columna
comment on table  public.eventos is 'Eventos del sitio. Una fila por evento. Los cambios se ven en la web en 1 minuto. El estado (abiertas, pocos cupos, cerradas, finalizado) es automático.';
comment on column public.eventos.evento is 'Nombre corto para el link (minúsculas, números y guiones). Ej: taller-otono → cerrosanfrancisco.cl/inscripcion?evento=taller-otono. No cambiarlo después de publicar.';
comment on column public.eventos.cupos is 'Máximo de personas. 0 = sin límite. Con 80% ocupado aparece "Quedan pocos cupos"; lleno, "Inscripciones cerradas". El número no se muestra en la web.';
comment on column public.eventos.encargado is 'Quién recibe el aviso de cada inscripción (su correo está en config-cerro.php). Vacío = inscripciones_destino.';
comment on column public.eventos.titulo is 'Nombre del evento.';
comment on column public.eventos.fecha is 'Día del evento. Ej: 2026-10-08. El día de la semana y el mes en español se escriben solos.';
comment on column public.eventos.hora_inicio is 'Hora de inicio (hora de Chile). Ej: 18:30. Vacío = "Por confirmar". Las inscripciones se cierran solas a esta hora.';
comment on column public.eventos.hora_fin is 'Opcional. Hora de término. Ej: 20:00. Vacío = 2 horas después del inicio. Después de esta hora el evento se oculta solo.';
comment on column public.eventos.lugar is 'Nombre del lugar. Ej: Parque Natural Cerro San Francisco';
comment on column public.eventos.direccion is 'Dirección para el mapa y el calendario. Ej: Coronel Santiago Bueras 826, Curimón, San Felipe';
comment on column public.eventos.mapa is 'Opcional. Link de Google Maps. Vacío = se arma con la dirección.';
comment on column public.eventos.imagen is 'Foto: nombre del archivo subido a Storage → eventos (ej. taller.jpg), o un link completo.';
comment on column public.eventos.imagen_alt is 'Descripción de la foto para personas ciegas. Vacío = el título.';
comment on column public.eventos.texto is 'Descripción. Cada línea es un párrafo.';
comment on column public.eventos.inscripcion_externa is 'Opcional. Link a un formulario de otro sitio: el botón Inscribirme abre ese link.';
comment on column public.eventos.publicado is 'Desmarcado = borrador (no se ve en la web).';
comment on column public.eventos.finalizado is 'Marcado = se termina antes de tiempo (ej. si se suspende).';

alter table public.eventos drop constraint if exists eventos_evento_check;
alter table public.eventos add constraint eventos_evento_check check (evento ~ '^[a-z0-9-]{1,60}$');

-- Encargado: lista de opciones (en Table Editor aparece como menú desplegable).
-- Para agregar otra opción, correr en SQL Editor:  alter type public.encargado_evento add value 'encargado-tres';
-- y definir su correo en config-cerro.php → 'encargados'.
do $$
begin
    if not exists (select 1 from pg_type where typname = 'encargado_evento' and typnamespace = 'public'::regnamespace) then
        create type public.encargado_evento as enum ('encargado-uno', 'encargado-dos');
    end if;
    if (select data_type from information_schema.columns
        where table_schema = 'public' and table_name = 'eventos' and column_name = 'encargado') = 'text' then
        alter table public.eventos drop constraint if exists eventos_encargado_check;
        -- Valores que no estén en la lista quedan vacíos (el aviso va a inscripciones_destino)
        alter table public.eventos alter column encargado type public.encargado_evento using (
            case when encargado in ('encargado-uno', 'encargado-dos') then encargado::public.encargado_evento end);
    end if;
end;
$$;

alter table public.eventos enable row level security;  -- sin reglas: la web no tiene acceso
revoke all on public.eventos from anon, authenticated;

-- Momento en que empieza y termina cada evento (hora de Chile)
--   inicio: fecha + hora_inicio (sin hora: fin del día, para poder inscribirse ese día)
--   fin:    fecha + hora_fin (si es menor que el inicio, al día siguiente); sin hora_fin: inicio + 2 horas
create or replace function public.evento_inicio(e public.eventos)
returns timestamp language sql immutable set search_path = '' as $$
    select e.fecha + coalesce(e.hora_inicio, time '23:59');
$$;

create or replace function public.evento_fin(e public.eventos)
returns timestamp language sql immutable set search_path = '' as $$
    select case
        when e.hora_inicio is null then e.fecha + time '23:59'
        when e.hora_fin is null then e.fecha + e.hora_inicio + interval '2 hours'
        when e.hora_fin <= e.hora_inicio then e.fecha + 1 + e.hora_fin
        else e.fecha + e.hora_fin
    end;
$$;

-- Estado automático de un evento:
--   Finalizado              ya terminó o se marcó "finalizado"
--   Inscripciones cerradas  ya empezó, o se llenaron los cupos
--   Quedan pocos cupos      ocupado el 80% o más de los cupos
--   Inscripciones abiertas  en los demás casos
create or replace function public.evento_estado(e public.eventos)
returns text language sql stable security definer set search_path = '' as $$
    with datos as (
        select now() at time zone 'America/Santiago' as ahora,
               coalesce((select sum(i.cantidad) from public.inscripciones i where i.evento = e.evento), 0) as ocupados
    )
    select case
        when e.finalizado or d.ahora >= public.evento_fin(e) then 'Finalizado'
        when d.ahora >= public.evento_inicio(e) then 'Inscripciones cerradas'
        when e.cupos > 0 and d.ocupados >= e.cupos then 'Inscripciones cerradas'
        when e.cupos > 0 and d.ocupados >= ceil(e.cupos * 0.8) then 'Quedan pocos cupos'
        else 'Inscripciones abiertas'
    end
    from datos d;
$$;

revoke all on function public.evento_estado(public.eventos) from public;

-- La web pregunta el estado de cada evento (nunca cuántos cupos quedan)
drop function if exists public.cupos_ocupados(text[]);
drop function if exists public.eventos_cerrados(text[], int[]);
drop function if exists public.eventos_cerrados(text[]);
create or replace function public.eventos_estados(ids text[])
returns table (evento text, estado text)
language sql stable security definer set search_path = '' as $$
    select e.evento, public.evento_estado(e)
    from public.eventos e
    where e.evento = any (ids) and e.publicado;
$$;

revoke all on function public.eventos_estados(text[]) from public;
grant execute on function public.eventos_estados(text[]) to anon, authenticated;

-- Datos públicos de los eventos para la web (sin cupos ni encargado).
-- Incluye eventos terminados hace menos de 120 días (para "Mis inscripciones").
drop function if exists public.eventos_publicos();
create or replace function public.eventos_publicos()
returns table (
    evento text, titulo text, estado text, fecha date, hora_inicio time, hora_fin time,
    lugar text, direccion text, mapa text, imagen text, imagen_alt text, texto text,
    inscripcion_externa text
)
language sql stable security definer set search_path = '' as $$
    select e.evento, e.titulo, public.evento_estado(e), e.fecha, e.hora_inicio, e.hora_fin,
           e.lugar, e.direccion, e.mapa, e.imagen, e.imagen_alt, e.texto,
           e.inscripcion_externa
    from public.eventos e
    where e.publicado and e.titulo is not null and e.fecha is not null
      and public.evento_fin(e) > (now() at time zone 'America/Santiago') - interval '120 days'
    order by public.evento_inicio(e);
$$;

revoke all on function public.eventos_publicos() from public;
grant execute on function public.eventos_publicos() to anon, authenticated;

-- Carpeta pública para las fotos de los eventos (Storage → eventos)
do $$
begin
    if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
        insert into storage.buckets (id, name, public) values ('eventos', 'eventos', true)
        on conflict (id) do update set public = true;
    end if;
end;
$$;

-- Antes de guardar una inscripción (aunque dos personas se inscriban al mismo tiempo):
--   · la cantidad nunca es menor que el número de personas inscritas
--   · cupos y encargado se toman de la tabla "eventos" (lo que mande la web se ignora)
--   · si el evento ya empezó, terminó o no está publicado: INSCRIPCIONES_CERRADAS
--   · un invitado no puede inscribirse dos veces con el mismo correo al mismo evento (YA_INSCRITO)
--   · si no hay cupos se rechaza: CUPOS_AGOTADOS (lleno) o CUPOS_INSUFICIENTES (no caben todos)
create or replace function public.revisar_cupos()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
    ev       public.eventos;
    ocupados int;
begin
    new.cantidad := greatest(new.cantidad, coalesce(cardinality(new.personas), 0));

    select * into ev from public.eventos e where e.evento = new.evento;
    new.evento_cupos := nullif(ev.cupos, 0);
    new.evento_encargado := ev.encargado::text;

    if ev.evento is not null and (not ev.publicado or ev.finalizado or ev.fecha is null
        or (now() at time zone 'America/Santiago') >= public.evento_inicio(ev)) then
        raise exception 'INSCRIPCIONES_CERRADAS';
    end if;

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


-- 3. LISTAS PARA LA FUNDACIÓN ------------------------------------------------
-- Se ven en Supabase → Table Editor (no son públicas: solo el panel de Supabase las lee).
-- Para Excel: abrir la lista → botón "Export" → "Export to CSV".

-- Una fila por PERSONA inscrita (titular y cada acompañante por separado), ordenadas por evento.
-- Para ver un solo evento: filtro (Filter) por la columna "Evento".
drop view if exists public.inscritos_por_evento;
create view public.inscritos_por_evento
with (security_invoker = true) as
select
    coalesce(e.titulo, i.evento_titulo, i.evento)                       as "Evento",
    coalesce(to_char(e.fecha, 'DD-MM-YYYY'), i.evento_fecha)            as "Fecha",
    n.numero                                                            as "N°",
    coalesce(nullif(split_part(i.personas[n.numero], ' · ', 1), ''),
             case when n.numero = 1 then trim(i.nombre || ' ' || i.apellido)
                  else 'Acompañante ' || n.numero end)                  as "Nombre",
    nullif(split_part(i.personas[n.numero], ' · ', 2), '')              as "Relación",
    nullif(split_part(i.personas[n.numero], ' · ', 3), '')              as "Edad",
    trim(i.nombre || ' ' || i.apellido)                                 as "Inscrito por",
    i.correo                                                            as "Correo",
    i.telefono                                                          as "Teléfono",
    i.comuna                                                            as "Comuna",
    i.tipo                                                              as "Tipo",
    to_char(i.creado at time zone 'America/Santiago', 'DD-MM-YYYY HH24:MI') as "Inscrito el"
from public.inscripciones i
left join public.eventos e on e.evento = i.evento
cross join lateral generate_series(1, greatest(i.cantidad, coalesce(cardinality(i.personas), 0))) as n (numero)
order by e.fecha nulls last, i.evento, i.creado, n.numero;

revoke all on public.inscritos_por_evento from anon, authenticated;

-- Resumen: una fila por evento, con cuántas personas van y cuántos cupos quedan
drop view if exists public.resumen_eventos;
create view public.resumen_eventos
with (security_invoker = true) as
select
    e.titulo                                                  as "Evento",
    to_char(e.fecha, 'DD-MM-YYYY')                            as "Fecha",
    public.evento_estado(e)                                   as "Estado",
    count(i.id)                                               as "Inscripciones",
    coalesce(sum(i.cantidad), 0)                              as "Personas",
    nullif(e.cupos, 0)                                        as "Cupos",
    case when e.cupos > 0 then greatest(e.cupos - coalesce(sum(i.cantidad), 0), 0) end as "Quedan",
    e.encargado::text                                         as "Encargado"
from public.eventos e
left join public.inscripciones i on i.evento = e.evento
group by e.evento
order by e.fecha;

revoke all on public.resumen_eventos from anon, authenticated;
