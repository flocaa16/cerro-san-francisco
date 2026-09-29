// Cuenta de Amigo del Cerro (compartida por amigos.html, perfil.html e inscripcion.html)
//
// OJO: GitHub Pages no tiene servidor, así que esto es una versión de prueba.
// Los datos se guardan solo en el navegador de cada persona (localStorage).
// Para cuentas reales hay que conectar un servicio como Firebase o Supabase.

const Cuenta = (function () {
    const CLAVE_SESION = 'amigosSesion';
    const CLAVE_REGISTRO = 'amigosRegistro';

    // Eventos que pueden aparecer en "Mis inscripciones"
    const eventos = {
        'aves': {
            titulo: 'Ruta de las Aves de San Felipe',
            fecha: 'Sábado 13 de junio',
            hora: '10 a 13 horas',
            finalizado: false
        },
        'nubes': {
            titulo: 'Caminata y Taller de observación e interpretación de nubes',
            fecha: 'Sábado 25 de julio',
            hora: '10 a 13 horas',
            finalizado: false
        },
        'reforestacion': {
            titulo: 'Jornada de reforestación comunitaria',
            fecha: 'Sábado 16 de mayo',
            hora: '10 a 13 horas',
            finalizado: true
        }
    };

    // Perfil de ejemplo (el del Figma) para cuando se inicia sesión sin haber creado cuenta
    function perfilDemo(correo) {
        return {
            nombre: 'María',
            apellido: 'González',
            correo: correo,
            telefono: '+56 9 1234 5678',
            comuna: 'San Felipe',
            nacimiento: '14/03/1992',
            personas: [
                { id: 1, nombre: 'Tomás', apellido: 'González', relacion: 'Hijo', nacimiento: '02/05/2016', correo: '', elegida: true },
                { id: 2, nombre: 'Ana', apellido: 'Pérez', relacion: 'Amiga', nacimiento: '08/11/1996', correo: '', elegida: false }
            ],
            inscripciones: [
                { evento: 'aves', personas: ['María González', 'Tomás González'] },
                { evento: 'nubes', personas: ['María González'] },
                { evento: 'reforestacion', personas: ['María González', 'Ana Pérez'] }
            ]
        };
    }

    // Lectura y escritura segura (el navegador puede bloquear el almacenamiento)
    function leer(almacen, clave) {
        try {
            return JSON.parse(almacen.getItem(clave));
        } catch (e) {
            return null;
        }
    }

    function escribir(almacen, clave, valor) {
        try {
            if (valor === null) almacen.removeItem(clave);
            else almacen.setItem(clave, JSON.stringify(valor));
        } catch (e) {
            // Sin almacenamiento: la sesión dura solo mientras la página esté abierta
        }
    }

    let memoria = null;

    // Devuelve la cuenta con sesión iniciada (o null)
    function obtener() {
        return memoria || leer(sessionStorage, CLAVE_SESION) || leer(localStorage, CLAVE_SESION);
    }

    // Guarda los cambios en la sesión y en el registro de cuentas creadas
    function guardar(cuenta) {
        memoria = cuenta;
        const almacen = leer(localStorage, CLAVE_SESION) ? localStorage : sessionStorage;
        escribir(almacen, CLAVE_SESION, cuenta);

        const registro = leer(localStorage, CLAVE_REGISTRO) || {};
        registro[cuenta.correo.toLowerCase()] = cuenta;
        escribir(localStorage, CLAVE_REGISTRO, registro);
    }

    // Inicia sesión: usa la cuenta creada con ese correo o, si no existe, el perfil de ejemplo
    function iniciar(correo, mantener) {
        const registro = leer(localStorage, CLAVE_REGISTRO) || {};
        const cuenta = registro[correo.toLowerCase()] || perfilDemo(correo);
        escribir(mantener ? localStorage : sessionStorage, CLAVE_SESION, cuenta);
        memoria = cuenta;
        return cuenta;
    }

    // ¿Ya se creó una cuenta con ese correo en este navegador?
    function existe(correo) {
        const registro = leer(localStorage, CLAVE_REGISTRO) || {};
        return Boolean(registro[correo.toLowerCase()]);
    }

    function crear(datos) {
        const cuenta = Object.assign({ personas: [], inscripciones: [] }, datos);
        escribir(sessionStorage, CLAVE_SESION, cuenta);
        memoria = cuenta;
        guardar(cuenta);
        return cuenta;
    }

    function cerrar() {
        memoria = null;
        escribir(sessionStorage, CLAVE_SESION, null);
        escribir(localStorage, CLAVE_SESION, null);
    }

    // Edad a partir de una fecha dd/mm/aaaa
    function edad(fecha) {
        const partes = (fecha || '').split('/').map(Number);
        if (partes.length !== 3 || !partes[2]) return null;
        const hoy = new Date();
        let anos = hoy.getFullYear() - partes[2];
        if (hoy.getMonth() + 1 < partes[1] || (hoy.getMonth() + 1 === partes[1] && hoy.getDate() < partes[0])) anos--;
        return anos;
    }

    // "Hijo · 10 años"
    function detalle(inicio, fecha) {
        const anos = edad(fecha);
        return anos === null ? inicio : inicio + ' · ' + anos + (anos === 1 ? ' año' : ' años');
    }

    return {
        eventos: eventos,
        obtener: obtener,
        guardar: guardar,
        iniciar: iniciar,
        crear: crear,
        existe: existe,
        cerrar: cerrar,
        edad: edad,
        detalle: detalle
    };
})();
