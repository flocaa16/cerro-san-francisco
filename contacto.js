// Formulario "Contáctanos" del footer (todas las páginas).
// Envía el mensaje a api/contacto.php, que lo reenvía al correo configurado en cPanel.
(function () {
    const form = document.querySelector('#footerForm');
    if (!form) return;

    const aviso = form.querySelector('.footer-aviso');
    const boton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        aviso.textContent = '';
        aviso.classList.remove('footer-aviso--error');

        const nombre = form.querySelector('[name="nombre"]');
        const correo = form.querySelector('[name="correo"]');
        const mensaje = form.querySelector('[name="mensaje"]');
        let problema = '';
        if (!nombre.value.trim()) problema = 'Escribe tu nombre.';
        else if (!correo.value.trim() || !correo.checkValidity()) problema = 'Escribe un correo válido para poder responderte.';
        else if (!mensaje.value.trim()) problema = 'Escribe tu mensaje.';
        if (problema) {
            aviso.textContent = problema;
            aviso.classList.add('footer-aviso--error');
            return;
        }

        const datos = new FormData(form);
        datos.append('asunto', 'Mensaje desde la web');
        datos.append('pagina', window.location.href.split('#')[0]);

        boton.disabled = true;
        const texto = boton.textContent;
        boton.textContent = 'Enviando...';
        try {
            const respuesta = await fetch('api/contacto.php', { method: 'POST', body: datos });
            const resultado = await respuesta.json().catch(() => ({}));
            if (!respuesta.ok) throw new Error(resultado.mensaje || 'No se pudo enviar');
            form.reset();
            aviso.textContent = '¡Gracias! Recibimos tu mensaje y te responderemos pronto.';
        } catch (e) {
            aviso.textContent = e.message && e.message !== 'Failed to fetch' ? e.message :
                'No pudimos enviar tu mensaje. Inténtalo de nuevo o escríbenos a contacto@fundacionlepe.cl.';
            aviso.classList.add('footer-aviso--error');
        } finally {
            boton.disabled = false;
            boton.textContent = texto;
        }
    });
})();
