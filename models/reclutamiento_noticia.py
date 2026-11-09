from odoo import fields, models


class ReclutamientoNoticia(models.Model):
    """Noticias que se publican en el portal de reclutamiento."""
    _name = 'reclutamiento.noticia'
    _description = 'Noticia del Portal de Reclutamiento'
    _inherit = ['mail.thread']
    _order = 'destacada desc, fecha desc, id desc'

    name = fields.Char(string='Título', required=True, tracking=True)
    fecha = fields.Date(string='Fecha', required=True, default=fields.Date.context_today, tracking=True)
    resumen = fields.Text(string='Resumen', help='Texto corto que se muestra en la tarjeta del portal.')
    contenido = fields.Html(string='Contenido')
    imagen = fields.Image(string='Imagen', max_width=1600, max_height=1000)
    publicada = fields.Boolean(string='Publicada en el portal', tracking=True)
    destacada = fields.Boolean(string='Destacada', help='Se muestra primero en el portal.')
    vacante_id = fields.Many2one('reclutamiento.vacante', string='Vacante relacionada',
                                 help='Muestra un botón para postularse a esta vacante.')
    company_id = fields.Many2one('res.company', string='Compañía', default=lambda self: self.env.company)
    user_id = fields.Many2one('res.users', string='Autor', default=lambda self: self.env.user)
    url_publica = fields.Char(string='Enlace en el portal', compute='_compute_url_publica')
    active = fields.Boolean(string='Activo', default=True)

    def _compute_url_publica(self):
        base_url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
        for rec in self:
            rec.url_publica = f'{base_url}/reclutamiento_tms/noticias/{rec.id}' if rec.id else False

    def action_publicar(self):
        self.write({'publicada': True})

    def action_despublicar(self):
        self.write({'publicada': False})

    def action_abrir_portal(self):
        self.ensure_one()
        return {'type': 'ir.actions.act_url', 'url': f'/reclutamiento_tms/noticias/{self.id}', 'target': 'new'}
