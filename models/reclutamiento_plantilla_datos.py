from odoo import _, api, fields, models
from odoo.exceptions import ValidationError

TIPOS_CAMPO = [
    ('texto', 'Texto corto'),
    ('texto_largo', 'Texto descriptivo'),
    ('booleano', 'Sí / No'),
    ('seleccion', 'Opción única'),
    ('multiple', 'Opción múltiple'),
    ('documento', 'Documento adjunto'),
]

# Tipos de campo del empleado a los que se puede traspasar una respuesta.
TIPOS_TRASPASO = ('char', 'text', 'html', 'boolean')


class ReclutamientoPlantillaDatos(models.Model):
    _name = 'reclutamiento.plantilla.datos'
    _description = 'Plantilla de Datos del Cargo'
    _order = 'name'

    name = fields.Char(string='Plantilla', required=True)
    active = fields.Boolean(string='Activo', default=True)
    descripcion = fields.Text(string='Descripción')
    linea_ids = fields.One2many('reclutamiento.plantilla.datos.linea', 'plantilla_id', string='Campos', copy=True)
    vacante_count = fields.Integer(string='Vacantes', compute='_compute_vacante_count')

    def _compute_vacante_count(self):
        data = {
            plantilla.id: count for plantilla, count in self.env['reclutamiento.vacante']._read_group(
                [('plantilla_datos_id', 'in', self.ids)], ['plantilla_datos_id'], ['__count'])
        }
        for rec in self:
            rec.vacante_count = data.get(rec.id, 0)

    def _lineas_por_categoria(self):
        """``[(categoria, lineas)]`` en orden de categoría y secuencia, para el portal y el formulario."""
        self.ensure_one()
        grupos = []
        for linea in self.linea_ids.sorted(lambda l: (l.categoria_id.sequence, l.categoria_id.id, l.sequence, l.id)):
            if not grupos or grupos[-1][0] != linea.categoria_id:
                grupos.append((linea.categoria_id, linea))
            else:
                grupos[-1] = (grupos[-1][0], grupos[-1][1] | linea)
        return grupos


class ReclutamientoPlantillaDatosLinea(models.Model):
    _name = 'reclutamiento.plantilla.datos.linea'
    _description = 'Campo de Plantilla de Datos'
    _order = 'sequence, id'

    plantilla_id = fields.Many2one('reclutamiento.plantilla.datos', string='Plantilla', required=True,
                                   ondelete='cascade', index=True)
    sequence = fields.Integer(string='Secuencia', default=10)
    categoria_id = fields.Many2one('reclutamiento.categoria', string='Categoría', required=True, ondelete='restrict')
    name = fields.Char(string='Pregunta / Campo', required=True)
    ayuda = fields.Char(string='Ayuda', help='Texto de ayuda que ve el postulante debajo del campo.')
    tipo = fields.Selection(TIPOS_CAMPO, string='Tipo', required=True, default='texto')
    requerido = fields.Boolean(string='Obligatorio')
    opcion_ids = fields.One2many('reclutamiento.plantilla.datos.opcion', 'linea_id', string='Opciones', copy=True)
    campo_empleado_id = fields.Many2one(
        'ir.model.fields', string='Traspasar a campo del empleado', ondelete='set null',
        domain=[('model', '=', 'hr.employee'), ('ttype', 'in', TIPOS_TRASPASO),
                ('readonly', '=', False), ('store', '=', True)],
        help='Al aprobar la postulación, la respuesta se copia a este campo de la ficha del empleado.',
    )

    @api.constrains('tipo', 'opcion_ids')
    def _check_opciones(self):
        for rec in self:
            if rec.tipo in ('seleccion', 'multiple') and len(rec.opcion_ids) < 2:
                raise ValidationError(_('"%s": cargue al menos 2 opciones.', rec.name))


class ReclutamientoPlantillaDatosOpcion(models.Model):
    _name = 'reclutamiento.plantilla.datos.opcion'
    _description = 'Opción de Campo de Plantilla de Datos'
    _order = 'sequence, id'

    linea_id = fields.Many2one('reclutamiento.plantilla.datos.linea', string='Campo', required=True,
                               ondelete='cascade', index=True)
    sequence = fields.Integer(string='Secuencia', default=10)
    name = fields.Char(string='Opción', required=True)
