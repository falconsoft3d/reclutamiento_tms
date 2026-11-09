import { connection } from "next/server";
import { odooHeaders, odooUrl } from "./odoo";

/** Reenvía una imagen de Odoo al navegador (la API exige la clave, que solo conoce el servidor). */
export async function proxyOdooImage(ruta: string, maxAgeSeconds = 3600) {
  await connection();
  try {
    const res = await fetch(odooUrl(ruta), {
      headers: odooHeaders(false),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok || !res.body) return new Response("No encontrado", { status: 404 });
    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": `public, max-age=${maxAgeSeconds}`,
      },
    });
  } catch (error) {
    console.error(`[odoo] imagen ${ruta}: no se pudo conectar`, error);
    return new Response("No disponible", { status: 502 });
  }
}

export function parseId(value: string) {
  return /^\d{1,9}$/.test(value) ? Number(value) : null;
}

/** Los tokens de Odoo son uuid4 en hexadecimal (32 caracteres). */
export function parseToken(value: string) {
  return /^[a-f0-9]{32}$/.test(value) ? value : null;
}
