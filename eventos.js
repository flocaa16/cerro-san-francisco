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
// CÓMO TERMINAR UN EVENTO: cambia  finalizado: false  por  finalizado: true
// y  estado  por 'Finalizado'. Deja de aparecer en "Próximos eventos", pero se
// mantiene en "Mis inscripciones" de quienes se inscribieron.
//
// Campos:
//   titulo       nombre del evento
//   estado       texto de la etiqueta (ej. 'Inscripciones abiertas', 'Últimos cupos')
//   fecha        fecha corta para las tarjetas (ej. 'Sábado 13 junio')
//   fechaLarga   fecha con "de" para la página del evento (ej. 'Sábado 13 de junio')
//   hora         ej. '10 a 13 horas'
//   lugar        ej. 'Parque Natural Cerro San Francisco'
//   inicio, fin  fecha y hora exactas para el calendario: 'AAAA-MM-DDTHH:MM'
//   img, alt     foto (carpeta img/) y su descripción para lectores de pantalla
//   finalizado   true o false
//   texto        párrafos de la página del evento (cada uno entre comillas, separados por coma)
// ============================================================================

const EVENTOS = {
    'aves': {
        titulo: 'Ruta de las Aves de San Felipe',
        estado: 'Inscripciones abiertas',
        fecha: 'Sábado 13 junio',
        fechaLarga: 'Sábado 13 de junio',
        hora: '10 a 13 horas',
        lugar: 'Parque Natural Cerro San Francisco',
        inicio: '2026-06-13T10:00',
        fin: '2026-06-13T13:00',
        img: 'img/evento-aves.jpg',
        alt: 'Ruta de las Aves de San Felipe',
        finalizado: false,
        texto: [
            '¿Te gustaría aprender a reconocer las aves que habitan cerca nuestro?',
            'Este sábado 13 de junio te invitamos a una caminata guiada por el Parque Natural Cerro San Francisco de Curimón, donde recorreremos senderos, observaremos aves y descubriremos más sobre la biodiversidad del Valle del Aconcagua.',
            'Además, podrás obtener tu Minipasaporte de la Ruta de las Aves e ir reuniendo timbres para acceder a premios y beneficios en distintos espacios del Valle.'
        ],
    },
    'nubes': {
        titulo: 'Caminata y Taller de observación e interpretación de nubes',
        estado: 'Inscripciones abiertas',
        fecha: 'Sábado 25 julio',
        fechaLarga: 'Sábado 25 de julio',
        hora: '10 a 13 horas',
        lugar: 'Parque Natural Cerro San Francisco',
        inicio: '2026-07-25T10:00',
        fin: '2026-07-25T13:00',
        img: 'img/evento-nubes.jpg',
        alt: 'Caminata y taller de observación de nubes',
        finalizado: false,
        // Texto pendiente: en el Figma solo está la descripción de la Ruta de las Aves
        texto: [
            'Durante el recorrido por el cerro, los participantes aprenderán a reconocer distintos tipos de nubes, comprender cómo se originan la lluvia y las tormentas, y descubrir la estrecha relación que existe entre la atmósfera, el clima y el paisaje que nos rodea.',
            'La actividad permitirá acercarse a estos fenómenos desde la observación directa y comprender que mirar con atención nuestro entorno también es una forma de conocer y conectarnos con el territorio.'
        ],
    },
    'reforestacion': {
        titulo: 'Jornada de reforestación comunitaria',
        estado: 'Finalizado',
        fecha: 'Sábado 16 mayo',
        fechaLarga: 'Sábado 16 de mayo',
        hora: '10 a 13 horas',
        lugar: 'Parque Natural Cerro San Francisco',
        inicio: '2026-05-16T10:00',
        fin: '2026-05-16T13:00',
        img: 'img/tl-regeneracion-2023.jpg',
        alt: 'Jornada de reforestación en el cerro',
        finalizado: true,
        texto: []
    }
};

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
                info.append(dato('calendar.svg', ev.fecha), dato('clock.svg', ev.hora));
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

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dibujarProximos);
    else dibujarProximos();
})();
