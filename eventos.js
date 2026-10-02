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
    'taller-souvenir': {
        titulo: 'Primer Taller del Souvenir Comunitario: Curimón en tus manos',
        estado: 'Inscripciones abiertas',
        fecha: 'Jueves 8 octubre',
        fechaLarga: 'Jueves 8 de octubre',
        hora: 'Por confirmar',
        lugar: 'Parque Natural Cerro San Francisco',
        inicio: '2026-10-08T10:00',
        fin: '2026-10-08T13:00',
        img: 'img/visita-inmersiva.jpg',
        alt: 'Primer Taller del Souvenir Comunitario: Curimón en tus manos',
        finalizado: false,
        texto: [
            
        ],
    },
    'aves': {
        titulo: 'Recorrido: Ruta de las Aves Santuario Serranía el Ciprés',
        estado: 'Inscripciones abiertas',
        fecha: 'Sábado 10 octubre',
        fechaLarga: 'Sábado 10 de octubre',
        hora: 'Por confirmar',
        lugar: 'Parque Natural Cerro San Francisco',
        inicio: '2026-10-10T10:00',
        fin: '2026-10-10T13:00',
        img: 'img/evento-aves-2.jpg',
        alt: 'Recorrido: Ruta de las Aves Santuario Serranía el Ciprés',
        finalizado: false,
        // Texto pendiente: en el Figma solo está la descripción de la Ruta de las Aves
        texto: [
    
        ],
    },
    'caminata': {
        titulo: 'Caminata Muévete por tu Corazóna',
        estado: 'Inscripciones abiertas',
        fecha: 'Jueves 15 octubre',
        fechaLarga: 'Jueves 15 de octubre',
        hora: 'Por confirmar',
        lugar: 'Parque Natural Cerro San Francisco',
        inicio: '2026-10-15T10:00',
        fin: '2026-10-15T13:00',
        img: 'img/evento-caminata.jpg',
        alt: 'Caminata Muévete por tu Corazóna',
        finalizado: false,
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
