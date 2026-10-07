// ============================================================================
// EVENTOS DEL CERRO SAN FRANCISCO
// ============================================================================
// Los eventos YA NO se escriben aquí: se crean y editan en Supabase → Table Editor →
// tabla "eventos" (ver supabase/LEEME.md, sección 9). Los cambios se ven en la web en 1 minuto.
//
// api/eventos.php los lee de Supabase y los entrega como  var EVENTOS = {...}
// (las páginas cargan api/eventos.php ANTES que este archivo).
// Este archivo solo hace lo común a todas las páginas:
//   · termina solos los eventos cuya hora de "fin" ya pasó (etiqueta 'Finalizado')
//   · arma la dirección y el link a Google Maps
//   · revisa si se llenaron los cupos ("Inscripciones cerradas")
//   · dibuja "Próximos eventos" en Inicio (3 próximos) y Actividades (todos)
// ============================================================================

var EVENTOS = window.EVENTOS || {};

// Marca como finalizados los eventos cuya hora de término ya pasó (hora de Chile del visitante)
Object.keys(EVENTOS).forEach(id => {
    const ev = EVENTOS[id];
    const fin = new Date(ev.fin);
    if (!ev.finalizado && !isNaN(fin) && fin < new Date()) ev.finalizado = true;
    if (ev.finalizado) ev.estado = 'Finalizado';
    else if (ev.cerrado) cerrarInscripciones(ev); // cupos llenos (según Supabase)
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

// Color de la etiqueta según el texto (Figma "Chip"):
//   verde = abiertas · rojo = cerradas/agotados · amarillo = pocos/últimos cupos
function claseEstado(estado) {
    if (/cerrad|agotad/i.test(estado || '')) return 'chip chip--cerrado';
    if (/pocos|últimos|ultimos/i.test(estado || '')) return 'chip chip--pocos';
    return 'chip';
}

function cerrarInscripciones(ev) {
    ev.agotado = true;
    ev.estado = 'Inscripciones cerradas';
}

// ----------------------------------------------------------------------------
// "Próximos eventos": se dibujan solos en cualquier página que tenga
// <div class="eventos-list" data-lista-eventos="inicio">  (o "actividades")
// Se ordenan por fecha. Con data-limite="3" se muestran solo los 3 próximos (así está en el Inicio).
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
            // Ordenados por fecha (el más cercano primero). Con data-limite="3" se muestran solo esos
            const limite = Number(lista.dataset.limite) || Infinity;
            const fecha = id => { const t = new Date(EVENTOS[id].inicio).getTime(); return isNaN(t) ? Infinity : t; };
            const proximos = Object.keys(EVENTOS)
                .filter(id => !EVENTOS[id].finalizado)
                .sort((a, b) => fecha(a) - fecha(b))
                .slice(0, limite);

            proximos.forEach((id, i) => {
                const ev = EVENTOS[id];
                const articulo = crear('article', 'evento' + (i % 2 ? ' evento--reverse' : ''));

                const tarjeta = crear('div', 'evento-card');
                const info = crear('div', 'evento-info');
                info.append(dato('calendar.svg', ev.fecha), dato('clock.svg', ev.hora), dato('lugar.svg', ev.lugar));
                const link = crear('a', 'btn-primary-medium', 'Ver más');
                link.href = 'inscripcion?evento=' + encodeURIComponent(id) + '&desde=' + desde;
                tarjeta.append(crear('span', claseEstado(ev.estado), ev.estado), crear('h3', 'evento-title', ev.titulo), info, link);

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
