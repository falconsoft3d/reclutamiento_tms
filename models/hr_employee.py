from odoo import _, fields, models

GRUPO = 'reclutamiento_tms.group_reclutamiento_user'


class HrEmployee(models.Model):
    _inherit = 'hr.employee'

    reclutamiento_postulacion_ids = fields.One2many(
        'reclutamiento.postulacion', 'employee_id', string='Postulaciones', groups=GRUPO)
    reclutamiento_postulacion_count = fields.Integer(
        string='Postulaciones', compute='_compute_reclutamiento_postulacion_count', groups=GRUPO)

    def _compute_reclutamiento_postulacion_count(self):
        data = {
            employee.id: count for employee, count in self.env['reclutamiento.postulacion']._read_group(
                [('employee_id', 'in', self.ids)], ['employee_id'], ['__count'])
        }
        for employee in self:
            employee.reclutamiento_postulacion_count = data.get(employee.id, 0)

    def action_ver_reclutamiento_postulaciones(self):
        self.ensure_one()
        action = self.env['ir.actions.act_window']._for_xml_id('reclutamiento_tms.action_reclutamiento_postulacion')
        action['domain'] = [('employee_id', '=', self.id)]
        action['context'] = {}
        action['display_name'] = _('Postulaciones de %s', self.name)
        return action

    def action_postular_busqueda_interna(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': _('Postular a búsqueda interna'),
            'res_model': 'reclutamiento.postulacion.interna.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {'default_employee_id': self.id},
        }
