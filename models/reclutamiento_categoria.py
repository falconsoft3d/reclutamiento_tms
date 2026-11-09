from odoo import fields, models


class ReclutamientoCategoria(models.Model):
    _name = 'reclutamiento.categoria'
    _description = 'Categoría de Plantilla de Datos'
    _order = 'sequence, name'

    name = fields.Char(string='Categoría', required=True, translate=True)
    sequence = fields.Integer(string='Secuencia', default=10)
    descripcion = fields.Char(string='Descripción', help='Texto de ayuda que se muestra en el portal.')
