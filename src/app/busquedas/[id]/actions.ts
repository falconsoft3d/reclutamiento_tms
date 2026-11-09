"use server";

import { redirect } from "next/navigation";
import { postular, type Archivo, type NuevaPostulacion, type Referencia } from "@/lib/odoo";

const MAX_ARCHIVO = 10 * 1024 * 1024;

function texto(formData: FormData, clave: string, largo = 200) {
  const valor = formData.get(clave);
  return typeof valor === "string" ? valor.trim().slice(0, largo) : "";
}

async function archivo(valor: FormDataEntryValue | null): Promise<Archivo | null | "grande"> {
  if (!(valor instanceof File) || valor.size === 0) return null;
  if (valor.size > MAX_ARCHIVO) return "grande";
  const datos = Buffer.from(await valor.arrayBuffer()).toString("base64");
  return { nombre: valor.name.slice(0, 200), datos };
}

/** Envía la postulación a Odoo. Si sale bien redirige a la entrevista (o al agradecimiento); si no, devuelve los errores. */
export async function enviarPostulacion(vacanteId: number, formData: FormData): Promise<string[]> {
  if (!Number.isInteger(vacanteId) || vacanteId <= 0) return ["Búsqueda no válida."];
  if (formData.get("sitio_web")) redirect("/"); // trampa para bots

  const errores: string[] = [];
  const cv = await archivo(formData.get("cv"));
  if (cv === "grande") errores.push("El CV supera los 10 MB.");

  const columnas = ["empresa", "contacto", "cargo", "telefono", "email"] as const;
  const listas = columnas.map((c) => formData.getAll(`ref_${c}`).map((v) => (typeof v === "string" ? v.trim().slice(0, 200) : "")));
  const referencias: Referencia[] = listas[0].slice(0, 20).map((_, i) => ({
    empresa: listas[0][i] ?? "",
    contacto: listas[1][i] ?? "",
    cargo: listas[2][i] ?? "",
    telefono: listas[3][i] ?? "",
    email: listas[4][i] ?? "",
  }));

  const respuestas: NuevaPostulacion["respuestas"] = {};
  const archivos: NuevaPostulacion["archivos"] = {};
  for (const clave of new Set(formData.keys())) {
    const campo = /^campo_(\d+)$/.exec(clave);
    if (campo) {
      const valores = formData.getAll(clave).filter((v): v is string => typeof v === "string");
      respuestas[campo[1]] = valores.length > 1 ? valores : (valores[0] ?? "").slice(0, 2000);
      continue;
    }
    const adjunto = /^archivo_(\d+)$/.exec(clave);
    if (adjunto) {
      const datos = await archivo(formData.get(clave));
      if (datos === "grande") errores.push("Un documento supera los 10 MB.");
      else if (datos) archivos[adjunto[1]] = datos;
    }
  }
  // Las casillas de opción múltiple llegan como valores sueltos: se mandan siempre como lista.
  for (const clave of formData.getAll("campos_multiples")) {
    if (typeof clave === "string" && /^\d+$/.test(clave)) {
      const valor = respuestas[clave];
      respuestas[clave] = Array.isArray(valor) ? valor : valor ? [valor] : [];
    }
  }
  if (errores.length) return errores;

  const resultado = await postular(vacanteId, {
    datos: {
      nombre: texto(formData, "nombre", 100),
      apellido: texto(formData, "apellido", 100),
      email: texto(formData, "email"),
      telefono: texto(formData, "telefono", 50),
      documento: texto(formData, "documento", 30),
      ubicacion: texto(formData, "ubicacion", 150),
    },
    cv: cv === "grande" ? null : cv,
    referencias,
    respuestas,
    archivos,
  });
  if (!resultado.ok) return resultado.errores;
  redirect(resultado.entrevista_token ? `/entrevista/${resultado.entrevista_token}` : `/gracias/${resultado.token}`);
}
