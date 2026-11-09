import { BotonLink, container } from "@/components/ui";

export default function NotFound() {
  return (
    <section className="py-24 text-center">
      <div className={container}>
        <h1 className="mb-3 text-3xl font-light">
          Página <span className="text-verde">no encontrada</span>
        </h1>
        <p className="mb-6 text-lg">El enlace no es válido o ya no está disponible.</p>
        <BotonLink href="/">Volver al inicio</BotonLink>
      </div>
    </section>
  );
}
