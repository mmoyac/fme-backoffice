'use client';

import { FiltroCompartido, FILTRO_VACIO } from './filtroCompartido';
import { useEffect, useState } from 'react';
import { getLocales, Local } from '@/lib/api/locales';
import { ConteoResumen, iniciarConteo, listarConteos, TipoConteo } from '@/lib/api/conteos';
import { ConteoDetalleView } from './ConteoDetalleView';
import DataList from '@/components/ui/DataList';

export const ESTADO_CONTEO: Record<string, { label: string; color: string }> = {
  EN_PROCESO: { label: 'En proceso', color: 'bg-yellow-500' },
  FINALIZADO: { label: 'Finalizado', color: 'bg-green-600' },
  CANCELADO: { label: 'Cancelado', color: 'bg-gray-500' },
};

export const formatFechaConteo = (f?: string | null) =>
  f
    ? new Date(f).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-';

const antiguedad = (f: string) => {
  const horas = Math.floor((Date.now() - new Date(f).getTime()) / 3_600_000);
  return horas < 1 ? 'hace < 1 h' : horas < 48 ? `hace ${horas} h` : `hace ${Math.floor(horas / 24)} días`;
};

export function ConteoTab({ conteoInicialId, localPropio = null, filtroCompartido = FILTRO_VACIO }: { conteoInicialId?: number | null; localPropio?: number | null; filtroCompartido?: FiltroCompartido }) {
  const [conteos, setConteos] = useState<ConteoResumen[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const { local: filtroLocal, setLocal: setFiltroLocal } = filtroCompartido;
  const [filtroEstado, setFiltroEstado] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seleccionado, setSeleccionado] = useState<number | null>(conteoInicialId ?? null);

  // Modal nuevo conteo
  const [modal, setModal] = useState(false);
  const [nuevoLocal, setNuevoLocal] = useState(0);
  const [nuevoTipo, setNuevoTipo] = useState<TipoConteo>('COMPLETO');
  const [nuevaObs, setNuevaObs] = useState('');
  const [creando, setCreando] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  useEffect(() => {
    getLocales().then((l) => setLocales(l.filter((x) => x.activo !== false))).catch(console.error);
  }, []);

  useEffect(() => {
    if (conteoInicialId) setSeleccionado(conteoInicialId);
  }, [conteoInicialId]);

  useEffect(() => {
    if (seleccionado === null) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroLocal, filtroEstado, seleccionado]);

  const cargar = async () => {
    try {
      setLoading(true);
      setError('');
      setConteos(await listarConteos({ local_id: filtroLocal || undefined, estado: filtroEstado || undefined }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const crear = async () => {
    if (!nuevoLocal) {
      setErrorModal('Seleccione un local');
      return;
    }
    try {
      setCreando(true);
      setErrorModal('');
      const c = await iniciarConteo({ local_id: nuevoLocal, tipo: nuevoTipo, observacion: nuevaObs || undefined });
      setModal(false);
      setNuevaObs('');
      setSeleccionado(c.id);
    } catch (e: any) {
      setErrorModal(e.message);
    } finally {
      setCreando(false);
    }
  };

  if (seleccionado !== null) {
    return <ConteoDetalleView conteoId={seleccionado} onVolver={() => setSeleccionado(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-wrap gap-3">
          {!localPropio && (
          <select
            value={filtroLocal}
            onChange={(e) => setFiltroLocal(Number(e.target.value))}
            className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2"
          >
            <option value={0}>Todos los locales</option>
            {locales.map((l) => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
          )}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2"
          >
            <option value="">Todos los estados</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="FINALIZADO">Finalizado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
        <button
          onClick={() => { setModal(true); setErrorModal(''); if (localPropio) setNuevoLocal(localPropio); }}
          className="px-4 py-2 bg-primary text-slate-900 font-semibold rounded-lg hover:opacity-90"
        >
          + Nuevo conteo
        </button>
      </div>

      {error && <div className="bg-red-900/40 border border-red-700 text-red-200 rounded-lg p-3">{error}</div>}

      {loading ? (
        <div className="text-gray-400 py-8 text-center">Cargando conteos...</div>
      ) : conteos.length === 0 ? (
        <div className="text-gray-400 py-8 text-center bg-slate-800 rounded-lg">No hay conteos registrados</div>
      ) : (
        <DataList
          items={conteos}
          getKey={(c) => c.id}
          onItemClick={(c) => setSeleccionado(c.id)}
          columns={[
            { header: '#', className: 'w-[6%]', cell: (c) => <span className="font-semibold">{c.id}</span> },
            { header: 'Local', className: 'w-[15%]', cell: (c) => c.local_nombre },
            { header: 'Tipo', className: 'w-[9%]', cell: (c) => (c.tipo === 'COMPLETO' ? 'Completo' : 'Parcial') },
            {
              header: 'Estado',
              className: 'w-[17%]',
              sinTruncar: true,
              cell: (c) => (
                <>
                  <span className={`${ESTADO_CONTEO[c.estado]?.color} text-white px-2 py-1 rounded text-xs font-semibold`}>
                    {ESTADO_CONTEO[c.estado]?.label}
                  </span>
                  {c.estado === 'EN_PROCESO' && <span className="ml-2 text-xs text-yellow-300">{antiguedad(c.fecha_inicio)}</span>}
                </>
              ),
            },
            {
              header: 'Iniciado',
              className: 'w-[17%]',
              cell: (c) => (
                <>
                  <div>{formatFechaConteo(c.fecha_inicio)}</div>
                  <div className="text-xs text-gray-400 truncate">{c.usuario_creador}</div>
                </>
              ),
            },
            {
              header: 'Cerrado',
              className: 'w-[17%]',
              cell: (c) => (
                <>
                  <div>{formatFechaConteo(c.fecha_cierre)}</div>
                  <div className="text-xs text-gray-400 truncate">{c.usuario_cierre || ''}</div>
                </>
              ),
            },
            { header: 'Contados', className: 'w-[9%] text-right', sinTruncar: true, cell: (c) => `${c.items_contados} / ${c.total_items}` },
            {
              header: 'Con dif.',
              className: 'w-[10%] text-right',
              sinTruncar: true,
              cell: (c) => <span className={`font-semibold ${c.items_con_diferencia ? 'text-orange-300' : ''}`}>{c.items_con_diferencia}</span>,
            },
          ]}
          card={(c) => (
            <div className="space-y-2 text-gray-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-white font-semibold">
                    Conteo #{c.id} · <span className="font-normal">{c.tipo === 'COMPLETO' ? 'Completo' : 'Parcial'}</span>
                  </div>
                  <div className="text-sm text-gray-300 break-words">{c.local_nombre}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`${ESTADO_CONTEO[c.estado]?.color} text-white px-2 py-1 rounded text-xs font-semibold`}>
                    {ESTADO_CONTEO[c.estado]?.label}
                  </span>
                  {c.estado === 'EN_PROCESO' && <div className="text-xs text-yellow-300 mt-1">{antiguedad(c.fecha_inicio)}</div>}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span>Contados: {c.items_contados} / {c.total_items}</span>
                <span className={c.items_con_diferencia ? 'text-orange-300 font-semibold' : ''}>Con diferencia: {c.items_con_diferencia}</span>
              </div>
              <div className="text-xs text-gray-400 pt-2 border-t border-slate-700">
                Iniciado {formatFechaConteo(c.fecha_inicio)} · {c.usuario_creador}
                {c.fecha_cierre && <> · Cerrado {formatFechaConteo(c.fecha_cierre)} · {c.usuario_cierre || ''}</>}
              </div>
            </div>
          )}
        />
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl font-bold text-white">Nuevo conteo de inventario</h3>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Local</label>
              <select
                value={nuevoLocal}
                onChange={(e) => setNuevoLocal(Number(e.target.value))}
                disabled={!!localPropio}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 disabled:opacity-70"
              >
                <option value={0}>Seleccione...</option>
                {locales.map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                {(['COMPLETO', 'PARCIAL'] as TipoConteo[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNuevoTipo(t)}
                    className={`px-3 py-3 rounded-lg border text-left ${nuevoTipo === t ? 'border-primary bg-slate-700 text-white' : 'border-slate-600 text-gray-300'}`}
                  >
                    <div className="font-semibold">{t === 'COMPLETO' ? 'Completo' : 'Parcial'}</div>
                    <div className="text-xs text-gray-400">
                      {t === 'COMPLETO' ? 'Todos los productos del local' : 'Elige productos o categorías'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Observación (opcional)</label>
              <input
                value={nuevaObs}
                onChange={(e) => setNuevaObs(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                placeholder="Ej: conteo mensual noviembre"
              />
            </div>
            {errorModal && <div className="text-red-300 text-sm">{errorModal}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-gray-300 hover:text-white">Cancelar</button>
              <button
                onClick={crear}
                disabled={creando}
                className="px-4 py-2 bg-primary text-slate-900 font-semibold rounded-lg disabled:opacity-50"
              >
                {creando ? 'Creando...' : 'Iniciar conteo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
