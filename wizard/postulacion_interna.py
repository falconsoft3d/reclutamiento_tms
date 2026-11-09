from odoo import _, fields, models
from odoo.exceptions import UserError


class ReclutamientoPostulacionInternaWizard(models.TransientModel):
    _name = 'reclutamiento.postulacion.interna.wizard'
    _description = 'Postulación interna de un empleado'

    employee_id = fields.Many2one('hr.employee', string='Empleado', required=True)
    vacante_id = fields.Many2one(
        'reclutamiento.vacante', string='Búsqueda', required=True,
        domain="[('estado', '=', 'publicada')]",
    )
    nota = fields.Text(string='Motivo / Observaciones',
                       help='Por qué se postula o se propone al empleado (promoción, cambio de puesto...).')
    enviar_enlaces = fields.Boolean(string='Enviar por email el enlace de las entrevistas', default=True)

    def action_postular(self):
        self.ensure_one()
        # sudo: email privado y DNI son campos de RRHH; se leen solo para precargar el postulante.
        employee = self.employee_id.sudo()
        existente = self.env['reclutamiento.postulacion'].search([
            ('employee_id', '=', employee.id), ('vacante_id', '=', self.vacante_id.id),
            ('etapa_codigo', 'not in', ('rechazado', 'aprobado')),
        ], limit=1)
        if existente:
            raise UserError(_('%(empleado)s ya tiene la postulación %(ref)s abierta en esta búsqueda.',
                              empleado=employee.name, ref=existente.name))
        partes = (employee.name or '').strip().split(' ', 1)
        postulante = self.env['reclutamiento.postulante']._buscar_o_crear({
            'nombre': partes[0],
            'apellido': partes[1] if len(partes) > 1 else '-',
            'email': employee.work_email or employee.private_email,
            'telefono': employee.mobile_phone or employee.work_phone,
            'documento': employee.identification_id,
            'employee_id': employee.id,
        })
        postulacion = self.env['reclutamiento.postulacion'].create({
            'postulante_id': postulante.id,
            'vacante_id': self.vacante_id.id,
            'employee_id': employee.id,
            'origen': 'interna',
        })
        if self.nota:
            postulacion.message_post(body=self.nota, subtype_xmlid='mail.mt_note')
        if not postulacion._verificar_lista_negra() and self.enviar_enlaces and postulacion.email:
            postulacion.entrevista_ids.filtered('habilitada').action_enviar_enlace()
        return {
            'type': 'ir.actions.act_window', 'res_model': 'reclutamiento.postulacion',
            'res_id': postulacion.id, 'view_mode': 'form',
        }
