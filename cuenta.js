// Cuenta de Amigo del Cerro (compartida por amigos.html, perfil.html e inscripcion.html)
//
// Las cuentas y las inscripciones se guardan en Supabase (https://supabase.com).
// Necesita que la página cargue antes la librería:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// ⚙️ CONFIGURACIÓN: en Supabase → Project Settings → API (o "Connect")
// Pega la "Project URL" y la clave pública "anon" / "publishable".
// La clave pública SÍ puede ir en el código: los datos los protegen las reglas (RLS) de supabase.sql.
// ⚠️ NUNCA pegues aquí la clave "service_role" / "secret".
const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

const Cuenta = (function () {
    const CLAVE_MANTENER = 'amigosMantener';

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

    // Lectura y escritura segura (el navegador puede bloquear el almacenamiento)
    function intentar(fn) {
        try { return fn(); } catch (e) { return null; }
    }

    // "Mantener sesión iniciada": si está marcado, la sesión queda en localStorage;
    // si no, en sessionStorage (se borra al cerrar el navegador)
    function mantener() {
        return intentar(() => localStorage.getItem(CLAVE_MANTENER)) !== 'no';
    }

    const almacen = {
        getItem: (k) => intentar(() => localStorage.getItem(k)) || intentar(() => sessionStorage.getItem(k)),
        setItem: (k, v) => intentar(() => (mantener() ? localStorage : sessionStorage).setItem(k, v)),
        removeItem: (k) => {
            intentar(() => localStorage.removeItem(k));
            intentar(() => sessionStorage.removeItem(k));
        }
    };

    const configurado = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
    if (!configurado) {
        console.error('Amigos del Cerro: falta configurar SUPABASE_URL y SUPABASE_ANON_KEY en cuenta.js, ' +
            'o no cargó la librería de Supabase.');
    }

    const db = configurado
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { storage: almacen, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        })
        : null;

    let memoria = null;

    function sinConexion() {
        return new Error('El sistema de cuentas no está disponible en este momento. Inténtalo más tarde.');
    }

    // Traduce los errores de Supabase a mensajes para el usuario
    function traducir(error) {
        const texto = (error && (error.message || error.code)) || '';
        if (/invalid login credentials/i.test(texto)) return new Error('El correo o la contraseña no son correctos.');
        if (/email not confirmed/i.test(texto)) return new Error('Primero confirma tu cuenta con el enlace que te enviamos por correo.');
        if (/already registered|already exists/i.test(texto)) return new Error('Ya existe una cuenta con ese correo. Inicia sesión.');
        if (/password should be|weak/i.test(texto)) return new Error('La contraseña debe tener al menos 6 caracteres.');
        if (/rate limit|too many/i.test(texto)) return new Error('Hiciste muchos intentos seguidos. Espera unos minutos e inténtalo de nuevo.');
        if (/session missing|not authenticated|expired/i.test(texto)) return new Error('El enlace expiró. Pide uno nuevo con "¿Olvidaste tu contraseña?".');
        if (/failed to fetch|network/i.test(texto)) return new Error('No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.');
        return new Error('Ocurrió un error. Inténtalo de nuevo o escríbenos a contacto@fundacionlepe.cl.');
    }

    // Carga el perfil y las inscripciones del usuario con sesión iniciada
    async function cargar(usuario) {
        const [perfil, inscripciones] = await Promise.all([
            db.from('perfiles').select('*').eq('id', usuario.id).maybeSingle(),
            db.from('inscripciones').select('evento, personas, creado')
                .eq('user_id', usuario.id).order('creado', { ascending: false })
        ]);
        if (perfil.error) throw perfil.error;

        const datos = perfil.data || {};
        memoria = {
            id: usuario.id,
            nombre: datos.nombre || '',
            apellido: datos.apellido || '',
            correo: usuario.email,
            telefono: datos.telefono || '',
            comuna: datos.comuna || '',
            nacimiento: datos.nacimiento || '',
            personas: Array.isArray(datos.personas) ? datos.personas : [],
            inscripciones: (inscripciones.data || []).map(fila => ({ evento: fila.evento, personas: fila.personas || [] })),
            google: (usuario.app_metadata && usuario.app_metadata.provider) === 'google'
        };
        return memoria;
    }

    // Promesa que se resuelve con la cuenta con sesión iniciada (o null).
    // Uso: Cuenta.listo.then(cuenta => { ... })
    const listo = (async function () {
        if (!db) return null;
        try {
            const { data } = await db.auth.getSession();
            return data.session ? await cargar(data.session.user) : null;
        } catch (e) {
            console.error(e);
            return null;
        }
    })();

    // Devuelve la cuenta ya cargada (usar después de Cuenta.listo)
    function obtener() {
        return memoria;
    }

    // Guarda los datos del perfil y las personas guardadas
    async function guardar(cuenta) {
        if (!db) throw sinConexion();
        memoria = cuenta;
        const { error } = await db.from('perfiles').upsert({
            id: cuenta.id,
            nombre: cuenta.nombre,
            apellido: cuenta.apellido,
            correo: cuenta.correo,
            telefono: cuenta.telefono,
            comuna: cuenta.comuna,
            nacimiento: cuenta.nacimiento,
            personas: cuenta.personas
        });
        if (error) {
            console.error(error);
            throw traducir(error);
        }
    }

    // Inicia sesión con correo y contraseña
    async function iniciar(correo, clave, mantenerSesion) {
        if (!db) throw sinConexion();
        intentar(() => localStorage.setItem(CLAVE_MANTENER, mantenerSesion ? 'si' : 'no'));
        const { data, error } = await db.auth.signInWithPassword({ email: correo, password: clave });
        if (error) throw traducir(error);
        return cargar(data.user);
    }

    // Crea la cuenta. Devuelve { cuenta, confirmar }:
    // confirmar = true si Supabase pide confirmar el correo antes de entrar
    async function crear(datos, clave) {
        if (!db) throw sinConexion();
        intentar(() => localStorage.setItem(CLAVE_MANTENER, 'si'));
        const { data, error } = await db.auth.signUp({
            email: datos.correo,
            password: clave,
            options: {
                // Estos datos los usa supabase.sql para crear el perfil
                data: {
                    nombre: datos.nombre,
                    apellido: datos.apellido,
                    telefono: datos.telefono,
                    comuna: datos.comuna
                },
                emailRedirectTo: new URL('perfil', window.location.href).href
            }
        });
        if (error) throw traducir(error);

        // Si el correo ya existía, Supabase no avisa con error pero devuelve un usuario sin identidades
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
            throw new Error('Ya existe una cuenta con ese correo. Inicia sesión.');
        }
        if (!data.session) return { cuenta: null, confirmar: true };
        return { cuenta: await cargar(data.user), confirmar: false };
    }

    // Iniciar sesión o crear la cuenta con Google (se configura en Supabase → Authentication → Providers)
    async function conGoogle() {
        if (!db) throw sinConexion();
        intentar(() => localStorage.setItem(CLAVE_MANTENER, 'si'));
        const { error } = await db.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: new URL('perfil', window.location.href).href }
        });
        if (error) throw traducir(error);
    }

    // Envía el correo para crear una nueva contraseña
    async function recuperar(correo) {
        if (!db) throw sinConexion();
        const { error } = await db.auth.resetPasswordForEmail(correo, {
            redirectTo: new URL('amigos?vista=nueva-clave', window.location.href).href
        });
        if (error) throw traducir(error);
    }

    // Cambia la contraseña (después de abrir el enlace del correo)
    async function cambiarClave(clave) {
        if (!db) throw sinConexion();
        const { error } = await db.auth.updateUser({ password: clave });
        if (error) throw traducir(error);
    }

    // Guarda una inscripción a un evento (Amigo del Cerro o invitado)
    async function inscribir(idEvento, datos) {
        if (!db) throw sinConexion();
        const fila = {
            evento: idEvento,
            tipo: datos.tipo,
            nombre: datos.nombre,
            apellido: datos.apellido,
            correo: datos.correo,
            telefono: datos.telefono,
            comuna: datos.comuna || (memoria && memoria.comuna) || null,
            personas: datos.listaPersonas || [],
            cantidad: datos.cantidad || 1,
            crear_cuenta: datos.crearCuenta === 'Sí'
        };

        if (memoria) {
            // Un Amigo del Cerro tiene una sola inscripción por evento: se reemplaza la anterior
            fila.user_id = memoria.id;
            await db.from('inscripciones').delete().eq('user_id', memoria.id).eq('evento', idEvento);
        }

        // Sin .select(): los invitados pueden inscribirse pero no leer la tabla
        const { error } = await db.from('inscripciones').insert(fila);
        if (error) {
            console.error(error);
            throw traducir(error);
        }
    }

    async function cancelarInscripcion(idEvento) {
        if (!db || !memoria) throw sinConexion();
        const { error } = await db.from('inscripciones').delete().eq('user_id', memoria.id).eq('evento', idEvento);
        if (error) throw traducir(error);
    }

    async function cerrar() {
        memoria = null;
        if (db) await db.auth.signOut().catch(() => { });
        almacen.removeItem(CLAVE_MANTENER);
    }

    // Avisa cuando el usuario abre el enlace para cambiar la contraseña
    function alRecuperar(funcion) {
        if (!db) return;
        db.auth.onAuthStateChange((evento) => {
            if (evento === 'PASSWORD_RECOVERY') funcion();
        });
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
        listo: listo,
        obtener: obtener,
        guardar: guardar,
        iniciar: iniciar,
        crear: crear,
        conGoogle: conGoogle,
        recuperar: recuperar,
        cambiarClave: cambiarClave,
        alRecuperar: alRecuperar,
        inscribir: inscribir,
        cancelarInscripcion: cancelarInscripcion,
        cerrar: cerrar,
        edad: edad,
        detalle: detalle
    };
})();
