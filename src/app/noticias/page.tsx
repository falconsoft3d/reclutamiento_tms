import { Suspense } from "react";
import type { Metadata } from "next";
import { GrillaSkeleton, NoticiaCard } from "@/components/cards";
import { Aviso, Hero, Kicker, container } from "@/components/ui";
import { getNoticias } from "@/lib/odoo";

export const metadata: Metadata = { title: "Noticias" };

export default function NoticiasPage() {
  return (
    <>
      <Hero imagen="/banda.jpg" chico>
        <Kicker>Novedades</Kicker>
        <h1 className="mt-1.5 text-4xl font-light sm:text-5xl">Noticias</h1>
      </Hero>
      <section className="py-14">
        <div className={container}>
          <Suspense fallback={<GrillaSkeleton cantidad={6} />}>
            <Lista />
          </Suspense>
        </div>
      </section>
    </>
  );
}

async function Lista() {
  const noticias = await getNoticias();
  if (noticias === null) return <Aviso>No pudimos cargar las noticias. Volvé a intentar en unos minutos.</Aviso>;
  if (noticias.length === 0) return <Aviso>Todavía no hay noticias publicadas.</Aviso>;
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {noticias.map((noticia) => (
        <NoticiaCard key={noticia.id} noticia={noticia} />
      ))}
    </div>
  );
}
