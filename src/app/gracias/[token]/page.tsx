import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso, BotonLink, container } from "@/components/ui";
import { parseToken } from "@/lib/image-proxy";
import { getPostulacion } from "@/lib/odoo";

export const metadata: Metadata = { title: "¡Gracias por postularte!" };

export default function GraciasPage({ params }: PageProps<"/gracias/[token]">) {
  return (
    <section className="py-24 text-center">
      <div className={container}>
        <Suspense fallback={<div className="mx-auto h-40 max-w-lg animate-pulse rounded-md bg-gris-claro" />}>
          <Gracias params={params} />
        </Suspense>
      </div>
    </section>
  );
}

async function Gracias({ params }: { params: PageProps<"/gracias/[token]">["params"] }) {
  const token = parseToken((await params).token);
  if (!token) notFound();
  const postulacion = await getPostulacion(token);
  if (postulacion === "not_found") notFound();
  if (postulacion === null) return <Aviso>No pudimos cargar tu postulación. Volvé a intentar en unos minutos.</Aviso>;
  return (
    <>
      <div className="mx-auto mb-5 grid size-18 place-items-center rounded-full bg-verde text-4xl text-white">✓</div>
      <h1 className="mb-3 text-3xl font-light sm:text-4xl">
        ¡Gracias, <span className="text-verde">{postulacion.nombre}</span>!
      </h1>
      <p className="mb-6 text-lg">
        Recibimos tu postulación <b>{postulacion.name}</b> a <b>{postulacion.vacante}</b>.
      </p>
      {postulacion.entrevista_token ? (
        <>
          <p className="mb-6 text-lg">Para completar tu postulación hacé la entrevista en línea. Te lleva unos minutos.</p>
          <BotonLink href={`/entrevista/${postulacion.entrevista_token}`}>Hacer la entrevista</BotonLink>
        </>
      ) : (
        <p className="mb-6 text-lg">El equipo de Selección revisará tu perfil y se comunicará con vos.</p>
      )}
      <p className="mt-6">
        <Link href="/" className="font-semibold text-verde-oscuro">
          Volver al inicio
        </Link>
      </p>
    </>
  );
}
