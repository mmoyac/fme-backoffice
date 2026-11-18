'use client';

import { useState, useEffect } from 'react';
import { getLocales, deleteLocal, type Local } from '@/lib/api/locales';
import Link from 'next/link';
import DataList from '@/components/ui/DataList';
import PageHeader from '@/components/ui/PageHeader';

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

  const estado = (local: Local) => (
    <span className={local.activo ? 'text-green-400' : 'text-red-400'}>{local.activo ? 'Activo' : 'Inactivo'}</span>
  );

  const acciones = (local: Local) => (
    <div className="flex flex-wrap gap-x-3 gap-y-1 sm:justify-end">
      <Link href={`/admin/locales/${local.id}`} className="text-primary hover:text-primary-dark">
        Editar
      </Link>
      <button onClick={() => handleDelete(local.id)} className="text-red-400 hover:text-red-300">
        Eliminar
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Locales"
        actions={
          <Link
            href="/admin/locales/nuevo"
            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg text-center"
          >
            + Nuevo Local
          </Link>
        }
      />

      <DataList
        items={locales}
        getKey={(l) => l.id}
        empty="No hay locales. Crea uno nuevo para comenzar."
        columns={[
          { header: 'Código', className: 'w-[14%]', cell: (l) => <span className="text-gray-300 font-mono">{l.codigo}</span> },
          { header: 'Nombre', className: 'w-[24%]', cell: (l) => <span className="text-white font-medium" title={l.nombre}>{l.nombre}</span> },
          { header: 'Dirección', className: 'w-[32%]', cell: (l) => <span className="text-gray-400" title={l.direccion || undefined}>{l.direccion || '-'}</span> },
          { header: 'Estado', className: 'w-[12%]', sinTruncar: true, cell: estado },
          { header: 'Acciones', className: 'w-[18%] text-right', sinTruncar: true, cell: acciones },
        ]}
        card={(l) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-white font-medium break-words">{l.nombre}</div>
                <div className="text-xs text-gray-400 font-mono">{l.codigo}</div>
              </div>
              <div className="shrink-0 text-sm">{estado(l)}</div>
            </div>
            <div className="text-sm text-gray-400 break-words">{l.direccion || '-'}</div>
            <div className="pt-2 border-t border-slate-700 text-sm">{acciones(l)}</div>
          </div>
        )}
      />
    </div>
  );
}
