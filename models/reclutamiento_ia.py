import json
import logging
import re

import requests

from odoo import _, models
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

JSON_BLOCK = re.compile(r'\{.*\}', re.S)


class ReclutamientoIa(models.AbstractModel):
    """Cliente mínimo de la API de IA en la nube (OpenAI compatible o Anthropic) que devuelve JSON."""
    _name = 'reclutamiento.ia'
    _description = 'Servicio de IA de Reclutamiento'

    def _chat_json(self, system, messages, config=None, max_tokens=2500):
        """Envía ``messages`` (``[{'role': 'user'|'assistant', 'content': str}]``) y devuelve el JSON de la respuesta.

        Lanza ``UserError`` si la IA no está configurada, falla o no devuelve un JSON válido.
        """
        config = config or self.env['reclutamiento.ia.config']._get_config()
        if not config:
            raise UserError(_('No hay configuración de IA.'))
        api_key = config._get_api_key()
        if not api_key:
            raise UserError(_('Falta la API Key de IA en Reclutamiento › Configuración › API Cloud IA.'))
        base_url = (config.base_url or '').rstrip('/')
        try:
            if config.proveedor == 'anthropic':
                response = requests.post(
                    f'{base_url}/messages',
                    headers={
                        'x-api-key': api_key,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json',
                    },
                    json={
                        'model': config.modelo,
                        'max_tokens': max_tokens,
                        'system': system,
                        'messages': messages,
                    },
                    timeout=config.timeout or 120,
                )
                response.raise_for_status()
                content = ''.join(
                    block.get('text', '') for block in response.json().get('content', [])
                    if block.get('type') == 'text'
                )
            else:
                response = requests.post(
                    f'{base_url}/chat/completions',
                    headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
                    json={
                        'model': config.modelo,
                        'messages': [{'role': 'system', 'content': system}, *messages],
                        'max_tokens': max_tokens,
                        'response_format': {'type': 'json_object'},
                    },
                    timeout=config.timeout or 120,
                )
                response.raise_for_status()
                content = response.json()['choices'][0]['message']['content']
        except requests.exceptions.Timeout:
            raise UserError(_('La IA tardó demasiado en responder.'))
        except requests.exceptions.HTTPError as error:
            try:
                detail = error.response.json().get('error', {})
                detail = detail.get('message', detail) if isinstance(detail, dict) else detail
            except ValueError:
                detail = error.response.text[:300]
            raise UserError(_('Error de la API de IA (%(code)s): %(detail)s',
                              code=error.response.status_code, detail=detail))
        except (requests.exceptions.RequestException, KeyError, IndexError, ValueError) as error:
            raise UserError(_('No se pudo consultar la IA: %s', error))
        return self._parse_json(content)

    def _parse_json(self, content):
        try:
            return json.loads(content)
        except (TypeError, ValueError):
            match = JSON_BLOCK.search(content or '')
            if match:
                try:
                    return json.loads(match.group(0))
                except ValueError:
                    pass
        _logger.warning('Reclutamiento: la IA no devolvió JSON válido: %s', (content or '')[:500])
        raise UserError(_('La IA no devolvió un JSON válido.'))
