import re

from odoo import _, api, fields, models

# Dígitos finales del teléfono que se comparan: así coinciden "+54 9 11 4213-4222", "11 4213 4222" y "4213-4222".
DIGITOS_TELEFONO = 8
SEPARADOR = re.compile(r'[/;,|\n]+|\s{2,}|\by\b|\bo\b', re.I)


def _lista(valores):
    """Guarda varios valores normalizados como ``|a|b|`` para buscarlos con ``ilike '|a|'``."""
    valores = [v for v in dict.fromkeys(valores) if v]
    return f"|{'|'.join(valores)}|" if valores else False


def normalizar_email(valor):
    return (valor or '').strip().lower() or False


def normalizar_emails(valor):
    return _lista(normalizar_email(v) for v in re.split(r'[\s/;,|]+', valor or '') if '@' in v)


def normalizar_telefono(valor):
    digitos = re.sub(r'\D', '', valor or '')
    return digitos[-DIGITOS_TELEFONO:] if len(digitos) >= 6 else False


def normalizar_telefonos(valor):
    return _lista(normalizar_telefono(v) for v in SEPARADOR.split(valor or ''))


def normalizar_documento(valor):
    """DNI, CUIT, CUIL o RFC a una clave comparable.

    El CUIT/CUIL (11 dígitos) contiene el DNI en los dígitos 3 a 10, así que ambos se reducen al DNI
    de 8 dígitos. "28.887.447", "28,887,447" y "20-28887447-3" dan "28887447". Un RFC (letras y
    dígitos) se compara completo. Textos sin dígitos ("SIN DATOS") no son un documento.
    """
    valor = (valor or '').strip()
    if not re.search(r'\d', valor):
        return False
    partes = [p for p in re.split(r'[-\s]+', valor) if p]
    if len(partes) == 3 and all(p.isdigit() for p in partes) and 6 <= len(partes[1]) <= 8:
        return partes[1].zfill(8)  # CUIT/CUIL con guiones: el del medio es el DNI
    digitos = re.sub(r'\D', '', valor)
    if re.search(r'[A-Za-z]', re.sub(r'[\s.\-/]', '', valor)) and len(re.sub(r'[^0-9A-Za-z]', '', valor)) >= 12:
        return re.sub(r'[^0-9A-Za-z]', '', valor).upper()  # RFC
    if len(digitos) == 11:
        digitos = digitos[2:10]
    if 6 <= len(digitos) <= 8:
        return digitos.zfill(8)
    return digitos or False


class ReclutamientoListaNegra(models.Model):
    _name = 'reclutamiento.lista.negra'
    _description = 'Lista Negra de Postulantes'
    _inherit = ['mail.thread']
    _order = 'name, id'

    # Las etiquetas coinciden con las columnas de la planilla para importarla directamente.
    name = fields.Char(string='Apellido y Nombre', required=True, tracking=True)
    documento = fields.Char(string='DNI', tracking=True, help='DNI, CUIT, CUIL o RFC.')
    telefono = fields.Char(string='Teléfono', tracking=True, help='Puede tener varios separados por / , ;')
    email = fields.Char(string='Mail', tracking=True)
    ubicacion = fields.Char(string='Ubicación', tracking=True)
    area_puesto = fields.Char(string='Área / Puesto', tracking=True)
    motivo = fields.Text(string='Motivo / Detalle', tracking=True)
    documento_norm = fields.Char(compute='_compute_normalizados', store=True, index=True)
    telefono_norm = fields.Char(compute='_compute_normalizados', store=True, index='trigram')
    email_norm = fields.Char(compute='_compute_normalizados', store=True, index='trigram')
    sin_datos = fields.Boolean(
        string='Sin datos para controlar', compute='_compute_normalizados', store=True,
        help='No tiene DNI, Teléfono ni Mail válidos: no puede detectar postulaciones.',
    )
    active = fields.Boolean(string='Activo', default=True, tracking=True)
    company_id = fields.Many2one('res.company', string='Compañía', default=lambda self: self.env.company)
    user_id = fields.Many2one('res.users', string='Registrado por', default=lambda self: self.env.user, readonly=True)
    postulacion_origen_id = fields.Many2one('reclutamiento.postulacion', string='Postulación de origen', readonly=True)
    coincidencia_count = fields.Integer(string='Cantidad de postulaciones', compute='_compute_coincidencia_count')

    @api.depends('email', 'telefono', 'documento')
    def _compute_normalizados(self):
        for rec in self:
            rec.documento_norm = normalizar_documento(rec.documento)
            rec.telefono_norm = normalizar_telefonos(rec.telefono)
            rec.email_norm = normalizar_emails(rec.email)
            rec.sin_datos = not (rec.documento_norm or rec.telefono_norm or rec.email_norm)

    def _compute_coincidencia_count(self):
        data = {
            entrada.id: count for entrada, count in self.env['reclutamiento.postulacion']._read_group(
                [('lista_negra_ids', 'in', self.ids)], ['lista_negra_ids'], ['__count'])
        }
        for rec in self:
            rec.coincidencia_count = data.get(rec.id, 0)

    @api.model
    def _buscar_coincidencias(self, email=None, telefono=None, documento=None):
        """Devuelve ``(entradas, criterios)`` de la lista negra que coinciden por Email, Teléfono o DNI/CUIT."""
        condiciones = []
        documento = normalizar_documento(documento)
        if documento:
            condiciones.append(('documento', [('documento_norm', '=', documento)]))
        for tel in (normalizar_telefonos(telefono) or '').strip('|').split('|'):
            if tel:
                condiciones.append(('telefono', [('telefono_norm', 'ilike', f'|{tel}|')]))
        for mail in (normalizar_emails(email) or '').strip('|').split('|'):
            if mail:
                condiciones.append(('email', [('email_norm', 'ilike', f'|{mail}|')]))
        if not condiciones:
            return self.browse(), []
        domain = condiciones[0][1]
        for _criterio, condicion in condiciones[1:]:
            domain = ['|'] + domain + condicion
        entradas = self.sudo().search(domain)
        etiquetas = {'documento': _('DNI/CUIT'), 'telefono': _('Teléfono'), 'email': _('Email')}
        criterios = []
        for criterio, condicion in condiciones:
            if etiquetas[criterio] not in criterios and entradas.filtered_domain(condicion):
                criterios.append(etiquetas[criterio])
        return entradas, criterios

    def action_ver_coincidencias(self):
        self.ensure_one()
        action = self.env['ir.actions.act_window']._for_xml_id('reclutamiento_tms.action_reclutamiento_postulacion')
        action['domain'] = [('lista_negra_ids', 'in', self.ids)]
        action['context'] = {}
        return action
