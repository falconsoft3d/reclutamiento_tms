import Image from "next/image";
import Link from "next/link";
import { getSitio } from "@/lib/odoo";
import { safeUrl } from "@/lib/format";
import { container } from "./ui";

const linkClass =
  "block rounded px-3.5 py-2.5 text-sm font-semibold tracking-wider text-negro hover:bg-verde-claro hover:text-verde-oscuro";

function Marca({ nombre, logo }: { nombre: string; logo: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 text-xl font-bold tracking-wider text-negro">
      {logo ? (
        <Image src="/api/empresa/logo" alt={nombre} width={160} height={44} unoptimized className="h-11 w-auto" />
      ) : (
        <span>{nombre.toUpperCase()}</span>
      )}
    </Link>
  );
}

function Nav({ hayNoticias, website }: { hayNoticias: boolean; website: string | null }) {
  const links = (
    <>
      <li>
        <Link href="/" className={linkClass}>
          INICIO
        </Link>
      </li>
      <li>
        <Link href="/#busquedas" className={linkClass}>
          BÚSQUEDAS
        </Link>
      </li>
      {hayNoticias && (
        <li>
          <Link href="/noticias" className={linkClass}>
            NOTICIAS
          </Link>
        </li>
      )}
      {website && (
        <li>
          <a href={website} target="_blank" rel="noopener noreferrer" className={linkClass}>
            SITIO WEB
          </a>
        </li>
      )}
    </>
  );
  return (
    <>
      <ul className="hidden items-center gap-1 md:flex">{links}</ul>
      {/* Menú del celular sin JavaScript */}
      <details className="relative md:hidden">
        <summary className="flex cursor-pointer list-none flex-col gap-1.5 p-2" aria-label="Menú">
          <span className="block h-0.5 w-6 bg-negro" />
          <span className="block h-0.5 w-6 bg-negro" />
          <span className="block h-0.5 w-6 bg-negro" />
        </summary>
        <ul className="absolute right-0 z-30 mt-2 w-56 rounded-md bg-white p-2 shadow-lg">{links}</ul>
      </details>
    </>
  );
}

function Barra({ children }: { children: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b-[3px] border-verde bg-white shadow-sm">
      <nav className={`${container} flex min-h-16 items-center justify-between`}>{children}</nav>
    </header>
  );
}

export async function SiteHeader() {
  const sitio = await getSitio();
  return (
    <Barra>
      <Marca nombre={sitio?.empresa.name || "Trabajá con nosotros"} logo={!!sitio?.empresa.has_logo} />
      <Nav hayNoticias={!!sitio?.hay_noticias} website={sitio?.empresa.website ? safeUrl(sitio.empresa.website) : null} />
    </Barra>
  );
}

export function SiteHeaderSkeleton() {
  return (
    <Barra>
      <span className="h-6 w-40 animate-pulse rounded bg-gris-claro" />
      <Nav hayNoticias={false} website={null} />
    </Barra>
  );
}
