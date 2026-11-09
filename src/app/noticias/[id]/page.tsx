import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso, BotonLink } from "@/components/ui";
import { formatFecha } from "@/lib/format";
import { parseId } from "@/lib/image-proxy";
import { getNoticia } from "@/lib/odoo";

export const metadata: Metadata = { title: "Noticia" };

export default function NoticiaPage({ params }: PageProps<"/noticias/[id]">) {
  return (
    <article className="py-12">
      <div className="mx-auto w-full max-w-3xl px-4">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-gris-claro" />}>
          <Noticia params={params} />
        </Suspense>
      </div>
    </article>
  );
}

async function Noticia({ params }: { params: PageProps<"/noticias/[id]">["params"] }) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const noticia = await getNoticia(id);
  if (noticia === "not_found") notFound();
  if (noticia === null) return <Aviso>No pudimos cargar la noticia. Volvé a intentar en unos minutos.</Aviso>;
  return (
    <>
      <Link href="/noticias" className="mb-4 inline-block text-sm text-gris hover:text-verde-oscuro">
        ← Noticias
      </Link>
      <p className="text-xs font-bold tracking-[0.12em] text-verde-oscuro uppercase">{formatFecha(noticia.fecha)}</p>
      <h1 className="mt-1.5 mb-5 text-3xl font-semibold sm:text-4xl">{noticia.name}</h1>
      {noticia.has_image && (
        <Image
          src={`/api/noticias/${noticia.id}/imagen`}
          alt={noticia.name}
          width={1600}
          height={900}
          unoptimized
          className="mb-5 h-auto w-full rounded-md"
        />
      )}
      {noticia.resumen && <p className="mb-5 text-xl font-light text-gris-oscuro">{noticia.resumen}</p>}
      {/* HTML sanitizado por Odoo (campo Html de la noticia). */}
      <div className="contenido-html" dangerouslySetInnerHTML={{ __html: noticia.contenido }} />
      {noticia.vacante && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-md bg-verde-claro p-5">
          <p>
            Esta noticia tiene una búsqueda abierta: <b>{noticia.vacante.name}</b>
          </p>
          <BotonLink href={`/busquedas/${noticia.vacante.id}`}>Postularme</BotonLink>
        </div>
      )}
    </>
  );
}
