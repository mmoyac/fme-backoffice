'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getIndice, type SeccionCapacitacion } from '@/lib/api/capacitacion';

// Centro de Capacitación: índice por sección (change OpenSpec fme-backend: add-centro-capacitacion)
export default function CapacitacionPage() {
  const [secciones, setSecciones] = useState<SeccionCapacitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getIndice()
      .then(setSecciones)
      .catch((e) => setError(e.message || 'Error al cargar la capacitación'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">🎓 Capacitación</h1>
        <p className="text-gray-400 mt-1">
          Lecciones interactivas para aprender a usar los módulos de tu plan, a tu ritmo.
        </p>
      </div>

      {loading && <p className="text-gray-400">Cargando...</p>}
      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-4">{error}</div>}
      {!loading && !error && secciones.length === 0 && (
        <p className="text-gray-400">Todavía no hay lecciones disponibles para tu plan.</p>
      )}

      {secciones.map((s) => (
        <section key={s.modulo} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-1">{s.nombre}</h2>
          <p className="text-sm text-gray-400 mb-4">
            {s.lecciones.length} {s.lecciones.length === 1 ? 'lección' : 'lecciones'}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {s.lecciones.map((l, i) => (
              <Link
                key={l.slug}
                href={`/admin/capacitacion/${s.modulo}/${l.slug}`}
                className="block bg-slate-700/60 hover:bg-slate-700 border border-slate-600 hover:border-primary rounded-lg p-4 transition-colors"
              >
                <div className="text-xs text-primary font-semibold mb-1">Lección {i + 1}</div>
                <div className="text-white font-medium">{l.titulo}</div>
                {l.descripcion && <div className="text-sm text-gray-400 mt-1">{l.descripcion}</div>}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
