"use client";

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { boton, botonLinea } from "@/components/ui";
import type { Campo, Grupo } from "@/lib/odoo";
import { enviarPostulacion } from "./actions";

const MAX_TOTAL = 25 * 1024 * 1024;
const MAX_REFERENCIAS = 20;

const input =
  "w-full min-w-0 rounded border border-[#c9d0c9] bg-white px-3 py-2.5 text-base font-normal text-negro outline-none focus:border-verde focus:ring-3 focus:ring-verde/20";
const etiqueta = "flex flex-col gap-1.5 text-sm font-semibold";
const ayuda = "text-sm font-normal text-gris";

function Paso({ numero, titulo, children, descripcion }: { numero: number; titulo: string; children: ReactNode; descripcion?: string }) {
  return (
    <fieldset className="min-w-0 rounded-md border border-borde bg-white p-5 sm:p-6">
      <legend className="sr-only">{titulo}</legend>
      <h2 className="mb-4 flex items-center gap-2.5 text-lg font-semibold" aria-hidden="true">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-verde text-sm text-white">{numero}</span>
        {titulo}
      </h2>
      {descripcion && <p className={`${ayuda} -mt-2 mb-4`}>{descripcion}</p>}
      {children}
    </fieldset>
  );
}

function Chip({ type, name, value, children, required }: { type: "radio" | "checkbox"; name: string; value: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="relative cursor-pointer font-normal">
      <input type={type} name={name} value={value} required={required} className="peer absolute inset-0 cursor-pointer opacity-0" />
      <span className="inline-block rounded-full border border-[#c9d0c9] bg-white px-4 py-2 transition peer-checked:border-verde peer-checked:bg-verde peer-checked:font-semibold peer-checked:text-white peer-focus-visible:ring-3 peer-focus-visible:ring-verde/30">
        {children}
      </span>
    </label>
  );
}

function Archivo({ name, required, accept, texto }: { name: string; required?: boolean; accept: string; texto: string }) {
  const [nombre, setNombre] = useState<string | null>(null);
  return (
    <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-md border-2 border-dashed border-[#b9c4b9] bg-gris-claro p-4 font-normal hover:border-verde">
      <input
        type="file"
        name={name}
        required={required}
        accept={accept}
        className="max-w-full text-sm"
        onChange={(e) => setNombre(e.target.files?.[0]?.name ?? null)}
      />
      <span className="text-sm text-gris">{nombre ?? texto}</span>
    </label>
  );
}

function CampoDinamico({ campo }: { campo: Campo }) {
  const nombre = `campo_${campo.id}`;
  const titulo = `${campo.name}${campo.requerido ? " *" : ""}`;
  const pie = campo.ayuda ? <small className={ayuda}>{campo.ayuda}</small> : null;

  switch (campo.tipo) {
    case "texto":
      return (
        <label className={etiqueta}>
          {titulo}
          <input type="text" name={nombre} maxLength={500} required={campo.requerido} className={input} />
          {pie}
        </label>
      );
    case "texto_largo":
      return (
        <label className={`${etiqueta} sm:col-span-2`}>
          {titulo}
          <textarea name={nombre} rows={3} maxLength={2000} required={campo.requerido} className={input} />
          {pie}
        </label>
      );
    case "booleano":
      return (
        <div className={`${etiqueta} sm:col-span-2`} role="radiogroup" aria-label={campo.name}>
          <span>{titulo}</span>
          <div className="flex flex-wrap gap-2">
            <Chip type="radio" name={nombre} value="si" required={campo.requerido}>
              Sí
            </Chip>
            <Chip type="radio" name={nombre} value="no">
              No
            </Chip>
          </div>
          {pie}
        </div>
      );
    case "seleccion":
    case "multiple": {
      const multiple = campo.tipo === "multiple";
      return (
        <div className={`${etiqueta} sm:col-span-2`} role={multiple ? "group" : "radiogroup"} aria-label={campo.name}>
          <span>
            {titulo}
            {multiple && <em className="font-normal text-gris"> (podés marcar varias)</em>}
          </span>
          {multiple && <input type="hidden" name="campos_multiples" value={campo.id} />}
          <div className="flex flex-wrap gap-2">
            {campo.opciones.map((opcion, i) => (
              <Chip
                key={opcion.id}
                type={multiple ? "checkbox" : "radio"}
                name={nombre}
                value={String(opcion.id)}
                required={!multiple && campo.requerido && i === 0}
              >
                {opcion.name}
              </Chip>
            ))}
          </div>
          {pie}
        </div>
      );
    }
    case "documento":
      return (
        <div className={`${etiqueta} sm:col-span-2`}>
          <span>{titulo}</span>
          <Archivo
            name={`archivo_${campo.id}`}
            required={campo.requerido}
            accept=".pdf,.docx,.jpg,.jpeg,.png,.webp"
            texto="PDF, Word o imagen, hasta 10 MB"
          />
          {pie}
        </div>
      );
  }
}

export function PostulacionForm({
  vacanteId,
  grupos,
  referenciasMinimas,
  tieneEntrevistas,
}: {
  vacanteId: number;
  grupos: Grupo[];
  referenciasMinimas: number;
  tieneEntrevistas: boolean;
}) {
  const minimo = Math.max(referenciasMinimas, 1);
  const [filas, setFilas] = useState(() => Array.from({ length: minimo }, (_, i) => i));
  const [errores, setErrores] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const alerta = useRef<HTMLDivElement>(null);

  function mostrar(lista: string[]) {
    setErrores(lista);
    requestAnimationFrame(() => alerta.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const total = [...formData.values()].reduce((suma, v) => suma + (v instanceof File ? v.size : 0), 0);
    if (total > MAX_TOTAL) {
      mostrar(["Los archivos adjuntos superan los 25 MB en total. Reducí su tamaño e intentá de nuevo."]);
      return;
    }
    startTransition(async () => {
      // Si Odoo acepta la postulación, la acción redirige a la entrevista o al agradecimiento.
      const resultado = await enviarPostulacion(vacanteId, formData);
      if (resultado.length) mostrar(resultado);
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          No completar <input type="text" name="sitio_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div ref={alerta} aria-live="assertive">
        {errores.length > 0 && (
          <div role="alert" className="rounded-md border border-[#f3c3c2] bg-rojo-claro p-4 text-[#8a1f1e]">
            <b>Revisá estos datos:</b>
            <ul className="mt-1.5 list-disc pl-5">
              {errores.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Paso numero={1} titulo="Datos personales">
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <label className={etiqueta}>
            Nombre *
            <input type="text" name="nombre" required maxLength={100} autoComplete="given-name" className={input} />
          </label>
          <label className={etiqueta}>
            Apellido *
            <input type="text" name="apellido" required maxLength={100} autoComplete="family-name" className={input} />
          </label>
          <label className={etiqueta}>
            Email *
            <input type="email" name="email" required maxLength={200} autoComplete="email" className={input} />
          </label>
          <label className={etiqueta}>
            Teléfono *
            <input type="tel" name="telefono" required maxLength={50} autoComplete="tel" className={input} />
          </label>
          <label className={etiqueta}>
            DNI / CUIT / CUIL *
            <input type="text" name="documento" required maxLength={30} inputMode="numeric" className={input} />
          </label>
          <label className={etiqueta}>
            Ubicación (Provincia / Localidad)
            <input type="text" name="ubicacion" maxLength={150} className={input} />
          </label>
        </div>
      </Paso>

      <Paso numero={2} titulo="Currículum Vitae">
        <Archivo
          name="cv"
          required
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          texto="Elegí tu CV en PDF o Word (.docx), hasta 10 MB"
        />
      </Paso>

      <Paso
        numero={3}
        titulo="Referencias laborales"
        descripcion={`Cargá al menos ${referenciasMinimas} referencias de empresas donde trabajaste: empresa, persona de contacto, su cargo y un teléfono o email.`}
      >
        <div className="grid gap-3">
          {filas.map((fila, indice) => (
            <div key={fila} className="grid items-center gap-2 border-b border-borde pb-3 sm:grid-cols-[repeat(5,minmax(0,1fr))_2rem] sm:border-0 sm:pb-0">
              <input type="text" name="ref_empresa" placeholder="Empresa" maxLength={200} aria-label={`Empresa de la referencia ${indice + 1}`} className={input} />
              <input type="text" name="ref_contacto" placeholder="Persona de contacto" maxLength={200} aria-label="Persona de contacto" className={input} />
              <input type="text" name="ref_cargo" placeholder="Cargo del contacto" maxLength={200} aria-label="Cargo del contacto" className={input} />
              <input type="tel" name="ref_telefono" placeholder="Teléfono" maxLength={50} aria-label="Teléfono" className={input} />
              <input type="email" name="ref_email" placeholder="Email" maxLength={200} aria-label="Email" className={input} />
              {filas.length > minimo ? (
                <button
                  type="button"
                  onClick={() => setFilas((actual) => actual.filter((f) => f !== fila))}
                  aria-label="Quitar referencia"
                  className="justify-self-end text-2xl leading-none text-gris hover:text-rojo"
                >
                  ×
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
        {filas.length < MAX_REFERENCIAS && (
          <button
            type="button"
            onClick={() => setFilas((actual) => [...actual, Math.max(...actual) + 1])}
            className={`${botonLinea} mt-4`}
          >
            + Agregar referencia
          </button>
        )}
      </Paso>

      {grupos.map((grupo, indice) => (
        <Paso key={grupo.categoria} numero={indice + 4} titulo={grupo.categoria} descripcion={grupo.descripcion || undefined}>
          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
            {grupo.campos.map((campo) => (
              <CampoDinamico key={campo.id} campo={campo} />
            ))}
          </div>
        </Paso>
      ))}

      <div className="text-center">
        <p className={`${ayuda} mb-4`}>
          Al postularte aceptás que usemos tus datos solo para este proceso de selección.
          {tieneEntrevistas && " Después vas a hacer una breve entrevista en línea."}
        </p>
        <button type="submit" disabled={pending} className={`${boton} px-10 py-3.5 text-lg`}>
          {pending ? "Enviando…" : "Postularme"}
        </button>
      </div>
    </form>
  );
}
