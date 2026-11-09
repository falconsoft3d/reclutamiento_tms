import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const container = "mx-auto w-full max-w-6xl px-4";

const botonBase =
  "inline-flex items-center justify-center gap-2 rounded-md border-2 px-6 py-2.5 font-semibold tracking-wide transition disabled:cursor-wait disabled:opacity-60";
export const boton = `${botonBase} border-verde bg-verde text-white hover:border-verde-oscuro hover:bg-verde-oscuro`;
export const botonLinea = `${botonBase} border-verde bg-transparent text-verde-oscuro hover:bg-verde-claro`;

export function BotonLink({ href, children, linea = false }: { href: string; children: ReactNode; linea?: boolean }) {
  return (
    <Link href={href} className={linea ? botonLinea : boton}>
      {children}
    </Link>
  );
}

/** Título con una parte en verde: <Titulo resaltado="activas">Búsquedas</Titulo>. */
export function Titulo({
  children,
  resaltado,
  as: Tag = "h2",
  className = "",
}: {
  children: ReactNode;
  resaltado?: ReactNode;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <Tag className={`text-3xl font-light sm:text-4xl ${className}`}>
      {children} {resaltado && <span className="text-verde">{resaltado}</span>}
    </Tag>
  );
}

export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-xs font-bold tracking-[0.18em] text-verde uppercase ${className}`}>{children}</p>;
}

export function Hero({
  imagen = "/hero.jpg",
  chico = false,
  children,
}: {
  imagen?: string;
  chico?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`foto-oscura text-white ${chico ? "py-14 sm:py-16" : "py-20 sm:py-28"}`}
      style={{ backgroundImage: `url('${imagen}')` }}
    >
      <div className={container}>{children}</div>
    </section>
  );
}

export function Aviso({ children, ...props }: ComponentProps<"div">) {
  return (
    <div className="rounded-lg bg-gris-claro p-8 text-center text-gris" {...props}>
      {children}
    </div>
  );
}
