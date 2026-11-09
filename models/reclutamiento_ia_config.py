from odoo import _, api, fields, models
from odoo.exceptions import UserError, ValidationError

DEFAULT_MODELS = {
    'openai': 'gpt-4o-mini',
    'anthropic': 'claude-sonnet-5-5',
}
DEFAULT_URLS = {
    'openai': 'https://api.openai.com/v1',
    'anthropic': 'https://api.anthropic.com/v1',
}


class ReclutamientoIaConfig(models.Model):
    _name = 'reclutamiento.ia.config'
    _description = 'Configuración API Cloud IA (Reclutamiento)'

    name = fields.Char(string='Nombre', default='Configuración IA', required=True)
    activo = fields.Boolean(
        string='IA habilitada', default=True,
        help='Si se desactiva, no se evalúan postulaciones ni hay repreguntas en la entrevista.',
    )
    proveedor = fields.Selection(
        [('openai', 'OpenAI (o compatible)'), ('anthropic', 'Anthropic')],
        string='Proveedor', default='openai', required=True,
    )
    api_key = fields.Char(
        string='API Key', groups='reclutamiento_tms.group_reclutamiento_manager',
        help='Sin API Key la IA no hace nada: no evalúa postulaciones ni repregunta en las entrevistas.',
    )
    modelo = fields.Char(string='Modelo', default=DEFAULT_MODELS['openai'], required=True)
    base_url = fields.Char(
        string='URL base', default=DEFAULT_URLS['openai'], required=True,
        help='Para OpenAI compatible (Azure, OpenRouter, servidor propio) cambie la URL base.',
    )
    timeout = fields.Integer(string='Tiempo máximo (s)', default=120)
    max_repreguntas = fields.Integer(
        string='Repreguntas por pregunta abierta', default=2,
        help='Cuántas repreguntas puede hacer la IA en cada pregunta abierta de la entrevista.',
    )
    max_cv_chars = fields.Integer(string='Máx. caracteres del CV enviados', default=15000)
    peso_cv = fields.Integer(string='Peso Análisis de CV (%)', default=20)
    peso_match = fields.Integer(string='Peso Matching de perfil (%)', default=40)
    peso_entrevista = fields.Integer(string='Peso Entrevista (%)', default=40)
    instrucciones = fields.Text(
        string='Instrucciones adicionales para la IA',
        help='Criterios propios de la empresa que se agregan a todas las evaluaciones.',
    )
    ultimo_test = fields.Text(string='Resultado de la última prueba', readonly=True)
    tiene_api_key = fields.Boolean(string='Tiene API Key', compute='_compute_tiene_api_key')

    def _compute_tiene_api_key(self):
        for rec in self:
            rec.tiene_api_key = bool(rec.sudo().api_key)

    @api.constrains('peso_cv', 'peso_match', 'peso_entrevista')
    def _check_pesos(self):
        for rec in self:
            if min(rec.peso_cv, rec.peso_match, rec.peso_entrevista) < 0 or \
                    rec.peso_cv + rec.peso_match + rec.peso_entrevista != 100:
                raise ValidationError(_('Los pesos del puntaje global deben ser positivos y sumar 100.'))

    @api.onchange('proveedor')
    def _onchange_proveedor(self):
        self.modelo = DEFAULT_MODELS[self.proveedor]
        self.base_url = DEFAULT_URLS[self.proveedor]

    @api.model
    def _get_config(self):
        config = self.env.ref('reclutamiento_tms.ia_config_default', raise_if_not_found=False)
        return (config or self.search([], limit=1)).sudo()

    @api.model
    def _get_config_activa(self):
        """Configuración solo si la IA está habilitada y tiene API Key; si no, la IA no hace nada."""
        config = self._get_config()
        return config if config and config.activo and config._get_api_key() else self.browse()

    def _get_api_key(self):
        self.ensure_one()
        return self.sudo().api_key

    def action_probar(self):
        self.ensure_one()
        try:
            data = self.env['reclutamiento.ia']._chat_json(
                'Respondé solo con JSON.',
                [{'role': 'user', 'content': 'Devolvé {"ok": true, "mensaje": "<saludo corto en español>"}'}],
                config=self,
            )
        except UserError as error:
            self.ultimo_test = _('Error: %s', error.args[0])
        else:
            self.ultimo_test = _('Conexión correcta: %s', data.get('mensaje') or data)
