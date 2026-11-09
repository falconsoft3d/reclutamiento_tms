# reclutamiento_tms — Portal de Reclutamiento

Portal web público de **búsquedas laborales** de Transol, construido con Next.js 16 (App Router, Tailwind CSS v4).
Los datos y la lógica viven en el módulo de Odoo **`reclutamiento_tms`** (repositorio `transolrepository`); este
portal solo los muestra y envía las postulaciones.

El diseño sigue la web de la empresa (transol.com.ar): verde `#46aa4a`, tipografía Exo 2 y fotos de la flota.

## Qué tiene

| Ruta | Contenido |
| --- | --- |
| `/` | Portada: búsquedas activas, "¿Por qué sumarte?" y últimas noticias |
| `/busquedas/[id]` | Detalle de la vacante y formulario de postulación: datos personales, CV (PDF/DOCX), referencias laborales (mínimo configurable por vacante) y campos dinámicos de la Plantilla de Datos, agrupados por categoría |
| `/gracias/[token]` | Agradecimiento después de postularse |
| `/entrevista/[token]` | Chat de la entrevista: preguntas Sí/No, opciones, cálculo (con unidad e imagen) y abiertas con repreguntas de la IA |
| `/noticias`, `/noticias/[id]` | Noticias publicadas desde Odoo (Reclutamiento TMS › Noticias) |

Al postularse, si la vacante tiene una entrevista automática el postulante va directo al chat; si no, al agradecimiento.
La verificación de Lista Negra, la evaluación con IA y los emails los hace Odoo.

## Cómo se conecta con Odoo

- El navegador **nunca** llama a Odoo: las páginas (Server Components), las Server Actions y las rutas `/api/*`
  llaman desde el servidor a la API JSON `{ODOO_URL}/reclutamiento_tms/api/...` (controlador
  `reclutamiento_tms/controllers/api.py`).
- Cada petición envía la cabecera `X-Reclutamiento-Key` con `RECLUTAMIENTO_API_KEY`. En Odoo se configura en
  **Reclutamiento TMS › Configuración › Portal e IA › Clave de la API del portal** (si está vacía, no se exige).
- En esa misma pantalla, **URL del portal** debe apuntar a donde se publique esta app: con ella Odoo arma los enlaces de
  los emails ("Hacer la entrevista") y los botones "Ver en el portal".
- Las imágenes (logo, noticias, imágenes de preguntas) se piden a Odoo con la clave y se reenvían por `/api/...`.
- Los datos se leen siempre en el momento de la visita (`connection()`), nunca quedan fijos en el build.

## Puesta en marcha

```bash
cp .env.example .env.local   # y completá los valores
npm install
npm run dev                  # http://localhost:3000
```

| Variable | Descripción |
| --- | --- |
| `ODOO_URL` | URL de Odoo, p. ej. `https://scambria84-transolrepository.odoo.com` |
| `ODOO_DB` | Base de datos (solo si la instancia tiene varias) |
| `RECLUTAMIENTO_API_KEY` | Clave compartida; igual a "Clave de la API del portal" en Odoo |

## Producción

```bash
npm run build
npm start
```

Los adjuntos de la postulación (CV y documentos) viajan en una Server Action: cada archivo hasta 10 MB y 25 MB en
total (`experimental.serverActions.bodySizeLimit` en `next.config.ts`). Si el portal está detrás de un proxy
(nginx, etc.), su límite de tamaño de cuerpo tiene que permitir al menos 30 MB.
