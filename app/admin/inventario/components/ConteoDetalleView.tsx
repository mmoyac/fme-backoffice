'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCategorias, CategoriaProducto } from '@/lib/api/maestras';
import { getProductos, Producto } from '@/lib/api/productos';
import {
  agregarItems, cancelarConteo, ConteoDetalle, ConteoItem, descargarExcelConteo, finalizarConteo,
  obtenerConteo, quitarItem, registrarCantidad,
} from '@/lib/api/conteos';
import { ESTADO_CONTEO, formatFechaConteo } from './ConteoTab';

const fmt = (n?: number | null) => (n === null || n === undefined ? '-' : Number(n).toLocaleString('es-CL', { maximumFractionDigits: 3 }));

export function ConteoDetalleView({ conteoId, onVolver }: { conteoId: number; onVolver: () => void }) {
  const [conteo, setConteo] = useState<ConteoDetalle | null>(null);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState(0);
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [valores, setValores] = useState<Record<number, string>>({});
  const [guardando, setGuardando] = useState<Record<number, boolean>>({});
  const [errorLinea, setErrorLinea] = useState<Record<number, string>>({});
  const [confirmar, setConfirmar] = useState<'finalizar' | 'cancelar' | null>(null);
  const [procesando, setProcesando] = useState(false);
  // Agregar productos (parcial)
  const [agregarProducto, setAgregarProducto] = useState('');
  const [agregarCategoria, setAgregarCategoria] = useState(0);

  const editable = conteo?.estado === 'EN_PROCESO';

  const cargar = async () => {
    try {
      setError('');
      const c = await obtenerConteo(conteoId);
      setConteo(c);
      setValores(Object.fromEntries(c.items.map((i) => [i.id, i.cantidad_contada == null ? '' : String(i.cantidad_contada)])));
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    cargar();
    getCategorias().then(setCategorias).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conteoId]);

  useEffect(() => {
    if (conteo?.tipo === 'PARCIAL' && editable && productos.length === 0) {
      getProductos().then((p) => setProductos(p.filter((x) => x.activo))).catch(console.error);
    }
  }, [conteo?.tipo, editable, productos.length]);

  const itemsFiltrados = useMemo(() => {
    if (!conteo) return [];
    const q = busqueda.trim().toLowerCase();
    return conteo.items.filter((i) =>
      (!q || i.producto_nombre?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q)) &&
      (!filtroCategoria || i.categoria_id === filtroCategoria) &&
      (!soloPendientes || i.cantidad_contada == null),
    );
  }, [conteo, busqueda, filtroCategoria, soloPendientes]);

  const resumen = useMemo(() => {
    const items = conteo?.items || [];
    const contados = items.filter((i) => i.cantidad_contada != null);
    const conDif = contados.filter((i) => (i.diferencia || 0) !== 0);
    return { total: items.length, contados: contados.length, conDif };
  }, [conteo]);

  const actualizarItem = (item: ConteoItem) =>
    setConteo((c) => (c ? { ...c, items: c.items.map((i) => (i.id === item.id ? { ...i, ...item } : i)) } : c));

  const guardarLinea = async (item: ConteoItem) => {
    const raw = (valores[item.id] ?? '').replace(',', '.').trim();
    if (raw === '' || Number(raw) === item.cantidad_contada) return;
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) {
      setErrorLinea((e) => ({ ...e, [item.id]: 'Cantidad inválida' }));
      return;
    }
    setGuardando((g) => ({ ...g, [item.id]: true }));
    setErrorLinea((e) => ({ ...e, [item.id]: '' }));
    try {
      actualizarItem(await registrarCantidad(conteoId, item.id, n));
    } catch (e: any) {
      setErrorLinea((er) => ({ ...er, [item.id]: e.message }));
    } finally {
      setGuardando((g) => ({ ...g, [item.id]: false }));
    }
  };

  const onAgregar = async () => {
    const prod = productos.find((p) => `${p.sku} - ${p.nombre}` === agregarProducto);
    if (!prod && !agregarCategoria) return;
    try {
      setError('');
      await agregarItems(conteoId, { producto_ids: prod ? [prod.id] : [], categoria_id: agregarCategoria || undefined });
      setAgregarProducto('');
      setAgregarCategoria(0);
      await cargar();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const onQuitar = async (item: ConteoItem) => {
    try {
      await quitarItem(conteoId, item.id);
      await cargar();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const ejecutar = async () => {
    try {
      setProcesando(true);
      setError('');
      const c = confirmar === 'finalizar' ? await finalizarConteo(conteoId) : await cancelarConteo(conteoId);
      setConteo(c);
      setConfirmar(null);
    } catch (e: any) {
      setError(e.message);
      setConfirmar(null);
    } finally {
      setProcesando(false);
    }
  };

  if (!conteo) {
    return (
      <div className="space-y-3">
        <button onClick={onVolver} className="text-gray-300 hover:text-white">← Volver</button>
        {error ? <div className="text-red-300">{error}</div> : <div className="text-gray-400">Cargando conteo...</div>}
      </div>
    );
  }

  const estado = ESTADO_CONTEO[conteo.estado];
  const progreso = resumen.total ? Math.round((resumen.contados / resumen.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-wrap justify-between gap-3 items-start">
        <div>
          <button onClick={onVolver} className="text-gray-300 hover:text-white text-sm mb-1">← Volver a conteos</button>
          <h2 className="text-2xl font-bold text-white">
            Conteo #{conteo.id} · {conteo.local_nombre}{' '}
            <span className={`${estado.color} text-white px-2 py-1 rounded text-xs font-semibold align-middle`}>{estado.label}</span>
          </h2>
          <p className="text-sm text-gray-400">
            {conteo.tipo === 'COMPLETO' ? 'Completo' : 'Parcial'} · iniciado por {conteo.usuario_creador} el {formatFechaConteo(conteo.fecha_inicio)}
            {conteo.fecha_cierre && ` · cerrado por ${conteo.usuario_cierre} el ${formatFechaConteo(conteo.fecha_cierre)}`}
          </p>
          {conteo.observacion && <p className="text-sm text-gray-300 mt-1">📝 {conteo.observacion}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => descargarExcelConteo(conteo.id).catch((e) => setError(e.message))}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
          >
            ⬇ Exportar Excel
          </button>
          {editable && (
            <>
              <button onClick={() => setConfirmar('cancelar')} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg">
                Cancelar conteo
              </button>
              <button
                onClick={() => setConfirmar('finalizar')}
                disabled={resumen.contados === 0}
                className="px-4 py-2 bg-primary text-slate-900 font-semibold rounded-lg disabled:opacity-40"
              >
                Finalizar y ajustar stock
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progreso */}
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex justify-between text-sm text-gray-300 mb-2">
          <span>Contados: <strong className="text-white">{resumen.contados}</strong> de {resumen.total}</span>
          <span>Con diferencia: <strong className="text-orange-300">{resumen.conDif.length}</strong></span>
        </div>
        <div className="h-2 bg-slate-700 rounded">
          <div className="h-2 bg-primary rounded" style={{ width: `${progreso}%` }} />
        </div>
      </div>

      {error && <div className="bg-red-900/40 border border-red-700 text-red-200 rounded-lg p-3">{error}</div>}

      {/* Agregar productos (parcial) */}
      {editable && conteo.tipo === 'PARCIAL' && (
        <div className="bg-slate-800 rounded-lg p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs text-gray-400 mb-1">Agregar producto</label>
            <input
              list="conteo-productos"
              value={agregarProducto}
              onChange={(e) => setAgregarProducto(e.target.value)}
              placeholder="Buscar por SKU o nombre"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
            />
            <datalist id="conteo-productos">
              {productos.map((p) => (
                <option key={p.id} value={`${p.sku} - ${p.nombre}`} />
              ))}
            </datalist>
          </div>
          <div className="min-w-[180px]">
            <label className="block text-xs text-gray-400 mb-1">o toda una categoría</label>
            <select
              value={agregarCategoria}
              onChange={(e) => setAgregarCategoria(Number(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
            >
              <option value={0}>—</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <button onClick={onAgregar} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            Agregar
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto o SKU"
          className="flex-1 min-w-[200px] bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2"
        />
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(Number(e.target.value))}
          className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2"
        >
          <option value={0}>Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        {editable && (
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />
            Solo pendientes
          </label>
        )}
      </div>

      {/* Líneas */}
      {itemsFiltrados.length === 0 ? (
        <div className="text-gray-400 py-8 text-center bg-slate-800 rounded-lg">
          {conteo.items.length === 0 ? 'Agregue productos para comenzar a contar' : 'Sin resultados para el filtro'}
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg divide-y divide-slate-700">
          {itemsFiltrados.map((item) => {
            const dif = item.diferencia ?? null;
            const sistema = editable ? (item.cantidad_contada != null ? item.stock_sistema : item.stock_actual) : item.stock_sistema;
            return (
              <div key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-[180px]">
                  <div className="text-white font-medium">{item.producto_nombre}</div>
                  <div className="text-xs text-gray-400">
                    {item.sku} · {item.categoria_nombre} {item.unidad ? `· ${item.unidad}` : ''}
                  </div>
                  {item.fecha_captura && (
                    <div className="text-xs text-gray-500">
                      {item.usuario_captura} · {formatFechaConteo(item.fecha_captura)}
                    </div>
                  )}
                </div>
                <div className="text-right w-20">
                  <div className="text-xs text-gray-400">Sistema</div>
                  <div className="text-gray-200">{fmt(sistema)}</div>
                </div>
                <div className="w-28">
                  <div className="text-xs text-gray-400">Contado</div>
                  {editable ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={valores[item.id] ?? ''}
                      onChange={(e) => setValores((v) => ({ ...v, [item.id]: e.target.value }))}
                      onBlur={() => guardarLinea(item)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      className={`w-full bg-slate-700 border rounded-lg px-3 py-2 text-lg text-white text-right ${errorLinea[item.id] ? 'border-red-500' : 'border-slate-600'}`}
                    />
                  ) : (
                    <div className="text-white text-right">{item.cantidad_contada == null ? 'No contado' : fmt(item.cantidad_contada)}</div>
                  )}
                </div>
                <div className="text-right w-24">
                  <div className="text-xs text-gray-400">Diferencia</div>
                  <div className={`font-semibold ${dif === null ? 'text-gray-500' : dif < 0 ? 'text-red-400' : dif > 0 ? 'text-green-400' : 'text-gray-300'}`}>
                    {dif === null ? '-' : `${dif > 0 ? '+' : ''}${fmt(dif)}`}
                  </div>
                  {!editable && item.ajuste_aplicado != null && item.ajuste_aplicado !== dif && (
                    <div className="text-xs text-yellow-300">aplicado {fmt(item.ajuste_aplicado)}</div>
                  )}
                </div>
                <div className="w-8 text-center">
                  {guardando[item.id] ? (
                    <span className="text-gray-400 text-sm">…</span>
                  ) : errorLinea[item.id] ? (
                    <span title={errorLinea[item.id]} className="text-red-400">⚠</span>
                  ) : item.cantidad_contada != null ? (
                    <span className="text-green-400">✓</span>
                  ) : editable && conteo.tipo === 'PARCIAL' ? (
                    <button onClick={() => onQuitar(item)} title="Quitar" className="text-gray-500 hover:text-red-400">✕</button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmación */}
      {confirmar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-full max-w-lg space-y-4">
            {confirmar === 'finalizar' ? (
              <>
                <h3 className="text-xl font-bold text-white">Finalizar conteo #{conteo.id}</h3>
                <p className="text-gray-300 text-sm">
                  Se ajustará el stock de <strong>{resumen.conDif.length}</strong> producto(s) con diferencia.
                  {resumen.total - resumen.contados > 0 && (
                    <> Hay <strong>{resumen.total - resumen.contados}</strong> producto(s) sin contar que no se modificarán.</>
                  )}{' '}
                  Esta acción no se puede deshacer.
                </p>
                {resumen.conDif.length > 0 && (
                  <div className="max-h-60 overflow-y-auto bg-slate-900 rounded p-3 text-sm space-y-1">
                    {resumen.conDif.map((i) => (
                      <div key={i.id} className="flex justify-between gap-3">
                        <span className="text-gray-300 truncate">{i.producto_nombre}</span>
                        <span className={(i.diferencia || 0) < 0 ? 'text-red-400' : 'text-green-400'}>
                          {(i.diferencia || 0) > 0 ? '+' : ''}{fmt(i.diferencia)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white">Cancelar conteo #{conteo.id}</h3>
                <p className="text-gray-300 text-sm">El conteo quedará cancelado y no se modificará ningún stock.</p>
              </>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmar(null)} className="px-4 py-2 text-gray-300 hover:text-white">Volver</button>
              <button
                onClick={ejecutar}
                disabled={procesando}
                className={`px-4 py-2 font-semibold rounded-lg disabled:opacity-50 ${confirmar === 'finalizar' ? 'bg-primary text-slate-900' : 'bg-red-600 text-white'}`}
              >
                {procesando ? 'Procesando...' : confirmar === 'finalizar' ? 'Finalizar y ajustar' : 'Cancelar conteo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
