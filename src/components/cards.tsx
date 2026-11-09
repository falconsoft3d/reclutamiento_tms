import Link from "next/link";
import type { NoticiaResumen, VacanteResumen } from "@/lib/odoo";
import { formatFecha } from "@/lib/format";

const tarjeta =
  "flex flex-col overflow-hidden rounded-md bg-white text-negro shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(0,0,0,0.12)]";

export function VacanteMeta({ vacante, claro = false }: { vacante: VacanteResumen; claro?: boolean }) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 text-sm ${claro ? "text-white/85" : "text-gris"}`}>
      {vacante.ubicacion && <li>📍 {vacante.ubicacion}</li>}
      {vacante.modalidad && <li>🕒 {vacante.modalidad}</li>}
      {vacante.fecha_cierre && <li>📅 Hasta el {formatFecha(vacante.fecha_cierre)}</li>}
    </ul>
  );
}

export function VacanteCard({ vacante }: { vacante: VacanteResumen }) {
  return (
    <Link href={`/busquedas/${vacante.id}`} className={`${tarjeta} border-t-4 border-verde p-6`}>
      <span className="text-xs font-bold tracking-[0.12em] text-verde-oscuro uppercase">
        {vacante.department || "Búsqueda"}
      </span>
      <h3 className="mt-1.5 mb-3 text-xl font-semibold">{vacante.name}</h3>
      <VacanteMeta vacante={vacante} />
      <span className="mt-auto pt-4 font-semibold text-verde-oscuro">Ver y postularme →</span>
    </Link>
  );
}

export function NoticiaCard({ noticia }: { noticia: NoticiaResumen }) {
  return (
    <Link href={`/noticias/${noticia.id}`} className={tarjeta}>
      {noticia.has_image ? (
        <div
          className="h-44 bg-cover bg-center"
          style={{ backgroundImage: `url('/api/noticias/${noticia.id}/imagen')` }}
          role="img"
          aria-label={noticia.name}
        />
      ) : (
        <div className="h-44 bg-gradient-to-br from-gris-oscuro to-negro" />
      )}
      <div className="flex flex-1 flex-col p-5">
        <span className="text-xs font-bold tracking-[0.12em] text-verde-oscuro uppercase">
          {formatFecha(noticia.fecha)}
        </span>
        <h3 className="mt-1.5 mb-2 text-xl font-semibold">{noticia.name}</h3>
        {noticia.resumen && <p className="text-gris">{noticia.resumen}</p>}
        <span className="mt-auto pt-4 font-semibold text-verde-oscuro">Leer más →</span>
      </div>
    </Link>
  );
}

export function GrillaSkeleton({ cantidad = 3 }: { cantidad?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-md bg-gris-claro" />
      ))}
    </div>
  );
}
