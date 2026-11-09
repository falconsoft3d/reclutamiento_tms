import re

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError

TIPOS_PREGUNTA = [
    ('booleano', 'Sí / No'),
    ('opciones', 'Opciones con puntaje'),
    ('calculo', 'Cálculo (respuesta numérica)'),
    ('abierta', 'Pregunta abierta (evalúa la IA)'),
]
NUMERO = re.compile(r'-?\d+(?:[.,]\d+)?')


def leer_numero(texto):
    """Primer número de un texto: "32,5 m3" -> 32.5. Acepta separador de miles con punto ("1.250,5")."""
    texto = (texto or '').strip().replace(' ', '')
    if re.search(r'\d\.\d{3},', texto):
        texto = texto.replace('.', '')
    match = NUMERO.search(texto)
    return float(match.group(0).replace(',', '.')) if match else None


class ReclutamientoPlantillaEntrevista(models.Model):
    _name = 'reclutamiento.plantilla.entrevista'
    _description = 'Plantilla de Entrevista'
    _order = 'name'

    name = fields.Char(string='Plantilla', required=True)
    active = fields.Boolean(string='Activo', default=True)
    mensaje_inicial = fields.Text(
        string='Mensaje de bienvenida',
        default='¡Hola! Soy el asistente de selección. Te voy a hacer algunas preguntas sobre el puesto. '
                'Respondé con tranquilidad y con la mayor sinceridad posible.',
    )
    mensaje_final = fields.Text(
        string='Mensaje de cierre',
        default='¡Gracias! Terminamos la entrevista. El equipo de Selección revisará tu postulación '
                'y se comunicará con vos.',
    )
    pregunta_ids = fields.One2many('reclutamiento.plantilla.entrevista.pregunta', 'plantilla_id',
                                   string='Preguntas', copy=True)
    puntos_max = fields.Float(string='Puntaje máximo', compute='_compute_puntos_max')
    pregunta_count = fields.Integer(string='Preguntas', compute='_compute_puntos_max')

    @api.depends('pregunta_ids.puntos_max')
    def _compute_puntos_max(self):
        for rec in self:
            rec.puntos_max = sum(rec.pregunta_ids.mapped('puntos_max'))
            rec.pregunta_count = len(rec.pregunta_ids)


class ReclutamientoPlantillaEntrevistaPregunta(models.Model):
    _name = 'reclutamiento.plantilla.entrevista.pregunta'
    _description = 'Pregunta de Plantilla de Entrevista'
    _order = 'sequence, id'

    plantilla_id = fields.Many2one('reclutamiento.plantilla.entrevista', string='Plantilla', required=True,
                                   ondelete='cascade', index=True)
    sequence = fields.Integer(string='Secuencia', default=10)
    name = fields.Text(string='Pregunta', required=True)
    tipo = fields.Selection(TIPOS_PREGUNTA, string='Tipo', required=True, default='booleano')
    puntos = fields.Float(
        string='Puntos', default=10,
        help='Sí / No: puntos si responde lo esperado. Abierta: puntaje máximo que asigna la IA.',
    )
    respuesta_esperada = fields.Selection([('si', 'Sí'), ('no', 'No')], string='Respuesta que suma', default='si')
    opcion_ids = fields.One2many('reclutamiento.plantilla.entrevista.opcion', 'pregunta_id', string='Opciones',
                                 copy=True)
    imagen = fields.Image(string='Imagen', max_width=1280, max_height=1280,
                          help='Se muestra en el chat junto a la pregunta (ej.: foto o plano del camión).')
    valor_esperado = fields.Float(string='Resultado correcto', digits=(16, 4))
    unidad = fields.Char(string='Unidad', help='Ej.: m³, kg, km, litros.')
    tolerancia = fields.Float(string='Tolerancia', digits=(16, 4),
                              help='Margen aceptado alrededor del resultado correcto.')
    tolerancia_tipo = fields.Selection([('absoluta', 'En la unidad'), ('porcentaje', '% del resultado')],
                                       string='Tipo de tolerancia', default='absoluta')
    criterio = fields.Text(
        string='Criterio de evaluación',
        help='Pregunta abierta: qué se espera de una buena respuesta. Guía a la IA para repreguntar y puntuar.',
    )
    puntos_max = fields.Float(string='Máximo', compute='_compute_puntos_max', store=True)

    @api.depends('tipo', 'puntos', 'opcion_ids.puntos')
    def _compute_puntos_max(self):
        for rec in self:
            if rec.tipo == 'opciones':
                rec.puntos_max = max(rec.opcion_ids.mapped('puntos') or [0])
            else:
                rec.puntos_max = rec.puntos

    @api.constrains('tipo', 'opcion_ids')
    def _check_opciones(self):
        for rec in self:
            if rec.tipo == 'opciones' and len(rec.opcion_ids) < 2:
                raise ValidationError(_('"%s": cargue al menos 2 opciones con su puntaje.', rec.name))

    @api.constrains('tipo', 'tolerancia')
    def _check_tolerancia(self):
        for rec in self:
            if rec.tipo == 'calculo' and rec.tolerancia < 0:
                raise ValidationError(_('"%s": la tolerancia no puede ser negativa.', rec.name))

    def _es_calculo_correcto(self, valor):
        self.ensure_one()
        margen = self.tolerancia
        if self.tolerancia_tipo == 'porcentaje':
            margen = abs(self.valor_esperado) * self.tolerancia / 100
        return abs(valor - self.valor_esperado) <= margen + 1e-9


class ReclutamientoPlantillaEntrevistaOpcion(models.Model):
    _name = 'reclutamiento.plantilla.entrevista.opcion'
    _description = 'Opción de Pregunta de Entrevista'
    _order = 'sequence, id'

    pregunta_id = fields.Many2one('reclutamiento.plantilla.entrevista.pregunta', string='Pregunta', required=True,
                                  ondelete='cascade', index=True)
    sequence = fields.Integer(string='Secuencia', default=10)
    name = fields.Char(string='Opción', required=True)
    puntos = fields.Float(string='Puntos')
