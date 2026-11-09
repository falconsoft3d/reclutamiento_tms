/** "2026-11-30" -> "30 de noviembre de 2026" (sin depender de la zona horaria del servidor). */
export function formatFecha(fecha: string | null) {
  if (!fecha) return "";
  const [anio, mes, dia] = fecha.split("-").map(Number);
  if (!anio || !mes || !dia) return fecha;
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(anio, mes - 1, dia)),
  );
}

/** Solo se enlazan URLs http(s) que vienen de Odoo. */
export function safeUrl(url: string) {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}
