import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VacanteMeta } from "@/components/cards";
import { Aviso, BotonLink, Hero, Kicker, container } from "@/components/ui";
import { getVacante } from "@/lib/odoo";
import { parseId } from "@/lib/image-proxy";
import { PostulacionForm } from "./postulacion-form";

export const metadata: Metadata = { title: "Búsqueda laboral" };

export default function VacantePage({ params }: PageProps<"/busquedas/[id]">) {
  return (
    <Suspense fallback={<VacanteSkeleton />}>
      <VacanteView params={params} />
    </Suspense>
  );
}

async function VacanteView({ params }: { params: PageProps<"/busquedas/[id]">["params"] }) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const vacante = await getVacante(id);
  if (vacante === "not_found") {
    return (
      <section className="py-24 text-center">
        <div className={container}>
          <h1 className="mb-3 text-3xl font-light">
            Búsqueda <span className="text-verde">cerrada</span>
          </h1>
          <p className="mb-6 text-lg">Esta búsqueda ya no recibe postulaciones.</p>
          <BotonLink href="/#busquedas">Ver búsquedas activas</BotonLink>
        </div>
      </section>
    );
  }
  if (vacante === null) {
    return (
      <div className={`${container} py-16`}>
        <Aviso>No pudimos cargar la búsqueda. Volvé a intentar en unos minutos.</Aviso>
      </div>
    );
  }

  return (
    <>
      <Hero chico>
        <Link href="/#busquedas" className="mb-3 inline-block text-sm text-white/80 hover:text-verde">
          ← Búsquedas activas
        </Link>
        <Kicker>{vacante.department || "Búsqueda laboral"}</Kicker>
        <h1 className="mt-1.5 mb-3 text-3xl font-light sm:text-5xl">{vacante.name}</h1>
        <VacanteMeta vacante={vacante} claro />
      </Hero>
      <section className="py-12">
        <div className={`${container} grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]`}>
          <aside className="rounded-md border border-borde p-6 lg:sticky lg:top-24">
            <h2 className="mb-3 text-lg font-semibold">Sobre el puesto</h2>
            {vacante.descripcion ? (
              // HTML sanitizado por Odoo (campo Html de la vacante).
              <div className="contenido-html" dangerouslySetInnerHTML={{ __html: vacante.descripcion }} />
            ) : (
              <p className="text-gris">Completá el formulario y te contactamos.</p>
            )}
          </aside>
          <PostulacionForm
            vacanteId={vacante.id}
            grupos={vacante.grupos}
            referenciasMinimas={vacante.referencias_minimas}
            tieneEntrevistas={vacante.tiene_entrevistas}
          />
        </div>
      </section>
    </>
  );
}

function VacanteSkeleton() {
  return (
    <>
      <section className="h-56 bg-negro" />
      <div className={`${container} grid gap-8 py-12 lg:grid-cols-[1fr_1.7fr]`}>
        <div className="h-64 animate-pulse rounded-md bg-gris-claro" />
        <div className="h-96 animate-pulse rounded-md bg-gris-claro" />
      </div>
    </>
  );
}
