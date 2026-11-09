"use server";

import { parseToken } from "@/lib/image-proxy";
import { getEntrevista, responderEntrevista, type ResultadoEntrevista, type RespuestaChat } from "@/lib/odoo";

/** Estado del chat; con `iniciar` arranca la entrevista si está pendiente. */
export async function cargarEntrevista(token: string, iniciar: boolean): Promise<ResultadoEntrevista> {
  const valido = parseToken(token);
  if (!valido) return { ok: false, error: "not_found" };
  return getEntrevista(valido, iniciar);
}

/** Envía la respuesta del candidato a la pregunta actual. */
export async function responder(token: string, respuesta: RespuestaChat): Promise<ResultadoEntrevista> {
  const valido = parseToken(token);
  if (!valido) return { ok: false, error: "not_found" };
  const limpia: RespuestaChat = {};
  if (respuesta.valor === "si" || respuesta.valor === "no") limpia.valor = respuesta.valor;
  if (Number.isInteger(respuesta.opcion_id) && (respuesta.opcion_id ?? 0) > 0) limpia.opcion_id = respuesta.opcion_id;
  if (typeof respuesta.texto === "string") limpia.texto = respuesta.texto.slice(0, 3000);
  return responderEntrevista(valido, limpia);
}
