'use client';

import { useState, useEffect } from 'react';
import { getLocales, deleteLocal, type Local } from '@/lib/api/locales';
import Link from 'next/link';

export default function LocalesPage() {
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLocales();
  }, []);

  async function loadLocales() {
    try {
      const data = await getLocales();
      setLocales(data);
    } catch (err) {
      alert('Error al cargar locales');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este local?')) return;
    try {
      await deleteLocal(id);
      await loadLocales();
    } catch (err) {
      alert('Error al eliminar local');
      console.error(err);
    }
  }

  if (loading) {
    return <div className="text-gray-400">Cargando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Locales</h1>
        <Link
          href="/admin/locales/nuevo"
          className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg"
        >
          + Nuevo Local
        </Link>
      </div>

      {locales.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-gray-400">
          No hay locales. Crea uno nuevo para comenzar.
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Código</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Dirección</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Estado</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {locales.map((local) => (
                <tr key={local.id} className="hover:bg-slate-700/50">
                  <td className="px-6 py-4 text-sm text-gray-300 font-mono">{local.codigo}</td>
                  <td className="px-6 py-4 text-sm text-white font-medium">{local.nombre}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{local.direccion || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={local.activo ? 'text-green-400' : 'text-red-400'}>
                      {local.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right space-x-2">
                    <Link href={`/admin/locales/${local.id}`} className="text-primary hover:text-primary-dark">
                      Editar
                    </Link>
                    <button onClick={() => handleDelete(local.id)} className="text-red-400 hover:text-red-300">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
