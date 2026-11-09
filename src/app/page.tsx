import { Suspense } from "react";
import Link from "next/link";
import { GrillaSkeleton, NoticiaCard, VacanteCard } from "@/components/cards";
import { Aviso, Hero, Kicker, Titulo, boton, container } from "@/components/ui";
import { getNoticias, getVacantes } from "@/lib/odoo";

export default function Inicio() {
  return (
    <>
      <Hero>
        <Kicker>Recursos humanos</Kicker>
        <Titulo as="h1" resaltado="con nosotros" className="mt-2 mb-5 text-4xl sm:text-6xl">
          Trabajá
        </Titulo>
        <p className="mb-7 max-w-2xl text-lg font-light text-white/85">
          Sumate a un equipo con más de 30 años en el transporte y la distribución de sustancias peligrosas y
          generales, donde la seguridad, la calidad y el cuidado del ambiente son lo primero.
        </p>
        <a href="#busquedas" className={boton}>
          Ver búsquedas activas
        </a>
      </Hero>

      <section id="busquedas" className="scroll-mt-20 py-16">
        <div className={container}>
          <Titulo resaltado="activas" className="mb-7">
            Búsquedas
          </Titulo>
          <Suspense fallback={<GrillaSkeleton />}>
            <Vacantes />
          </Suspense>
        </div>
      </section>

      <section className="foto-oscura py-18 text-white" style={{ backgroundImage: "url('/banda.jpg')" }}>
        <div className={`${container} grid items-center gap-8 md:grid-cols-[1fr_1.6fr]`}>
          <Titulo resaltado="sumarte?">¿Por qué</Titulo>
          <ul className="grid gap-4 text-lg font-light">
            {[
              ["Seguridad primero.", "Capacitación permanente y procesos certificados ISO 9001, 39001, 14001 y 45001."],
              ["Flota moderna.", "Unidades en excelente estado y mantenimiento propio."],
              ["Crecimiento.", "Búsquedas internas para que el equipo crezca dentro de la empresa."],
            ].map(([titulo, texto]) => (
              <li key={titulo} className="border-l-[3px] border-verde pl-4">
                <b className="font-semibold text-verde-claro">{titulo}</b> {texto}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Suspense fallback={null}>
        <UltimasNoticias />
      </Suspense>
    </>
  );
}

async function Vacantes() {
  const vacantes = await getVacantes();
  if (vacantes === null) {
    return <Aviso>No pudimos cargar las búsquedas. Volvé a intentar en unos minutos.</Aviso>;
  }
  if (vacantes.length === 0) {
    return (
      <Aviso>
        <p>En este momento no tenemos búsquedas abiertas.</p>
        <p>Volvé a visitarnos pronto: publicamos nuevas oportunidades con frecuencia.</p>
      </Aviso>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {vacantes.map((vacante) => (
        <VacanteCard key={vacante.id} vacante={vacante} />
      ))}
    </div>
  );
}

async function UltimasNoticias() {
  const noticias = await getNoticias(3);
  if (!noticias?.length) return null;
  return (
    <section className="bg-gris-claro py-16">
      <div className={container}>
        <div className="mb-7 flex flex-wrap items-baseline justify-between gap-4">
          <Titulo resaltado="noticias">Últimas</Titulo>
          <Link href="/noticias" className="font-semibold text-verde-oscuro">
            Ver todas →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {noticias.map((noticia) => (
            <NoticiaCard key={noticia.id} noticia={noticia} />
          ))}
        </div>
      </div>
    </section>
  );
}
