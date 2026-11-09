from odoo import _, api, fields, models


class ReclutamientoVacante(models.Model):
    _name = 'reclutamiento.vacante'
    _description = 'Cargo / Vacante'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'sequence, fecha_apertura desc, id desc'

    name = fields.Char(string='Vacante', required=True, tracking=True)
    sequence = fields.Integer(string='Secuencia', default=10)
    job_id = fields.Many2one('hr.job', string='Cargo', tracking=True,
                             help='Puesto de trabajo que se asigna al empleado al aprobar la postulación.')
    department_id = fields.Many2one('hr.department', string='Departamento', tracking=True)
    company_id = fields.Many2one('res.company', string='Compañía', required=True, index=True,
                                 default=lambda self: self.env.company)
    user_id = fields.Many2one('res.users', string='Responsable de Selección', tracking=True,
                              default=lambda self: self.env.user, domain="[('share', '=', False)]")
    estado = fields.Selection(
        [('borrador', 'Borrador'), ('publicada', 'Publicada'), ('cerrada', 'Cerrada')],
        string='Estado', default='borrador', required=True, tracking=True, group_expand=True,
    )
    interna = fields.Boolean(
        string='Búsqueda interna', tracking=True,
        help='Solo para empleados: no se muestra en el portal público; se postula desde la ficha del empleado.',
    )
    ubicacion = fields.Char(string='Ubicación')
    modalidad = fields.Char(string='Modalidad / Jornada', help='Ej.: Tiempo completo, presencial.')
    cantidad = fields.Integer(string='Puestos a cubrir', default=1)
    fecha_apertura = fields.Date(string='Fecha de apertura', default=fields.Date.context_today)
    fecha_cierre = fields.Date(string='Fecha de cierre')
    descripcion = fields.Html(string='Descripción pública', help='Lo que ve el postulante en el portal.')
    requisitos = fields.Html(
        string='Requisitos del cargo',
        help='Requisitos excluyentes y deseables. La IA los usa para el matching del perfil.',
    )
    plantilla_datos_id = fields.Many2one('reclutamiento.plantilla.datos', string='Plantilla de Datos',
                                         ondelete='restrict', tracking=True)
    entrevista_ids = fields.One2many('reclutamiento.vacante.entrevista', 'vacante_id', string='Entrevistas',
                                     copy=True)
    referencias_minimas = fields.Integer(string='Referencias mínimas', default=3)
    usar_ia = fields.Boolean(
        string='Intervención de IA', default=True, tracking=True,
        help='Si está activa, la IA analiza el CV, hace el matching, repregunta en las preguntas abiertas y '
             'calcula el puntaje global. Si no, las postulaciones se evalúan solo a mano.',
    )
    postulacion_ids = fields.One2many('reclutamiento.postulacion', 'vacante_id', string='Postulaciones')
    postulacion_count = fields.Integer(string='Postulaciones', compute='_compute_postulacion_stats')
    nuevas_count = fields.Integer(string='Nuevas', compute='_compute_postulacion_stats')
    aprobadas_count = fields.Integer(string='Aprobadas', compute='_compute_postulacion_stats')
    url_publica = fields.Char(string='Enlace de postulación', compute='_compute_url_publica')
    color = fields.Integer(string='Color')

    def _compute_postulacion_stats(self):
        Postulacion = self.env['reclutamiento.postulacion']
        data = {}
        for vacante, codigo, count in Postulacion._read_group(
                [('vacante_id', 'in', self.ids)], ['vacante_id', 'etapa_codigo'], ['__count']):
            data.setdefault(vacante.id, {})[codigo] = count
        for rec in self:
            stats = data.get(rec.id, {})
            rec.postulacion_count = sum(stats.values())
            rec.nuevas_count = stats.get('recibida', 0) + stats.get('evaluacion_ia', 0)
            rec.aprobadas_count = stats.get('aprobado', 0)

    def _compute_url_publica(self):
        base_url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
        for rec in self:
            rec.url_publica = f'{base_url}/reclutamiento_tms/{rec.id}' if rec.id and not rec.interna else False

    @api.onchange('job_id')
    def _onchange_job_id(self):
        if self.job_id:
            self.name = self.name or self.job_id.name
            self.department_id = self.job_id.department_id or self.department_id

    def _esta_abierta(self):
        self.ensure_one()
        hoy = fields.Date.context_today(self)
        return self.estado == 'publicada' and not (self.fecha_cierre and self.fecha_cierre < hoy)

    def action_publicar(self):
        self.write({'estado': 'publicada'})

    def action_cerrar(self):
        self.write({'estado': 'cerrada'})

    def action_borrador(self):
        self.write({'estado': 'borrador'})

    def action_ver_postulaciones(self):
        self.ensure_one()
        action = self.env['ir.actions.act_window']._for_xml_id('reclutamiento_tms.action_reclutamiento_postulacion')
        action['domain'] = [('vacante_id', '=', self.id)]
        action['context'] = {'default_vacante_id': self.id}
        action['display_name'] = _('Postulaciones: %s', self.name)
        return action

    def action_abrir_portal(self):
        self.ensure_one()
        return {'type': 'ir.actions.act_url', 'url': f'/reclutamiento_tms/{self.id}', 'target': 'new'}
