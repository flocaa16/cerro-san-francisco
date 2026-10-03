// Cuenta de Amigo del Cerro (compartida por amigos.html, perfil.html e inscripcion.html)
//
// Las cuentas y las inscripciones se guardan en Supabase (https://supabase.com).
// Necesita que la página cargue antes la librería:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// ⚙️ CONFIGURACIÓN: en Supabase → Project Settings → API (o "Connect")
// Pega la "Project URL" y la clave pública "anon" / "publishable".
// La clave pública SÍ puede ir en el código: los datos los protegen las reglas (RLS) de supabase.sql.
// ⚠️ NUNCA pegues aquí la clave "service_role" / "secret".
const SUPABASE_URL = 'https://oelpndfakeajbticouhl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1o_DMrEfSrUKAhocMOuApQ_UdgH479N';

const Cuenta = (function () {
    const CLAVE_MANTENER = 'amigosMantener';

    // Dirección base para los enlaces de los correos, siempre sin "www." (así coincide con las
    // Redirect URLs de Supabase y el enlace no termina en la portada)
    const BASE = window.location.href.replace('://www.', '://');
    const enlace = ruta => new URL(ruta, BASE).href;

    // Tipo de enlace con el que se abrió la página (Supabase lo agrega al final de la dirección):
    // 'signup' = confirmar cuenta, 'recovery' = nueva contraseña. Se lee antes de que Supabase lo borre.
    const datosEnlace = new URLSearchParams(window.location.hash.slice(1));
    const tipoEnlace = datosEnlace.get('type') || new URLSearchParams(window.location.search).get('type') || '';

    // Eventos: están en eventos.js (la página debe cargarlo antes que cuenta.js)
    const eventos = typeof EVENTOS !== 'undefined' ? EVENTOS : {};

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
        if (/permission denied|42501|row-level security/i.test(texto)) return new Error('No pudimos acceder a tu cuenta en este momento. Inténtalo más tarde o escríbenos a contacto@fundacionlepe.cl.');
        if (/failed to fetch|network/i.test(texto)) return new Error('No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.');
        // Error no previsto: se muestra el detalle técnico para poder revisarlo
        return new Error('Ocurrió un error. Inténtalo de nuevo o escríbenos a contacto@fundacionlepe.cl.' +
            (texto ? ' (Detalle: ' + texto + ')' : ''));
    }

    // Carga el perfil y las inscripciones del usuario con sesión iniciada
    async function cargar(usuario) {
        const [perfil, inscripciones] = await Promise.all([
            db.from('perfiles').select('*').eq('id', usuario.id).maybeSingle(),
            db.from('inscripciones').select('evento, personas, creado, evento_titulo, evento_fecha, evento_hora')
                .eq('user_id', usuario.id).order('creado', { ascending: false })
        ]);
        if (perfil.error) {
            console.error(perfil.error);
            throw traducir(perfil.error);
        }

        // Inscripciones a eventos que ya no están en eventos.js (se borraron o cambiaron de nombre):
        // se muestran como finalizados con los datos guardados al inscribirse
        (inscripciones.data || []).forEach(fila => {
            if (fila.evento && !eventos[fila.evento]) {
                eventos[fila.evento] = {
                    titulo: fila.evento_titulo || 'Evento anterior',
                    fecha: fila.evento_fecha || '',
                    fechaLarga: fila.evento_fecha || '',
                    hora: fila.evento_hora || '',
                    estado: 'Finalizado',
                    finalizado: true
                };
            }
        });

        // Datos guardados en el perfil; si faltan, se usan los que la persona escribió al crear la cuenta
        const datos = perfil.data || {};
        const registro = usuario.user_metadata || {};
        memoria = {
            id: usuario.id,
            nombre: datos.nombre || registro.nombre || registro.given_name || '',
            apellido: datos.apellido || registro.apellido || registro.family_name || '',
            correo: usuario.email,
            telefono: datos.telefono || registro.telefono || '',
            comuna: datos.comuna || registro.comuna || '',
            nacimiento: datos.nacimiento || registro.nacimiento || '',
            personas: Array.isArray(datos.personas) ? datos.personas : [],
            inscripciones: (inscripciones.data || []).map(fila => ({ evento: fila.evento, personas: fila.personas || [] })),
            google: (usuario.app_metadata && usuario.app_metadata.provider) === 'google'
        };

        // Si el perfil no existía o estaba incompleto, se guarda ahora con esos datos
        const incompleto = ['nombre', 'apellido', 'telefono', 'comuna', 'nacimiento']
            .some(clave => !datos[clave] && memoria[clave]);
        if (!perfil.data || incompleto) {
            guardar(memoria).catch(e => console.error('No se pudo completar el perfil', e));
        }
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
                    comuna: datos.comuna,
                    nacimiento: datos.nacimiento || ''
                },
                emailRedirectTo: enlace('amigos?confirmada=1')
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
            options: { redirectTo: enlace('perfil') }
        });
        if (error) throw traducir(error);
    }

    // Envía el correo para crear una nueva contraseña
    async function recuperar(correo) {
        if (!db) throw sinConexion();
        const { error } = await db.auth.resetPasswordForEmail(correo, {
            redirectTo: enlace('amigos?vista=nueva-clave')
        });
        if (error) throw traducir(error);
    }

    // Cambia la contraseña (después de abrir el enlace del correo)
    async function cambiarClave(clave) {
        if (!db) throw sinConexion();
        const { error } = await db.auth.updateUser({ password: clave });
        if (error) throw traducir(error);
    }

    // Guarda una inscripción a un evento (Amigo del Cerro o invitado).
    // "evento" trae título, fecha, hora y lugar: se guardan para el correo de confirmación.
    async function inscribir(idEvento, datos, evento) {
        if (!db) throw sinConexion();
        evento = evento || {};
        const fila = {
            evento: idEvento,
            evento_titulo: evento.titulo || null,
            evento_fecha: evento.fechaLarga || evento.fecha || null,
            evento_hora: evento.hora || null,
            evento_lugar: evento.lugar || null,
            evento_inicio: evento.inicio || null,
            evento_fin: evento.fin || null,
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
        tipoEnlace: tipoEnlace,
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
