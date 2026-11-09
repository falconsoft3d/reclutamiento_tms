// Chat de la entrevista del portal de reclutamiento (sin dependencias).
(function () {
    'use strict';

    const chat = document.querySelector('.rt-chat');
    if (!chat) {
        return;
    }
    const token = chat.dataset.token;
    const log = chat.querySelector('.rt-chat-log');
    const zonaInput = chat.querySelector('.rt-chat-input');
    const zonaError = chat.querySelector('.rt-chat-error');
    const progresoTxt = chat.querySelector('.rt-progreso-txt');
    const progresoBarra = chat.querySelector('.rt-progreso-barra div');
    let ocupado = false;

    async function rpc(ruta, params) {
        const respuesta = await fetch(`/reclutamiento_tms/entrevista/${token}/${ruta}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: params || {} }),
        });
        const data = await respuesta.json();
        if (data.error) {
            throw new Error((data.error.data && data.error.data.message) || data.error.message || 'Error');
        }
        return data.result;
    }

    function el(tag, clase, texto) {
        const nodo = document.createElement(tag);
        if (clase) {
            nodo.className = clase;
        }
        if (texto !== undefined) {
            nodo.textContent = texto;
        }
        return nodo;
    }

    function mostrarError(texto) {
        zonaError.textContent = texto || '';
        zonaError.hidden = !texto;
    }

    function renderMensajes(mensajes) {
        log.replaceChildren();
        for (const m of mensajes) {
            const burbuja = el('div', `rt-msg rt-msg-${m.rol}`, m.contenido);
            if (m.imagen) {
                const img = el('img');
                img.src = m.imagen;
                img.alt = 'Imagen de la pregunta';
                img.loading = 'lazy';
                img.addEventListener('click', () => window.open(m.imagen, '_blank', 'noopener'));
                burbuja.appendChild(img);
            }
            log.appendChild(burbuja);
        }
        log.scrollTop = log.scrollHeight;
    }

    function boton(texto, clase, onClick) {
        const b = el('button', `rt-btn ${clase || ''}`, texto);
        b.type = 'button';
        b.addEventListener('click', onClick);
        return b;
    }

    function renderInput(estado) {
        zonaInput.replaceChildren();
        const esperando = estado.esperando;
        if (estado.estado === 'terminada') {
            const fin = el('div', 'rt-chat-fin');
            if (estado.siguiente) {
                fin.appendChild(el('p', '', `Tenés otra entrevista pendiente: ${estado.siguiente.nombre}.`));
                const enlace = el('a', 'rt-btn', 'Continuar');
                enlace.href = estado.siguiente.url;
                fin.appendChild(enlace);
            } else {
                const enlace = el('a', 'rt-btn', 'Volver al inicio');
                enlace.href = '/reclutamiento_tms';
                fin.appendChild(enlace);
            }
            zonaInput.appendChild(fin);
            return;
        }
        if (!esperando) {
            return;
        }
        if (esperando.tipo === 'booleano') {
            zonaInput.append(
                boton('Sí', 'rt-opcion', () => enviar({ valor: 'si' })),
                boton('No', 'rt-opcion rt-btn-linea', () => enviar({ valor: 'no' })),
            );
        } else if (esperando.tipo === 'opciones') {
            for (const opcion of esperando.opciones) {
                zonaInput.appendChild(boton(opcion.name, 'rt-opcion rt-btn-linea', () => enviar({ opcion_id: opcion.id })));
            }
        } else if (esperando.tipo === 'calculo') {
            const grupo = el('div', 'rt-numero');
            const input = el('input');
            input.type = 'text';
            input.inputMode = 'decimal';
            input.placeholder = 'Escribí el resultado';
            input.maxLength = 30;
            grupo.appendChild(input);
            if (esperando.unidad) {
                grupo.appendChild(el('span', '', esperando.unidad));
            }
            const enviarNumero = () => input.value.trim() && enviar({ texto: input.value });
            input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { enviarNumero(); } });
            zonaInput.append(grupo, boton('Enviar', '', enviarNumero));
            input.focus();
        } else {
            const area = el('textarea');
            area.rows = 3;
            area.maxLength = 3000;
            area.placeholder = 'Escribí tu respuesta…';
            const enviarTexto = () => area.value.trim() && enviar({ texto: area.value });
            area.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
                    enviarTexto();
                }
            });
            zonaInput.append(area, boton('Enviar', '', enviarTexto));
            area.focus();
        }
    }

    function render(estado) {
        renderMensajes(estado.mensajes || []);
        const p = estado.progreso || { actual: 0, total: 0 };
        progresoTxt.textContent = p.total ? `Pregunta ${Math.max(p.actual, 1)} de ${p.total}` : '';
        progresoBarra.style.width = p.total ? `${Math.round((100 * (estado.estado === 'terminada' ? p.total : p.actual - 1)) / p.total)}%` : '0';
        renderInput(estado);
        mostrarError(estado.error);
    }

    async function enviar(params) {
        if (ocupado) {
            return;
        }
        ocupado = true;
        zonaInput.querySelectorAll('button, input, textarea').forEach((n) => { n.disabled = true; });
        log.appendChild(el('div', 'rt-msg rt-msg-bot rt-msg-escribiendo', 'Escribiendo…'));
        log.scrollTop = log.scrollHeight;
        try {
            render(await rpc('responder', params));
        } catch (error) {
            mostrarError('No pudimos enviar tu respuesta. Revisá tu conexión e intentá de nuevo.');
            log.lastChild.remove();
            zonaInput.querySelectorAll('button, input, textarea').forEach((n) => { n.disabled = false; });
        } finally {
            ocupado = false;
        }
    }

    rpc('estado', { iniciar: true })
        .then(render)
        .catch(() => mostrarError('No pudimos cargar la entrevista. Recargá la página.'));
})();
