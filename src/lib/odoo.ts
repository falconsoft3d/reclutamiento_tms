import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";

/*
 * Cliente de la API JSON del módulo reclutamiento_tms de Odoo (/reclutamiento_tms/api).
 * Solo se usa en el servidor: la clave RECLUTAMIENTO_API_KEY nunca llega al navegador.
 */

export type Empresa = {
  name: string;
  street: string;
  city: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  has_logo: boolean;
};

export type Sitio = { empresa: Empresa; hay_noticias: boolean };

export type VacanteResumen = {
  id: number;
  name: string;
  department: string;
  ubicacion: string;
  modalidad: string;
  /** YYYY-MM-DD */
  fecha_cierre: string | null;
};

export type TipoCampo = "texto" | "texto_largo" | "booleano" | "seleccion" | "multiple" | "documento";

export type Campo = {
  id: number;
  name: string;
  ayuda: string;
  tipo: TipoCampo;
  requerido: boolean;
  opciones: { id: number; name: string }[];
};

export type Grupo = { categoria: string; descripcion: string; campos: Campo[] };

export type VacanteDetalle = VacanteResumen & {
  /** HTML ya sanitizado por Odoo. */
  descripcion: string;
  referencias_minimas: number;
  tiene_entrevistas: boolean;
  grupos: Grupo[];
};

export type NoticiaResumen = {
  id: number;
  name: string;
  fecha: string | null;
  resumen: string;
  has_image: boolean;
  destacada: boolean;
};

export type NoticiaDetalle = NoticiaResumen & {
  /** HTML ya sanitizado por Odoo. */
  contenido: string;
  vacante: { id: number; name: string } | null;
};

export type PostulacionInfo = { name: string; nombre: string; vacante: string; entrevista_token: string | null };

export type Archivo = { nombre: string; datos: string };

export type Referencia = { empresa: string; contacto: string; cargo: string; telefono: string; email: string };

export type NuevaPostulacion = {
  datos: { nombre: string; apellido: string; email: string; telefono: string; documento: string; ubicacion: string };
  cv: Archivo | null;
  referencias: Referencia[];
  /** Por id de campo: texto, "si"/"no", id de opción o lista de ids. */
  respuestas: Record<string, string | string[]>;
  archivos: Record<string, Archivo>;
};

export type ResultadoPostulacion =
  | { ok: true; token: string; entrevista_token: string | null }
  | { ok: false; errores: string[] };

export type MensajeChat = { rol: "bot" | "candidato"; contenido: string; imagen: number | false };

export type Esperando = {
  tipo: "booleano" | "opciones" | "calculo" | "abierta";
  opciones: { id: number; name: string }[];
  unidad: string;
};

export type EstadoEntrevista = {
  estado: "pendiente" | "en_curso" | "terminada" | "cancelada";
  nombre: string;
  vacante: string;
  mensajes: MensajeChat[];
  esperando: Esperando | null;
  progreso: { actual: number; total: number };
  siguiente: { nombre: string; token: string } | null;
};

export type RespuestaChat = { valor?: "si" | "no"; opcion_id?: number; texto?: string };

const PREFIJO = "/reclutamiento_tms/api";

export function odooUrl(ruta: string) {
  const base = process.env.ODOO_URL;
  if (!base) throw new Error("ODOO_URL no está definida");
  const url = new URL(`${PREFIJO}${ruta}`, base);
  if (process.env.ODOO_DB) url.searchParams.set("db", process.env.ODOO_DB);
  return url;
}

export function odooHeaders(json = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  if (process.env.RECLUTAMIENTO_API_KEY) headers["X-Reclutamiento-Key"] = process.env.RECLUTAMIENTO_API_KEY;
  return headers;
}

/** Llama a la API y devuelve `{ status, data }`, o `null` si Odoo no respondió. */
async function odooFetch(ruta: string, init: RequestInit = {}, timeoutMs = 15_000) {
  // Siempre en el momento de la visita: los datos de Odoo nunca quedan fijos en el build.
  await connection();
  try {
    const res = await fetch(odooUrl(ruta), {
      ...init,
      headers: odooHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  } catch (error) {
    // Errores internos de Next (p. ej. fin del prerender) no se deben tragar.
    unstable_rethrow(error);
    console.error(`[odoo] ${ruta}: no se pudo conectar`, error);
    return null;
  }
}

export async function getSitio(): Promise<Sitio | null> {
  const r = await odooFetch("/sitio");
  return r?.data?.ok ? { empresa: r.data.empresa, hay_noticias: r.data.hay_noticias } : null;
}

export async function getVacantes(): Promise<VacanteResumen[] | null> {
  const r = await odooFetch("/vacantes");
  return r?.data?.ok ? r.data.vacantes : null;
}

/** `"not_found"` si la vacante no existe o ya no está publicada. */
export async function getVacante(id: number): Promise<VacanteDetalle | "not_found" | null> {
  const r = await odooFetch(`/vacantes/${id}`);
  if (r?.status === 404) return "not_found";
  return r?.data?.ok ? r.data.vacante : null;
}

export async function postular(id: number, postulacion: NuevaPostulacion): Promise<ResultadoPostulacion> {
  const r = await odooFetch(`/vacantes/${id}/postular`, { method: "POST", body: JSON.stringify(postulacion) }, 60_000);
  if (r?.data?.ok) return { ok: true, token: r.data.token, entrevista_token: r.data.entrevista_token };
  if (r?.status === 422 && Array.isArray(r.data?.errores)) return { ok: false, errores: r.data.errores };
  if (r?.status === 404) return { ok: false, errores: ["Esta búsqueda ya no recibe postulaciones."] };
  return { ok: false, errores: ["No pudimos enviar tu postulación. Intentá de nuevo en unos minutos."] };
}

export async function getPostulacion(token: string): Promise<PostulacionInfo | "not_found" | null> {
  const r = await odooFetch(`/postulaciones/${encodeURIComponent(token)}`);
  if (r?.status === 404) return "not_found";
  return r?.data?.ok ? r.data.postulacion : null;
}

export async function getNoticias(limite?: number): Promise<NoticiaResumen[] | null> {
  const r = await odooFetch(`/noticias${limite ? `?limite=${limite}` : ""}`);
  return r?.data?.ok ? r.data.noticias : null;
}

export async function getNoticia(id: number): Promise<NoticiaDetalle | "not_found" | null> {
  const r = await odooFetch(`/noticias/${id}`);
  if (r?.status === 404) return "not_found";
  return r?.data?.ok ? r.data.noticia : null;
}

export type ResultadoEntrevista =
  | { ok: true; entrevista: EstadoEntrevista; mensajeError: string | null }
  | { ok: false; error: "not_found" | "unavailable" };

function resultadoEntrevista(r: Awaited<ReturnType<typeof odooFetch>>): ResultadoEntrevista {
  if (r?.data?.ok) return { ok: true, entrevista: r.data.entrevista, mensajeError: r.data.mensaje_error ?? null };
  return { ok: false, error: r?.status === 404 ? "not_found" : "unavailable" };
}

export async function getEntrevista(token: string, iniciar: boolean): Promise<ResultadoEntrevista> {
  const r = await odooFetch(`/entrevista/${encodeURIComponent(token)}`, {
    method: "POST",
    body: JSON.stringify({ iniciar }),
  });
  return resultadoEntrevista(r);
}

export async function responderEntrevista(token: string, respuesta: RespuestaChat): Promise<ResultadoEntrevista> {
  // La IA puede repreguntar: se le da más tiempo que al resto de las llamadas.
  const r = await odooFetch(
    `/entrevista/${encodeURIComponent(token)}/responder`,
    { method: "POST", body: JSON.stringify(respuesta) },
    90_000,
  );
  return resultadoEntrevista(r);
}
