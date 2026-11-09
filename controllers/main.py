import base64
import logging
import re

from odoo import _, fields, http
from odoo.exceptions import UserError
from odoo.http import request
from odoo.tools.mimetypes import guess_mimetype

from ..models.reclutamiento_lista_negra import normalizar_documento, normalizar_email

_logger = logging.getLogger(__name__)

MAX_ARCHIVO = 10 * 1024 * 1024  # 10 MB
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
MIME_CV = {
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}
MIME_DOCUMENTO = MIME_CV | {'image/jpeg', 'image/png', 'image/webp'}
MAX_TEXTO = 2000


class ReclutamientoPortal(http.Controller):

    # -------------------------------------------------------------------------
    # AYUDANTES
    # -------------------------------------------------------------------------
    def _company(self):
        return request.env.company.sudo()

    def _vacantes_publicas(self):
        hoy = fields.Date.context_today(request.env.user)
        return request.env['reclutamiento.vacante'].sudo().search([
            ('estado', '=', 'publicada'), ('interna', '=', False),
            '|', ('fecha_cierre', '=', False), ('fecha_cierre', '>=', hoy),
        ])

    def _vacante_publica(self, vacante_id):
        vacante = request.env['reclutamiento.vacante'].sudo().browse(vacante_id).exists()
        if not vacante or vacante.interna or not vacante._esta_abierta():
            return None
        return vacante

    def _noticias(self, limit=None):
        return request.env['reclutamiento.noticia'].sudo().search([('publicada', '=', True)], limit=limit)

    def _render(self, template, values):
        values.setdefault('company', self._company())
        values.setdefault('hay_noticias', bool(self._noticias(limit=1)))
        values.setdefault('anio', fields.Date.today().year)
        return request.render(template, values)

    def _leer_archivo(self, archivo, permitidos):
        """Devuelve ``(base64, nombre, error)`` de un archivo subido validando tamaño y tipo real."""
        if not archivo or not archivo.filename:
            return False, False, None
        datos = archivo.read(MAX_ARCHIVO + 1)
        if len(datos) > MAX_ARCHIVO:
            return False, False, _('"%s" supera los 10 MB.', archivo.filename)
        mime = guess_mimetype(datos, default='application/octet-stream')
        if mime not in permitidos:
            return False, False, _('"%s" no tiene un formato permitido.', archivo.filename)
        return base64.b64encode(datos), archivo.filename[:200], None

    # -------------------------------------------------------------------------
    # PORTADA, VACANTES Y NOTICIAS
    # -------------------------------------------------------------------------
    @http.route('/reclutamiento_tms', type='http', auth='public', methods=['GET'], sitemap=True)
    def inicio(self, **kw):
        return self._render('reclutamiento_tms.portal_inicio', {
            'vacantes': self._vacantes_publicas(),
            'noticias': self._noticias(limit=3),
            'seccion': 'inicio',
        })

    @http.route('/reclutamiento_tms/<int:vacante_id>', type='http', auth='public', methods=['GET'], sitemap=False)
    def vacante(self, vacante_id, **kw):
        vacante = self._vacante_publica(vacante_id)
        if not vacante:
            return self._render('reclutamiento_tms.portal_vacante_cerrada', {'seccion': 'vacantes'})
        return self._render_formulario(vacante)

    def _render_formulario(self, vacante, errores=None, valores=None, referencias=None, multi=None):
        minimo = max(vacante.referencias_minimas, 0)
        referencias = referencias or [{} for _i in range(max(minimo, 1))]
        plantilla = vacante.plantilla_datos_id
        return self._render('reclutamiento_tms.portal_vacante', {
            'vacante': vacante,
            'grupos': plantilla._lineas_por_categoria() if plantilla else [],
            'errores': errores or [],
            'valores': valores or {},
            'multi': multi or {},
            'referencias': referencias,
            'referencias_minimas': minimo,
            'seccion': 'vacantes',
        })

    @http.route('/reclutamiento_tms/noticias', type='http', auth='public', methods=['GET'], sitemap=True)
    def noticias(self, **kw):
        return self._render('reclutamiento_tms.portal_noticias', {
            'noticias': self._noticias(), 'seccion': 'noticias',
        })

    @http.route('/reclutamiento_tms/noticias/<int:noticia_id>', type='http', auth='public', methods=['GET'],
                sitemap=False)
    def noticia(self, noticia_id, **kw):
        noticia = request.env['reclutamiento.noticia'].sudo().browse(noticia_id).exists()
        if not noticia or not noticia.publicada:
            raise request.not_found()
        return self._render('reclutamiento_tms.portal_noticia', {
            'noticia': noticia,
            'vacante_abierta': noticia.vacante_id if noticia.vacante_id and not noticia.vacante_id.interna
            and noticia.vacante_id._esta_abierta() else False,
            'otras': self._noticias(limit=4) - noticia,
            'seccion': 'noticias',
        })

    @http.route('/reclutamiento_tms/noticias/<int:noticia_id>/imagen', type='http', auth='public', methods=['GET'],
                sitemap=False)
    def noticia_imagen(self, noticia_id, **kw):
        noticia = request.env['reclutamiento.noticia'].sudo().browse(noticia_id).exists()
        if not noticia or not noticia.publicada or not noticia.imagen:
            raise request.not_found()
        return self._imagen(noticia.imagen)

    def _imagen(self, imagen_b64):
        datos = base64.b64decode(imagen_b64)
        return request.make_response(datos, headers=[
            ('Content-Type', guess_mimetype(datos, default='image/png')),
            ('Cache-Control', 'public, max-age=3600'),
        ])

    # -------------------------------------------------------------------------
    # POSTULACIÓN
    # -------------------------------------------------------------------------
    @http.route('/reclutamiento_tms/<int:vacante_id>/postular', type='http', auth='public', methods=['POST'],
                sitemap=False)
    def postular(self, vacante_id, **post):
        vacante = self._vacante_publica(vacante_id)
        if not vacante:
            return self._render('reclutamiento_tms.portal_vacante_cerrada', {'seccion': 'vacantes'})
        if post.get('sitio_web'):  # trampa para bots: campo oculto que un humano no completa
            return request.redirect('/reclutamiento_tms')

        form = request.httprequest.form
        archivos = request.httprequest.files
        errores = []
        valores = {k: (v or '').strip()[:MAX_TEXTO] for k, v in post.items() if isinstance(v, str)}

        # Datos personales
        etiquetas = {
            'nombre': _('Nombre'), 'apellido': _('Apellido'), 'email': _('Email'),
            'telefono': _('Teléfono'), 'documento': _('DNI / CUIT / CUIL'), 'ubicacion': _('Ubicación'),
        }
        for campo in ('nombre', 'apellido', 'email', 'telefono', 'documento'):
            if not valores.get(campo):
                errores.append(_('Completá el campo %s.', etiquetas[campo]))
        if valores.get('email') and not EMAIL_RE.match(valores['email']):
            errores.append(_('El email no es válido.'))

        # CV
        cv, cv_nombre, error = self._leer_archivo(archivos.get('cv'), MIME_CV)
        if error:
            errores.append(error)
        elif not cv:
            errores.append(_('Adjuntá tu Currículum Vitae (PDF o DOCX).'))

        # Referencias
        columnas = ('ref_empresa', 'ref_contacto', 'ref_cargo', 'ref_telefono', 'ref_email')
        filas = list(zip(*(form.getlist(c) for c in columnas)))
        referencias_form = [
            dict(zip(('empresa', 'contacto', 'cargo', 'telefono', 'email'), (v.strip()[:200] for v in fila)))
            for fila in filas
        ][:20]
        referencias = [
            r for r in referencias_form if r['empresa'] and r['contacto'] and (r['telefono'] or r['email'])
        ]
        if len(referencias) < vacante.referencias_minimas:
            errores.append(_('Cargá al menos %(min)s referencias laborales completas (empresa, contacto y teléfono '
                             'o email). Completas: %(n)s.', min=vacante.referencias_minimas, n=len(referencias)))

        # Campos dinámicos de la plantilla del cargo
        respuestas = []
        for linea in vacante.plantilla_datos_id.linea_ids:
            clave = f'campo_{linea.id}'
            vals = {'linea_id': linea.id}
            if linea.tipo in ('texto', 'texto_largo'):
                vals['valor_texto'] = valores.get(clave) or False
                vacio = not vals['valor_texto']
            elif linea.tipo == 'booleano':
                vals['valor_bool'] = valores.get(clave) == 'si'
                vacio = valores.get(clave) not in ('si', 'no')
            elif linea.tipo in ('seleccion', 'multiple'):
                elegidas = {int(v) for v in form.getlist(clave) if v.isdigit()}
                opciones = linea.opcion_ids.filtered(lambda o: o.id in elegidas)
                if linea.tipo == 'seleccion':
                    opciones = opciones[:1]
                vals['opcion_ids'] = [fields.Command.set(opciones.ids)]
                vacio = not opciones
            else:
                datos, nombre, error = self._leer_archivo(archivos.get(clave), MIME_DOCUMENTO)
                if error:
                    errores.append(error)
                vals.update({'adjunto': datos, 'adjunto_nombre': nombre})
                vacio = not datos
            if linea.requerido and vacio:
                errores.append(_('Completá "%s".', linea.name))
            respuestas.append(fields.Command.create(vals))

        Postulacion = request.env['reclutamiento.postulacion'].sudo()
        if not errores:
            dominio = [('vacante_id', '=', vacante.id), ('etapa_codigo', 'not in', ('rechazado',))]
            documento = normalizar_documento(valores.get('documento'))
            repetida = Postulacion.search(dominio + [
                '|', ('postulante_id.documento_norm', '=', documento or '-'),
                ('postulante_id.email_norm', '=', normalizar_email(valores.get('email')) or '-'),
            ], limit=1)
            if repetida:
                errores.append(_('Ya recibimos una postulación tuya para esta búsqueda.'))

        if errores:
            if cv or any(archivos.get(k) and archivos[k].filename for k in archivos):
                errores.append(_('Por seguridad tenés que volver a adjuntar los archivos.'))
            multi = {k: form.getlist(k) for k in form if k.startswith('campo_')}
            return self._render_formulario(vacante, errores, valores, referencias_form or None, multi)

        postulante = request.env['reclutamiento.postulante'].sudo()._buscar_o_crear({
            k: valores.get(k) or False for k in ('nombre', 'apellido', 'email', 'telefono', 'documento', 'ubicacion')
        })
        postulacion = Postulacion.create({
            'postulante_id': postulante.id,
            'vacante_id': vacante.id,
            'origen': 'portal',
            'cv': cv,
            'cv_filename': cv_nombre,
            'referencia_ids': [fields.Command.create(r) for r in referencias],
            'respuesta_ids': respuestas,
        })
        if postulacion._verificar_lista_negra():
            # No se avisa al postulante: ve el agradecimiento normal, sin entrevista.
            postulacion.entrevista_ids.write({'habilitada': False})
            return request.redirect(f'/reclutamiento_tms/gracias/{postulacion.access_token}')

        try:
            request.env.ref('reclutamiento_tms.mail_template_postulacion_recibida').sudo().send_mail(postulacion.id)
        except Exception:  # noqa: BLE001 - un problema de correo no debe perder la postulación
            _logger.exception('Reclutamiento: no se pudo enviar el email de %s', postulacion.name)
        entrevista = postulacion._primera_entrevista_habilitada()
        if entrevista:
            return request.redirect(f'/reclutamiento_tms/entrevista/{entrevista.access_token}')
        postulacion._encolar_evaluacion()
        return request.redirect(f'/reclutamiento_tms/gracias/{postulacion.access_token}')

    @http.route('/reclutamiento_tms/gracias/<string:token>', type='http', auth='public', methods=['GET'],
                sitemap=False)
    def gracias(self, token, **kw):
        postulacion = request.env['reclutamiento.postulacion'].sudo().search([('access_token', '=', token)], limit=1)
        if not postulacion:
            raise request.not_found()
        return self._render('reclutamiento_tms.portal_gracias', {
            'postulacion': postulacion,
            'entrevista': False if postulacion.lista_negra else postulacion._primera_entrevista_habilitada(),
            'seccion': 'vacantes',
        })

    # -------------------------------------------------------------------------
    # ENTREVISTA (CHAT)
    # -------------------------------------------------------------------------
    def _entrevista(self, token):
        entrevista = request.env['reclutamiento.entrevista'].sudo().search([('access_token', '=', token)], limit=1)
        if not entrevista or not entrevista.habilitada or entrevista.postulacion_id.lista_negra:
            return None
        return entrevista

    @http.route('/reclutamiento_tms/entrevista/<string:token>', type='http', auth='public', methods=['GET'],
                sitemap=False)
    def entrevista(self, token, **kw):
        entrevista = self._entrevista(token)
        if not entrevista:
            return self._render('reclutamiento_tms.portal_entrevista_no_disponible', {'seccion': 'vacantes'})
        return self._render('reclutamiento_tms.portal_entrevista', {
            'entrevista': entrevista, 'token': token, 'seccion': 'vacantes',
        })

    def _respuesta_chat(self, entrevista):
        payload = entrevista._payload()
        if entrevista.estado == 'terminada':
            siguiente = entrevista._siguiente_habilitada()
            payload['siguiente'] = (
                {'nombre': siguiente.name, 'url': f'/reclutamiento_tms/entrevista/{siguiente.access_token}'}
                if siguiente else None
            )
        return payload

    @http.route('/reclutamiento_tms/entrevista/<string:token>/estado', type='jsonrpc', auth='public',
                methods=['POST'], sitemap=False)
    def entrevista_estado(self, token, iniciar=False, **kw):
        entrevista = self._entrevista(token)
        if not entrevista:
            return {'error': _('La entrevista no está disponible.')}
        if iniciar and entrevista.estado == 'pendiente':
            entrevista._iniciar()
        return self._respuesta_chat(entrevista)

    @http.route('/reclutamiento_tms/entrevista/<string:token>/responder', type='jsonrpc', auth='public',
                methods=['POST'], sitemap=False)
    def entrevista_responder(self, token, valor=None, opcion_id=None, texto=None, **kw):
        entrevista = self._entrevista(token)
        if not entrevista:
            return {'error': _('La entrevista no está disponible.')}
        try:
            entrevista._responder({'valor': valor, 'opcion_id': opcion_id, 'texto': texto})
        except UserError as error:
            return {**self._respuesta_chat(entrevista), 'error': error.args[0]}
        return self._respuesta_chat(entrevista)

    @http.route('/reclutamiento_tms/entrevista/<string:token>/imagen/<int:pregunta_id>', type='http',
                auth='public', methods=['GET'], sitemap=False)
    def entrevista_imagen(self, token, pregunta_id, **kw):
        entrevista = self._entrevista(token)
        pregunta = entrevista and entrevista.plantilla_id.pregunta_ids.filtered(lambda p: p.id == pregunta_id)
        if not pregunta or not pregunta.imagen:
            raise request.not_found()
        return self._imagen(pregunta.imagen)
