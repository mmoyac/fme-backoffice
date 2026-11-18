'use client';

import { FiltroCompartido, FILTRO_VACIO } from './filtroCompartido';
import { useState, useEffect } from 'react';
import { listarMovimientos, MovimientoInventario } from '@/lib/api/movimientos';
import { getLocales, Local } from '@/lib/api/locales';
import DataList from '@/components/ui/DataList';

export function HistorialTab({ onVerConteo, localPropio = null, filtroCompartido = FILTRO_VACIO }: { onVerConteo?: (conteoId: number) => void; localPropio?: number | null; filtroCompartido?: FiltroCompartido } = {}) {
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const { busqueda, setBusqueda } = filtroCompartido;
  const [filtroTexto, setFiltroTexto] = useState(busqueda);
  const { local: filtroLocal, setLocal: setFiltroLocal } = filtroCompartido;
  const [filtroTipo, setFiltroTipo] = useState<string>('');

  useEffect(() => {
    cargarDatos();
  }, []);

  // Búsqueda por nombre o SKU con debounce (se filtra en el backend)
  useEffect(() => {
    const t = setTimeout(() => setFiltroTexto(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    cargarMovimientos();
  }, [filtroTexto, filtroLocal, filtroTipo]);

  const cargarDatos = async () => {
    try {
      setLocales(await getLocales());
    } catch (err) {
      console.error('Error al cargar datos:', err);
    }
  };

  const cargarMovimientos = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listarMovimientos(
        undefined,
        filtroLocal || undefined,
        filtroTipo || undefined,
        filtroTexto || undefined
      );
      setMovimientos(data);
    } catch (err) {
      setError('Error al cargar el historial de movimientos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTipoLabel = (tipo: string) => {
    const tipos: { [key: string]: { label: string; color: string } } = {
      'TRANSFERENCIA': { label: 'Transferencia', color: 'bg-blue-500' },
      'PEDIDO': { label: 'Pedido', color: 'bg-purple-500' },
      'AJUSTE': { label: 'Ajuste', color: 'bg-yellow-500' },
      'MERMA': { label: 'Merma', color: 'bg-orange-500' },
      'AJUSTE_CONTEO': { label: 'Ajuste por conteo', color: 'bg-teal-600' },
      'ENTRADA_INICIAL': { label: 'Entrada Inicial', color: 'bg-green-500' }
    };
    return tipos[tipo] || { label: tipo, color: 'bg-gray-500' };
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const verConteo = (m: MovimientoInventario) =>
    m.tipo_movimiento === 'AJUSTE_CONTEO' && m.referencia_id && onVerConteo ? (
      <button
        onClick={(e) => { e.stopPropagation(); onVerConteo(m.referencia_id!); }}
        className="text-teal-300 hover:underline mr-2"
      >
        Ver conteo #{m.referencia_id}
      </button>
    ) : null;

  return (
    <div className="space-y-6">

      {/* Filtros */}
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Buscar producto
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto o SKU..."
              className="w-full bg-slate-700 text-white placeholder-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Usuario de tienda: el backend ya limita a su local (add-inventario-alcance-por-local) */}
          {!localPropio && (<div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Filtrar por Local
            </label>
            <select
              value={filtroLocal}
              onChange={(e) => setFiltroLocal(Number(e.target.value))}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
            >
              <option value={0}>Todos los locales</option>
              {locales.map(local => (
                <option key={local.id} value={local.id}>
                  {local.nombre}
                </option>
              ))}
            </select>
          </div>)}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Filtrar por Tipo
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos los tipos</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="PEDIDO">Pedido</option>
              <option value="AJUSTE">Ajuste</option>
              <option value="MERMA">Merma</option>
              <option value="AJUSTE_CONTEO">Ajuste por conteo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Total Movimientos</p>
          <p className="text-2xl font-bold text-white">{movimientos.length}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Transferencias</p>
          <p className="text-2xl font-bold text-blue-500">
            {movimientos.filter(m => m.tipo_movimiento === 'TRANSFERENCIA').length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Por Pedidos</p>
          <p className="text-2xl font-bold text-purple-500">
            {movimientos.filter(m => m.tipo_movimiento === 'PEDIDO').length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Ajustes</p>
          <p className="text-2xl font-bold text-yellow-500">
            {movimientos.filter(m => m.tipo_movimiento === 'AJUSTE').length}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-400 mt-4">Cargando movimientos...</p>
        </div>
      ) : movimientos.length === 0 ? (
        <div className="text-center py-12 bg-slate-800 rounded-lg">
          <p className="text-gray-400 text-lg">No hay movimientos para mostrar</p>
        </div>
      ) : (
        <DataList
          items={movimientos}
          getKey={(m) => m.id}
          columns={[
            { header: 'Fecha', className: 'w-[13%]', sinTruncar: true, cell: (m) => <span className="text-gray-300">{formatFecha(m.fecha_movimiento)}</span> },
            {
              header: 'Tipo',
              className: 'w-[13%]',
              sinTruncar: true,
              cell: (m) => {
                const t = getTipoLabel(m.tipo_movimiento);
                return <span className={`${t.color} text-white px-2 py-1 rounded text-xs font-semibold inline-block break-all`}>{t.label}</span>;
              },
            },
            {
              header: 'Producto',
              className: 'w-[19%]',
              cell: (m) => (
                <>
                  <div className="text-white font-medium truncate" title={m.producto?.nombre}>{m.producto?.nombre}</div>
                  <div className="text-xs text-gray-400">SKU: {m.producto?.sku}</div>
                </>
              ),
            },
            {
              header: 'Origen → Destino',
              className: 'w-[15%]',
              cell: (m) => (
                <span className="text-gray-300" title={`${m.local_origen?.nombre || '-'} → ${m.local_destino?.nombre || '-'}`}>
                  {m.local_origen?.nombre || '-'} → {m.local_destino?.nombre || '-'}
                </span>
              ),
            },
            { header: 'Cant.', className: 'w-[8%] text-right', sinTruncar: true, cell: (m) => <span className="text-white font-semibold">{m.cantidad}</span> },
            { header: 'Usuario', className: 'w-[10%]', cell: (m) => <span className="text-gray-300" title={m.usuario}>{m.usuario}</span> },
            {
              header: 'Notas',
              className: 'w-[22%]',
              cell: (m) => (
                <span className="text-gray-400" title={m.notas || undefined}>
                  {verConteo(m)}
                  {m.notas || '-'}
                </span>
              ),
            },
          ]}
          card={(m) => {
            const t = getTipoLabel(m.tipo_movimiento);
            return (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white font-medium break-words">{m.producto?.nombre}</div>
                    <div className="text-xs text-gray-400">SKU: {m.producto?.sku}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-white">{m.cantidad}</div>
                    <span className={`${t.color} text-white px-2 py-0.5 rounded text-xs font-semibold`}>{t.label}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-300">
                  {m.local_origen?.nombre || '-'} → {m.local_destino?.nombre || '-'}
                </div>
                <div className="text-xs text-gray-400">
                  {formatFecha(m.fecha_movimiento)} · {m.usuario}
                </div>
                {(m.notas || (m.tipo_movimiento === 'AJUSTE_CONTEO' && m.referencia_id)) && (
                  <div className="text-xs text-gray-400 break-words pt-2 border-t border-slate-700">
                    {verConteo(m)}
                    {m.notas}
                  </div>
                )}
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
