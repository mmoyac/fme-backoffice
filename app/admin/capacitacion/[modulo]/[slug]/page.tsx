'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ErrorCapacitacion,
  getIndice,
  getLeccion,
  type LeccionResumen,
  type SeccionCapacitacion,
} from '@/lib/api/capacitacion';

// Visor de una lección (change OpenSpec fme-backend: add-centro-capacitacion, D5).
// El HTML se pide con el token y se muestra en un iframe srcdoc con sandbox="allow-scripts"
// SIN allow-same-origin: el script de la lección corre en un origen opaco y no puede leer
// localStorage (token), cookies ni el DOM del backoffice.
const ALTO_MIN = 400;
const ALTO_MAX = 20000;
const ALTO_SIN_MENSAJE = 800;

export default function LeccionPage({ params }: { params: { modulo: string; slug: string } }) {
  const { modulo, slug } = params;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<{ status: number; mensaje: string } | null>(null);
  const [seccion, setSeccion] = useState<SeccionCapacitacion | null>(null);
  const [alto, setAlto] = useState<number | null>(null);

  useEffect(() => {
    setHtml(null);
    setError(null);
    setAlto(null);
    getLeccion(modulo, slug)
      .then(setHtml)
      .catch((e) =>
        setError({
          status: e instanceof ErrorCapacitacion ? e.status : 0,
          mensaje: e.message || 'Error al cargar la lección',
        }),
      );
    getIndice()
      .then((secs) => setSeccion(secs.find((s) => s.modulo === modulo) ?? null))
      .catch(() => setSeccion(null));
  }, [modulo, slug]);

  // Ajuste de alto: solo se aceptan mensajes que vengan de NUESTRO iframe
  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (!iframeRef.current || ev.source !== iframeRef.current.contentWindow) return;
      const d = ev.data;
      if (d && d.tipo === 'capacitacion:alto' && typeof d.alto === 'number' && isFinite(d.alto)) {
        setAlto(Math.min(ALTO_MAX, Math.max(ALTO_MIN, Math.ceil(d.alto))));
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const lecciones: LeccionResumen[] = seccion?.lecciones ?? [];
  const idx = lecciones.findIndex((l) => l.slug === slug);
  const anterior = idx > 0 ? lecciones[idx - 1] : null;
  const siguiente = idx >= 0 && idx < lecciones.length - 1 ? lecciones[idx + 1] : null;

  const navegacion = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      {anterior ? (
        <Link href={`/admin/capacitacion/${modulo}/${anterior.slug}`} className="text-primary hover:underline">
          ← {anterior.titulo}
        </Link>
      ) : (
        <span />
      )}
      {siguiente ? (
        <Link href={`/admin/capacitacion/${modulo}/${siguiente.slug}`} className="text-primary hover:underline">
          {siguiente.titulo} →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/admin/capacitacion" className="text-gray-300 hover:text-white">
          ← Volver a Capacitación
        </Link>
        {seccion && idx >= 0 && (
          <span className="text-sm text-gray-400">
            {seccion.nombre} · Lección {idx + 1} de {lecciones.length}
          </span>
        )}
      </div>

      {error ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">{error.status === 403 ? '🔒' : '📭'}</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            {error.status === 403
              ? 'Esta capacitación no está disponible en tu plan'
              : error.status === 404
                ? 'No encontramos esta lección'
                : 'No se pudo cargar la lección'}
          </h2>
          <p className="text-gray-400">
            {error.status === 403 ? error.mensaje : error.status === 404 ? 'Puede que se haya movido o eliminado.' : error.mensaje}
          </p>
        </div>
      ) : html === null ? (
        <p className="text-gray-400">Cargando lección...</p>
      ) : (
        <>
          <iframe
            ref={iframeRef}
            title={`Lección ${slug}`}
            srcDoc={html}
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            className="w-full rounded-xl border border-slate-700 bg-slate-900"
            style={{ height: alto ?? ALTO_SIN_MENSAJE }}
            scrolling={alto ? 'no' : 'auto'}
          />
          {navegacion}
        </>
      )}
    </div>
  );
}
