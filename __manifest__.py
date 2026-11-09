{
    'name': 'Reclutamiento TMS MFH',
    'version': '19.0.1.0.0',
    'summary': 'Vacantes, portal de postulación con plantillas dinámicas, lista negra y evaluación con IA',
    'sequence': 12,
    'description': """
Reclutamiento TMS
=================
* Cargos / Vacantes publicadas en un portal web propio (/reclutamiento_tms).
* Formulario de postulación con datos personales, CV (PDF/DOCX), mínimo 3 referencias
  y campos dinámicos por cargo (Plantilla de Datos organizada por categorías).
* Plantillas de Entrevista: preguntas Sí/No, opciones con puntaje y preguntas abiertas.
* Lista Negra por Email, Teléfono y CUIT/CUIL/RFC: la postulación que coincide pasa a la
  etapa Lista Negra con el criterio coincidente y se avisa al equipo de Selección.
* Integración con IA en la nube (OpenAI o Anthropic): análisis del CV, cruce CV vs. datos
  vs. vacante, entrevista interactiva por chat con repreguntas y puntaje global 0-100
  con puntos fuertes, riesgos y validación de referencias.
* Postulación interna desde el empleado y traspaso de los datos al expediente al aprobar.
    """,
    'website': 'https://www.marlonfalcon.com',
    'author': 'Marlon Falcon Hernandez',
    'license': 'LGPL-3',
    'category': 'Human Resources',
    'depends': ['hr', 'mail', 'web'],
    'external_dependencies': {'python': ['requests']},
    'data': [
        'security/reclutamiento_security.xml',
        'security/ir.model.access.csv',
        'data/res_users_data.xml',
        'data/ir_sequence_data.xml',
        'data/reclutamiento_etapa_data.xml',
        'data/reclutamiento_data.xml',
        'data/reclutamiento_ejemplo_data.xml',
        'data/ir_cron_data.xml',
        'data/mail_template_data.xml',
        'views/reclutamiento_ia_config_views.xml',
        'views/reclutamiento_plantilla_views.xml',
        'views/reclutamiento_lista_negra_views.xml',
        'views/reclutamiento_postulacion_views.xml',
        'views/reclutamiento_vacante_views.xml',
        'views/reclutamiento_noticia_views.xml',
        'views/hr_employee_views.xml',
        'wizard/postulacion_interna_views.xml',
        'views/portal_templates.xml',
        'views/reclutamiento_menus.xml',
    ],
    'images': ['static/description/icon.png'],
    'installable': True,
    'application': True,
    'auto_install': False,
}
