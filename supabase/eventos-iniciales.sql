-- Eventos que estaban en eventos.js, para pasarlos a la tabla "eventos" de Supabase.
-- Cómo usarlo: Supabase → SQL Editor → pegar → Run (DESPUÉS de correr supabase.sql).
-- Si un evento ya tiene fila (por ejemplo, con cupos), se completan sus datos sin tocar cupos ni encargado.
-- Si ya editaste un evento en Table Editor (tiene título), no se sobrescribe.
insert into public.eventos (evento, titulo, fecha, hora_inicio, hora_fin, lugar, direccion, mapa,
                            imagen, imagen_alt, texto, inscripcion_externa, finalizado)
values
    ('taller-souvenir', 'Primer Taller del Souvenir Comunitario: Curimón en tus manos', '2026-10-08', '18:30', '19:30', 'Sede Fundación Lepe (ex Casa López)', 'Coronel Santiago Bueras 826, Curimón, San Felipe', null, 'img/visita-inmersiva.jpg', 'Primer Taller del Souvenir Comunitario: Curimón en tus manos', '¡Construyamos juntos un recuerdo de nuestra localidad!
Te invitamos a participar del Taller para la creación del souvenir identitario curimonino “Curimón en tus manos”, una iniciativa para encontrarnos, compartir ideas y crear entre todos un souvenir que represente la identidad, historia y esencia de nuestro querido Curimón.
Queremos que este recuerdo nazca de nuestra propia comunidad, de nuestras historias, lugares y de aquello que nos hace sentir parte de este territorio.', null, false),
    ('caminata', 'Caminata Muévete por tu Corazón', '2026-10-15', null, null, 'Parque Natural Cerro San Francisco', 'Coronel Santiago Bueras 826, Curimón, San Felipe', null, 'img/evento-caminata.jpg', 'Caminata Muévete por tu Corazón', null, null, false),
    ('dia-cerros', 'Día de los Cerros', '2026-10-17', '19:00', '20:00', 'Parque Natural Cerro San Francisco', 'Coronel Santiago Bueras 826, Curimón, San Felipe', null, 'img/evento-caminata.jpg', 'Día de los Cerros', 'Cine Bajo las Estrellas en el Cerro San Francisco de Curimón
Nos uniremos a la sexta versión del Día de los Cerros organizada por Fundación Cerros Isla, con una actividad especial para disfrutar en familia: “Cine Bajo las Estrellas”, en el Cerro San Francisco de Curimón.
La actividad es organizada por Fundación Lepe, en colaboración con la Oficina de Turismo de la Ilustre Municipalidad de San Felipe, y busca invitar a la comunidad a encontrarse y disfrutar de este hermoso espacio natural, esta vez compartiendo la película “Robot Salvaje” bajo el cielo de Curimón.
Pero este encuentro también será una oportunidad para visibilizar y poner en valor las distintas actividades que podemos realizar en el cerro, como caminar, contemplar la naturaleza, compartir en familia y conocer su patrimonio natural y cultural, siempre desde el respeto, el cuidado y la protección de este importante espacio para nuestra comunidad.
Queremos que el Cerro San Francisco siga siendo un lugar de encuentro, aprendizaje y conexión con la naturaleza, donde podamos disfrutarlo y, al mismo tiempo, asumir el compromiso de cuidarlo entre todos y todas.
Porque disfrutar nuestros cerros también es aprender a protegerlos.', 'https://www.diadeloscerros.cl/inscripcion/?actividad=7293', false),
    ('segundo-taller-souvenir', 'Segundo Taller del Souvenir comunitario', '2026-10-21', '18:30', '20:00', 'Sede Fundación Lepe (ex Casa López)', 'Coronel Santiago Bueras 826, Curimón, San Felipe', null, 'img/evento-caminata.jpg', 'Segundo Taller del Souvenir comunitario', '¡Construyamos juntos un recuerdo de nuestra localidad!
Te invitamos a participar del Taller para la creación del souvenir identitario curimonino “Curimón en tus manos”, una iniciativa para encontrarnos, compartir ideas y crear entre todos un souvenir que represente la identidad, historia y esencia de nuestro querido Curimón.
Queremos que este recuerdo nazca de nuestra propia comunidad, de nuestras historias, lugares y de aquello que nos hace sentir parte de este territorio.', null, false),
    ('bicitour-corrida', 'Bicitour y corrida Ribera Sur', '2026-10-24', '09:00', '11:00', 'Capilla San José', 'Calle San Francisco 199, Curimón, San Felipe', null, 'img/evento-caminata.jpg', 'Bicitour y corrida Ribera Sur', 'En el marco de la Corrida Familiar 2026, Fundación Lepe y la Oficina de Turismo de la Ilustre Municipalidad de San Felipe, invitan a la comunidad a participar de un Bicitour Patrimonial, una experiencia que combina actividad física, turismo y el reconocimiento del patrimonio local.
El recorrido comenzará en la Capilla San José, donde se realizará un relato introductorio sobre este espacio y su valor para la comunidad. Desde allí, las y los participantes iniciarán el recorrido en bicicleta, transitando por distintos caminos y sectores rurales de la comuna.
La ruta continuará por el tramo de Calle Los Duraznos, para luego conectar con la carretera San Martín, recorriendo el tramo comprendido entre Río Blanco y Del Monte. Posteriormente, el grupo continuará hasta la Capilla de Bucalemu, donde se realizará una nueva instancia de relato y puesta en valor de este patrimonio local.
El recorrido seguirá hasta Restaurante La Ruca, espacio donde se compartirá un último relato relacionado con el territorio y sus tradiciones, para finalmente continuar hasta el punto de llegada a la meta.
Este Bicitour busca ofrecer una experiencia diferente para conocer, recorrer y valorar nuestro territorio sobre dos ruedas, poniendo en diálogo el patrimonio, la historia, la naturaleza y la vida comunitaria. Una invitación a descubrir San Felipe de una manera activa y cercana, promoviendo además el respeto y cuidado de los lugares que forman parte de nuestra identidad local.
Pedaleamos juntos para conocer, disfrutar y poner en valor nuestro patrimonio.', null, false)
on conflict (evento) do update set
    titulo = excluded.titulo, fecha = excluded.fecha, hora_inicio = excluded.hora_inicio,
    hora_fin = excluded.hora_fin, lugar = excluded.lugar, direccion = excluded.direccion, mapa = excluded.mapa,
    imagen = excluded.imagen, imagen_alt = excluded.imagen_alt, texto = excluded.texto,
    inscripcion_externa = excluded.inscripcion_externa, finalizado = excluded.finalizado
where public.eventos.titulo is null;
