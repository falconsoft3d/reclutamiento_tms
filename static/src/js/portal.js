// Formulario de postulación: filas de referencias y envío único.
(function () {
    'use strict';

    const contenedor = document.querySelector('.rt-refs');
    const agregar = document.querySelector('.rt-ref-agregar');
    const MAX_REFERENCIAS = 20;

    function minimo() {
        return parseInt(contenedor.dataset.minimo || '0', 10);
    }

    function actualizarBotones() {
        const filas = contenedor.querySelectorAll('.rt-ref');
        filas.forEach((fila) => {
            fila.querySelector('.rt-ref-quitar').hidden = filas.length <= Math.max(minimo(), 1);
        });
        agregar.hidden = filas.length >= MAX_REFERENCIAS;
    }

    if (contenedor && agregar) {
        agregar.addEventListener('click', () => {
            const nueva = contenedor.querySelector('.rt-ref').cloneNode(true);
            nueva.querySelectorAll('input').forEach((input) => { input.value = ''; });
            contenedor.appendChild(nueva);
            nueva.querySelector('input').focus();
            actualizarBotones();
        });
        contenedor.addEventListener('click', (ev) => {
            const boton = ev.target.closest('.rt-ref-quitar');
            if (boton) {
                boton.closest('.rt-ref').remove();
                actualizarBotones();
            }
        });
        actualizarBotones();
    }

    // Muestra el nombre del archivo elegido.
    document.querySelectorAll('.rt-archivo input[type=file]').forEach((input) => {
        input.addEventListener('change', () => {
            const texto = input.parentElement.querySelector('.rt-archivo-txt');
            if (texto && input.files.length) {
                texto.textContent = input.files[0].name;
            }
        });
    });

    // Evita el doble envío.
    const form = document.querySelector('.rt-form');
    if (form) {
        form.addEventListener('submit', () => {
            const boton = form.querySelector('button[type=submit]');
            boton.disabled = true;
            boton.textContent = 'Enviando…';
        });
    }
})();
