from odoo import _, api, fields, models

from .reclutamiento_lista_negra import normalizar_documento, normalizar_email, normalizar_telefono


class ReclutamientoPostulante(models.Model):
    """Persona que se postula. Es independiente de los contactos: no se crea un res.partner por postulante."""
    _name = 'reclutamiento.postulante'
    _description = 'Postulante'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'apellido, nombre, id'
    _rec_name = 'nombre_completo'
    _rec_names_search = ['nombre_completo', 'email', 'documento', 'telefono']

    nombre = fields.Char(string='Nombre', required=True, tracking=True)
    apellido = fields.Char(string='Apellido', required=True, tracking=True)
    nombre_completo = fields.Char(string='Postulante', compute='_compute_nombre_completo', store=True)
    email = fields.Char(string='Email', tracking=True)
    telefono = fields.Char(string='Teléfono', tracking=True)
    documento = fields.Char(string='DNI / CUIT / CUIL', tracking=True)
    ubicacion = fields.Char(string='Ubicación', tracking=True, help='Provincia / Localidad.')
    email_norm = fields.Char(compute='_compute_normalizados', store=True, index=True)
    documento_norm = fields.Char(compute='_compute_normalizados', store=True, index=True)
    telefono_norm = fields.Char(compute='_compute_normalizados', store=True, index=True)
    employee_id = fields.Many2one('hr.employee', string='Empleado', tracking=True, index=True,
                                  help='Empleado vinculado: postulante interno o contratado.')
    notas = fields.Html(string='Notas')
    active = fields.Boolean(string='Activo', default=True)
    postulacion_ids = fields.One2many('reclutamiento.postulacion', 'postulante_id', string='Postulaciones')
    postulacion_count = fields.Integer(string='Nº postulaciones', compute='_compute_postulaciones')
    ultimo_puntaje = fields.Integer(string='Último puntaje IA', compute='_compute_postulaciones')
    lista_negra = fields.Boolean(string='En lista negra', compute='_compute_postulaciones')

    @api.depends('nombre', 'apellido')
    def _compute_nombre_completo(self):
        for rec in self:
            rec.nombre_completo = ' '.join(filter(None, [rec.nombre, rec.apellido]))

    @api.depends('email', 'telefono', 'documento')
    def _compute_normalizados(self):
        for rec in self:
            rec.email_norm = normalizar_email(rec.email)
            rec.documento_norm = normalizar_documento(rec.documento)
            rec.telefono_norm = normalizar_telefono(rec.telefono)

    @api.depends('postulacion_ids.puntaje_global', 'postulacion_ids.lista_negra')
    def _compute_postulaciones(self):
        for rec in self:
            postulaciones = rec.postulacion_ids.sorted('fecha', reverse=True)
            evaluadas = postulaciones.filtered(lambda p: p.ia_estado == 'hecho')
            rec.postulacion_count = len(postulaciones)
            rec.ultimo_puntaje = evaluadas[:1].puntaje_global
            rec.lista_negra = any(postulaciones.mapped('lista_negra'))

    @api.model
    def _buscar_o_crear(self, vals):
        """Reutiliza el postulante con el mismo CUIT/CUIL/RFC o Email y actualiza sus datos; si no existe lo crea."""
        Postulante = self.sudo()
        postulante = Postulante.browse()
        documento = normalizar_documento(vals.get('documento'))
        email = normalizar_email(vals.get('email'))
        if documento:
            postulante = Postulante.search([('documento_norm', '=', documento)], limit=1)
        if not postulante and email:
            postulante = Postulante.search([('email_norm', '=', email)], limit=1)
        if postulante:
            postulante.write({k: v for k, v in vals.items() if v})
            return postulante
        return Postulante.create(vals)

    def action_ver_postulaciones(self):
        self.ensure_one()
        action = self.env['ir.actions.act_window']._for_xml_id('reclutamiento_tms.action_reclutamiento_postulacion')
        action['domain'] = [('postulante_id', '=', self.id)]
        action['context'] = {'default_postulante_id': self.id}
        action['display_name'] = _('Postulaciones de %s', self.nombre_completo)
        return action
