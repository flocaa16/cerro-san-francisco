// ============================================================================
// EVENTOS DEL CERRO SAN FRANCISCO — un solo lugar para todo el sitio
// ============================================================================
// Lo que cambies aquí se actualiza solo en:
//   · Inicio y Actividades ("Próximos eventos")
//   · La página de cada evento (inscripcion?evento=...)
//   · "Mis inscripciones" del perfil y el correo de confirmación
//
// CÓMO AGREGAR UN EVENTO: copia un bloque completo (desde 'aves': { hasta },),
// cámbiale el nombre corto (ej. 'otono') y sus datos. El nombre corto va en el link:
//   inscripcion?evento=otono
//
// LOS EVENTOS TERMINAN SOLOS: cuando pasa la fecha y hora de "fin", el evento
// deja de aparecer en "Próximos eventos", su etiqueta cambia a 'Finalizado' y ya
// no se puede inscribir. Se mantiene en "Mis inscripciones" de quienes se inscribieron.
// Para terminar uno antes de su fecha (ej. si se suspende), pon  finalizado: true.
//
// Campos:
//   titulo       nombre del evento
//   estado       texto de la etiqueta (ej. 'Inscripciones abiertas', 'Últimos cupos')
//   fecha        fecha corta para las tarjetas (ej. 'Sábado 13 junio')
//   fechaLarga   fecha con "de" para la página del evento (ej. 'Sábado 13 de junio')
//   hora         ej. '10 a 13 horas'
//   lugar        nombre del lugar, ej. 'Parque Natural Cerro San Francisco'
//   direccion    dirección para el mapa y el calendario, ej. 'Coronel Santiago Bueras 826, Curimón, San Felipe'
//   mapa         (opcional) link de Google Maps; si no se pone, se arma solo con la dirección
//   inscripcionExterna  (opcional) link a un formulario de otro sitio (Google Forms, Eventbrite...).
//                Si se pone, el botón "Inscribirme" abre ese link en una pestaña nueva en vez del
//                formulario del sitio. Esas inscripciones no quedan en Supabase ni cuentan cupos.
//
// CUPOS Y ENCARGADO: no van aquí (este archivo es público y cualquiera podría cambiarlo).
// Se configuran en Supabase → Table Editor → tabla "eventos", una fila por evento:
//   evento = el nombre corto de aquí (ej. 'aves') · cupos = máximo de personas (0 = sin límite)
//   encargado = nombre corto definido en config-cerro.php como 'NOMBRE_destino' (ej. 'aves')
// Cuando se llenan los cupos, la etiqueta cambia sola a "Inscripciones cerradas" y no se puede
// inscribir. No se muestra cuántos cupos quedan. Ver supabase/LEEME.md (sección 9).
//   inicio, fin  fecha y hora exactas para el calendario: 'AAAA-MM-DDTHH:MM'
//   img, alt     foto (carpeta img/) y su descripción para lectores de pantalla
//   finalizado   true o false
//   texto        párrafos de la página del evento (cada uno entre comillas, separados por coma)
// ============================================================================

const EVENTOS = {
    'taller-souvenir': {
        titulo: 'Primer Taller del Souvenir Comunitario: Curimón en tus manos',
        estado: 'Inscripciones abiertas',
        fecha: 'Jueves 8 octubre',
        fechaLarga: 'Jueves 8 de octubre',
        hora: '18:30',
        lugar: 'Sede Fundación Lepe (ex Casa López) Curimón',
        direccion: 'Coronel Santiago Bueras 826, Curimón, San Felipe',
        mapa: '',
        inicio: '2026-10-08T18:30',
        fin: '2026-10-08T19:30',
        img: 'img/visita-inmersiva.jpg',
        alt: 'Primer Taller del Souvenir Comunitario: Curimón en tus manos',
        finalizado: false,
        texto: ['¡Construyamos juntos un recuerdo de nuestra localidad!',
            'Te invitamos a participar del Taller para la creación del souvenir identitario curimonino “Curimón en tus manos”, una iniciativa para encontrarnos, compartir ideas y crear entre todos un souvenir que represente la identidad, historia y esencia de nuestro querido Curimón.',
            'Queremos que este recuerdo nazca de nuestra propia comunidad, de nuestras historias, lugares y de aquello que nos hace sentir parte de este territorio.'
        ],
    },
    'caminata': {
        titulo: 'Caminata Muévete por tu Corazón',
        estado: 'Inscripciones abiertas',
        fecha: 'Jueves 15 octubre',
        fechaLarga: 'Jueves 15 de octubre',
        hora: 'Por confirmar',
        lugar: 'Parque Natural Cerro San Francisco',
        direccion: 'Coronel Santiago Bueras 826, Curimón, San Felipe',
        mapa: '',
        inicio: '2026-10-15T10:00',
        fin: '2026-10-15T13:00',
        img: 'img/evento-caminata.jpg',
        alt: 'Caminata Muévete por tu Corazóna',
        finalizado: false,
        texto: []
    },
    'dia-cerros': {
        titulo: 'Día de los Cerros',
        estado: 'Inscripciones abiertas',
        fecha: 'Jueves 17 octubre',
        fechaLarga: 'Jueves 17 de octubre',
        hora: '19:00',
        lugar: 'Parque Natural Cerro San Francisco',
        direccion: 'Coronel Santiago Bueras 826, Curimón, San Felipe',
        mapa: '',
        inscripcionExterna: 'https://www.diadeloscerros.cl/inscripcion/?actividad=7293',
        inicio: '2026-10-17T19:00',
        fin: '2026-10-17T20:00',
        img: 'img/evento-caminata.jpg',
        alt: 'Día de los Cerros',
        finalizado: false,
        texto: ['Cine Bajo las Estrellas en el Cerro San Francisco de Curimón',
            'Nos uniremos a la sexta versión del Día de los Cerros organizada por Fundación Cerros Isla, con una actividad especial para disfrutar en familia: “Cine Bajo las Estrellas”, en el Cerro San Francisco de Curimón.',
            'La actividad es organizada por Fundación Lepe, en colaboración con la Oficina de Turismo de la Ilustre Municipalidad de San Felipe, y busca invitar a la comunidad a encontrarse y disfrutar de este hermoso espacio natural, esta vez compartiendo la película “Robot Salvaje” bajo el cielo de Curimón.',
            'Pero este encuentro también será una oportunidad para visibilizar y poner en valor las distintas actividades que podemos realizar en el cerro, como caminar, contemplar la naturaleza, compartir en familia y conocer su patrimonio natural y cultural, siempre desde el respeto, el cuidado y la protección de este importante espacio para nuestra comunidad.',
            'Queremos que el Cerro San Francisco siga siendo un lugar de encuentro, aprendizaje y conexión con la naturaleza, donde podamos disfrutarlo y, al mismo tiempo, asumir el compromiso de cuidarlo entre todos y todas.',
            'Porque disfrutar nuestros cerros también es aprender a protegerlos.']
    },
    'segundo-taller-souvenir': {
        titulo: 'Segundo Taller del Souvenir comunitario',
        estado: 'Inscripciones abiertas',
        fecha: 'Jueves 21 octubre',
        fechaLarga: 'Jueves 21 de octubre',
        hora: '18:30',
        lugar: 'Sede Fundación Lepe (ex Casa López) Curimón',
        direccion: 'Coronel Santiago Bueras 826, Curimón, San Felipe',
        mapa: '',
        inicio: '2026-10-21T18:30',
        fin: '2026-10-21T20:00',
        img: 'img/evento-caminata.jpg',
        alt: 'Segundo Taller del Souvenir comunitario',
        finalizado: false,
        texto: ['¡Construyamos juntos un recuerdo de nuestra localidad!',
            'Te invitamos a participar del Taller para la creación del souvenir identitario curimonino “Curimón en tus manos”, una iniciativa para encontrarnos, compartir ideas y crear entre todos un souvenir que represente la identidad, historia y esencia de nuestro querido Curimón.',
            'Queremos que este recuerdo nazca de nuestra propia comunidad, de nuestras historias, lugares y de aquello que nos hace sentir parte de este territorio.']
    },
    'bicitour-corrida': {
        titulo: 'Bicitour y corrida Ribera Sur',
        estado: 'Inscripciones abiertas',
        fecha: 'Jueves 24 octubre',
        fechaLarga: 'Jueves 24 de octubre',
        hora: '09:00',
        lugar: 'Capilla San José',
        direccion: 'Calle San Francisco 199, Curimón, San Felipe',
        mapa: '',
        inicio: '2026-10-24T09:00',
        fin: '2026-10-24T11:00',
        img: 'img/evento-caminata.jpg',
        alt: 'Bicitour y corrida Ribera Sur',
        finalizado: false,
        texto: ['En el marco de la Corrida Familiar 2026, Fundación Lepe y la Oficina de Turismo de la Ilustre Municipalidad de San Felipe, invitan a la comunidad a participar de un Bicitour Patrimonial, una experiencia que combina actividad física, turismo y el reconocimiento del patrimonio local.',
            'El recorrido comenzará en la Capilla San José, donde se realizará un relato introductorio sobre este espacio y su valor para la comunidad. Desde allí, las y los participantes iniciarán el recorrido en bicicleta, transitando por distintos caminos y sectores rurales de la comuna.',
            'La ruta continuará por el tramo de Calle Los Duraznos, para luego conectar con la carretera San Martín, recorriendo el tramo comprendido entre Río Blanco y Del Monte. Posteriormente, el grupo continuará hasta la Capilla de Bucalemu, donde se realizará una nueva instancia de relato y puesta en valor de este patrimonio local.',
            'El recorrido seguirá hasta Restaurante La Ruca, espacio donde se compartirá un último relato relacionado con el territorio y sus tradiciones, para finalmente continuar hasta el punto de llegada a la meta.',
            'Este Bicitour busca ofrecer una experiencia diferente para conocer, recorrer y valorar nuestro territorio sobre dos ruedas, poniendo en diálogo el patrimonio, la historia, la naturaleza y la vida comunitaria. Una invitación a descubrir San Felipe de una manera activa y cercana, promoviendo además el respeto y cuidado de los lugares que forman parte de nuestra identidad local.',
            'Pedaleamos juntos para conocer, disfrutar y poner en valor nuestro patrimonio.']
    }

};

// Marca como finalizados los eventos cuya hora de término ya pasó (hora de Chile del visitante)
Object.keys(EVENTOS).forEach(id => {
    const ev = EVENTOS[id];
    const fin = new Date(ev.fin);
    if (!ev.finalizado && !isNaN(fin) && fin < new Date()) ev.finalizado = true;
    if (ev.finalizado) ev.estado = 'Finalizado';
});

// Dirección y link al mapa de cada evento
Object.keys(EVENTOS).forEach(id => {
    const ev = EVENTOS[id];
    ev.direccion = ev.direccion || (ev.lugar ? ev.lugar + ', Curimón, San Felipe' : 'Curimón, San Felipe');
    ev.mapa = ev.mapa || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ev.direccion);
});

// ----------------------------------------------------------------------------
// CUPOS: se pregunta a Supabase si cada evento ya llenó sus cupos (tabla "eventos").
// Si se llenó: ev.agotado = true y la etiqueta pasa a "Inscripciones cerradas".
// EVENTOS_CUPOS es una promesa: las páginas esperan a que termine antes de usar los cupos.
// ----------------------------------------------------------------------------
const EVENTOS_CUPOS = (function () {
    const URL_SUPABASE = 'https://oelpndfakeajbticouhl.supabase.co';
    const CLAVE_PUBLICA = 'sb_publishable_1o_DMrEfSrUKAhocMOuApQ_UdgH479N';
    const ids = Object.keys(EVENTOS).filter(id => !EVENTOS[id].finalizado);
    if (!ids.length) return Promise.resolve();

    const consulta = fetch(URL_SUPABASE + '/rest/v1/rpc/eventos_cerrados', {
        method: 'POST',
        headers: { 'apikey': CLAVE_PUBLICA, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ids })
    })
        .then(respuesta => respuesta.ok ? respuesta.json() : [])
        .then(filas => {
            (filas || []).forEach(fila => {
                if (fila.cerrado && EVENTOS[fila.evento]) cerrarInscripciones(EVENTOS[fila.evento]);
            });
        })
        .catch(() => { }); // sin conexión: se muestra abierto y Supabase igual revisa los cupos al inscribir

    // Si Supabase tarda, la página no se queda esperando
    return Promise.race([consulta, new Promise(listo => setTimeout(listo, 3000))]);
})();

function cerrarInscripciones(ev) {
    ev.agotado = true;
    ev.estado = 'Inscripciones cerradas';
}

// ----------------------------------------------------------------------------
// "Próximos eventos": se dibujan solos en cualquier página que tenga
// <div class="eventos-list" data-lista-eventos="inicio">  (o "actividades")
// ----------------------------------------------------------------------------
(function () {
    function crear(etiqueta, clase, texto) {
        const el = document.createElement(etiqueta);
        if (clase) el.className = clase;
        if (texto !== undefined) el.textContent = texto;
        return el;
    }

    function dato(icono, texto) {
        const p = crear('p', 'evento-dato');
        const img = crear('img');
        img.src = 'icons/' + icono;
        img.alt = '';
        img.width = 24;
        img.height = 24;
        p.append(img, texto);
        return p;
    }

    function dibujarProximos() {
        document.querySelectorAll('[data-lista-eventos]').forEach(lista => {
            const desde = lista.dataset.listaEventos;
            const antesDe = lista.querySelector('.eventos-more');
            const proximos = Object.keys(EVENTOS).filter(id => !EVENTOS[id].finalizado);

            proximos.forEach((id, i) => {
                const ev = EVENTOS[id];
                const articulo = crear('article', 'evento' + (i % 2 ? ' evento--reverse' : ''));

                const tarjeta = crear('div', 'evento-card');
                const info = crear('div', 'evento-info');
                info.append(dato('calendar.svg', ev.fecha), dato('clock.svg', ev.hora), dato('lugar.svg', ev.lugar));
                const link = crear('a', 'btn-primary-medium', 'Ver más');
                link.href = 'inscripcion?evento=' + encodeURIComponent(id) + '&desde=' + desde;
                tarjeta.append(crear('span', 'chip', ev.estado), crear('h3', 'evento-title', ev.titulo), info, link);

                const foto = crear('div', 'evento-image');
                const img = crear('img');
                img.src = ev.img;
                img.alt = ev.alt || ev.titulo;
                img.loading = 'lazy';
                foto.append(img);

                articulo.append(tarjeta, foto);
                lista.insertBefore(articulo, antesDe);
            });

            if (!proximos.length) {
                lista.insertBefore(crear('p', 'eventos-vacio',
                    'Pronto anunciaremos nuevos eventos. ¡Síguenos en Instagram para enterarte!'), antesDe);
            }
        });
    }

    function iniciar() {
        EVENTOS_CUPOS.then(dibujarProximos);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
