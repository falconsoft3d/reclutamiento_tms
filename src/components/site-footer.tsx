import Link from "next/link";
import { getSitio } from "@/lib/odoo";
import { container } from "./ui";

const titulo = "mb-3 font-semibold tracking-widest text-white";

export async function SiteFooter() {
  const sitio = await getSitio();
  const empresa = sitio?.empresa;
  const anio = new Date().getFullYear();
  return (
    <footer className="mt-auto bg-negro pt-11 text-[0.95rem] text-white/75">
      <div className={`${container} grid gap-7 pb-8 sm:grid-cols-3`}>
        <div>
          <p className={titulo}>{(empresa?.name || "").toUpperCase()}</p>
          <p className="text-lg font-light text-verde">Al servicio de las grandes empresas</p>
        </div>
        <div className="space-y-1.5">
          <p className={titulo}>CONTACTO</p>
          {empresa?.street && (
            <p>
              {empresa.street}
              {empresa.city && `, ${empresa.city}`}
              {empresa.zip && ` (CP ${empresa.zip})`}
            </p>
          )}
          {empresa?.phone && (
            <p>
              Tel.:{" "}
              <a href={`tel:${empresa.phone}`} className="hover:text-verde">
                {empresa.phone}
              </a>
            </p>
          )}
          {empresa?.email && (
            <p>
              <a href={`mailto:${empresa.email}`} className="hover:text-verde">
                {empresa.email}
              </a>
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <p className={titulo}>TRABAJÁ CON NOSOTROS</p>
          <p>
            <Link href="/#busquedas" className="hover:text-verde">
              Ver búsquedas activas
            </Link>
          </p>
          {sitio?.hay_noticias && (
            <p>
              <Link href="/noticias" className="hover:text-verde">
                Noticias
              </Link>
            </p>
          )}
        </div>
      </div>
      <p className="border-t border-white/10 p-4 text-center text-sm">
        © {anio} {empresa?.name} - Todos los derechos reservados
      </p>
    </footer>
  );
}

export function SiteFooterSkeleton() {
  return <footer className="mt-auto h-56 bg-negro" />;
}
