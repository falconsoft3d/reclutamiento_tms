from odoo import fields, models

CODIGOS_ETAPA = [
    ('recibida', 'Recibida'),
    ('evaluacion_ia', 'Evaluación IA'),
    ('entrevista', 'Entrevista'),
    ('lista_negra', 'Lista Negra'),
    ('aprobado', 'Aprobado'),
    ('rechazado', 'Rechazado'),
]


class ReclutamientoEtapa(models.Model):
    _name = 'reclutamiento.etapa'
    _description = 'Etapa de Postulación'
    _order = 'sequence, id'

    name = fields.Char(string='Etapa', required=True, translate=True)
    sequence = fields.Integer(string='Secuencia', default=10)
    codigo = fields.Selection(
        CODIGOS_ETAPA, string='Función',
        help='Etapa que usa el sistema automáticamente (recepción, IA, lista negra, aprobación...).',
    )
    fold = fields.Boolean(string='Plegada en el tablero')
    descripcion = fields.Text(string='Descripción')

    _codigo_unique = models.Constraint('UNIQUE(codigo)', 'Ya existe una etapa con esa función.')
