"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { boton, botonLinea } from "@/components/ui";
import type { EstadoEntrevista, RespuestaChat, ResultadoEntrevista } from "@/lib/odoo";
import { cargarEntrevista, responder } from "./actions";

const campo =
  "min-w-0 flex-1 rounded-md border border-[#c9d0c9] px-3 py-2.5 text-base outline-none focus:border-verde focus:ring-3 focus:ring-verde/20";

export function Chat({ token }: { token: string }) {
  const [estado, setEstado] = useState<EstadoEntrevista | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noDisponible, setNoDisponible] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, startTransition] = useTransition();
  const log = useRef<HTMLDivElement>(null);

  function aplicar(resultado: ResultadoEntrevista) {
    if (!resultado.ok) {
      if (resultado.error === "not_found") setNoDisponible(true);
      else setError("No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
      return false;
    }
    setEstado(resultado.entrevista);
    setError(resultado.mensajeError);
    return !resultado.mensajeError;
  }

  useEffect(() => {
    let activo = true;
    cargarEntrevista(token, true).then((resultado) => {
      if (activo) aplicar(resultado);
    });
    return () => {
      activo = false;
    };
  }, [token]);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [estado?.mensajes.length, enviando]);

  function enviar(respuesta: RespuestaChat) {
    if (enviando) return;
    startTransition(async () => {
      if (aplicar(await responder(token, respuesta))) setTexto("");
    });
  }

  if (noDisponible) {
    return (
      <div className="rounded-md bg-white p-10 text-center shadow">
        <h1 className="mb-3 text-3xl font-light">
          Entrevista <span className="text-verde">no disponible</span>
        </h1>
        <p className="mb-6 text-lg">El enlace no es válido o la entrevista todavía no está habilitada.</p>
        <Link href="/" className={boton}>
          Volver al inicio
        </Link>
      </div>
    );
  }

  const esperando = estado?.esperando;
  const progreso = estado?.progreso;
  const porcentaje = progreso?.total
    ? Math.round((100 * (estado?.estado === "terminada" ? progreso.total : Math.max(progreso.actual - 1, 0))) / progreso.total)
    : 0;

  return (
    <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-md bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-negro px-5 py-4 text-white">
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-verde uppercase">{estado?.vacante ?? " "}</p>
          <h1 className="text-xl font-semibold">{estado?.nombre ?? "Entrevista"}</h1>
        </div>
        {progreso && progreso.total > 0 && (
          <div className="min-w-40 text-sm text-white/80" aria-live="polite">
            {estado?.estado === "terminada" ? "Terminada" : `Pregunta ${Math.max(progreso.actual, 1)} de ${progreso.total}`}
            <div className="mt-1 h-1.5 overflow-hidden rounded bg-white/20">
              <div className="h-full bg-verde transition-[width]" style={{ width: `${porcentaje}%` }} />
            </div>
          </div>
        )}
      </header>

      <div ref={log} role="log" aria-live="polite" className="flex max-h-[60vh] flex-1 flex-col gap-3 overflow-y-auto bg-gris-claro p-5">
        {!estado && !error && <p className="text-gris">Cargando la entrevista…</p>}
        {estado?.mensajes.map((mensaje, i) => (
          <div
            key={i}
            className={`max-w-[88%] rounded-2xl px-4 py-2.5 leading-relaxed break-words whitespace-pre-wrap ${
              mensaje.rol === "bot"
                ? "self-start rounded-bl-sm border border-borde bg-white"
                : "self-end rounded-br-sm bg-verde text-white"
            }`}
          >
            {mensaje.contenido}
            {mensaje.imagen !== false && (
              <a href={`/api/entrevista/${token}/imagen/${mensaje.imagen}`} target="_blank" rel="noopener noreferrer">
                <Image
                  src={`/api/entrevista/${token}/imagen/${mensaje.imagen}`}
                  alt="Imagen de la pregunta"
                  width={640}
                  height={480}
                  unoptimized
                  className="mt-2 max-h-80 w-auto rounded-lg"
                />
              </a>
            )}
          </div>
        ))}
        {enviando && <p className="self-start text-sm text-gris italic">Escribiendo…</p>}
      </div>

      {error && (
        <p role="alert" className="mx-5 mt-3 rounded bg-rojo-claro px-3 py-2 text-sm text-[#8a1f1e]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2.5 border-t border-borde p-5">
        {estado?.estado === "terminada" ? (
          <div className="w-full text-center">
            {estado.siguiente ? (
              <>
                <p className="mb-3">Tenés otra entrevista pendiente: {estado.siguiente.nombre}.</p>
                <Link href={`/entrevista/${estado.siguiente.token}`} className={boton}>
                  Continuar
                </Link>
              </>
            ) : (
              <Link href="/" className={boton}>
                Volver al inicio
              </Link>
            )}
          </div>
        ) : esperando?.tipo === "booleano" ? (
          <>
            <button type="button" disabled={enviando} onClick={() => enviar({ valor: "si" })} className={`${boton} flex-1`}>
              Sí
            </button>
            <button type="button" disabled={enviando} onClick={() => enviar({ valor: "no" })} className={`${botonLinea} flex-1`}>
              No
            </button>
          </>
        ) : esperando?.tipo === "opciones" ? (
          esperando.opciones.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              disabled={enviando}
              onClick={() => enviar({ opcion_id: opcion.id })}
              className={`${botonLinea} flex-auto`}
            >
              {opcion.name}
            </button>
          ))
        ) : esperando ? (
          <form
            className="flex w-full flex-wrap items-end gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (texto.trim()) enviar({ texto });
            }}
          >
            {esperando.tipo === "calculo" ? (
              <label className="flex flex-1 items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  maxLength={30}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Escribí el resultado"
                  aria-label="Resultado"
                  className={campo}
                  autoFocus
                />
                {esperando.unidad && <span className="font-semibold">{esperando.unidad}</span>}
              </label>
            ) : (
              <textarea
                rows={3}
                maxLength={3000}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && texto.trim()) enviar({ texto });
                }}
                placeholder="Escribí tu respuesta…"
                aria-label="Tu respuesta"
                className={`${campo} resize-y`}
                autoFocus
              />
            )}
            <button type="submit" disabled={enviando || !texto.trim()} className={boton}>
              Enviar
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
