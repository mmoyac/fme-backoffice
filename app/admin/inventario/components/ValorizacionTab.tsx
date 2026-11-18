'use client';

// Valorización de inventario (change OpenSpec fme-backend: add-valorizacion-inventario)
import { FiltroCompartido, FILTRO_VACIO } from './filtroCompartido';
import { useEffect, useState } from 'react';
import { getLocales, Local } from '@/lib/api/locales';
import { getCategorias, CategoriaProducto } from '@/lib/api/maestras';
import { descargarValorizacionExcel, obtenerValorizacion, Valorizacion } from '@/lib/api/valorizacion';

const clp = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : '$' + Math.round(v).toLocaleString('es-CL');
const num = (v: number) => v.toLocaleString('es-CL', { maximumFractionDigits: 3 });
const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : v.toLocaleString('es-CL', { maximumFractionDigits: 1 }) + '%';

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${color}`}>{children}</span>;
}

export function ValorizacionTab({ localPropio = null, filtroCompartido = FILTRO_VACIO }: { localPropio?: number | null; filtroCompartido?: FiltroCompartido }) {
  const [locales, setLocales] = useState<Local[]>([]);
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const { local: filtroLocal, setLocal: setFiltroLocal } = filtroCompartido;
  const [filtroCategoria, setFiltroCategoria] = useState<number>(0);
  const { busqueda, setBusqueda } = filtroCompartido;
  const [q, setQ] = useState(busqueda);
  const [data, setData] = useState<Valorizacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getLocales().then((l) => setLocales(l.filter((x) => x.activo !== false))).catch(console.error);
    getCategorias().then(setCategorias).catch(console.error);
  }, []);

  // Búsqueda con debounce
  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const filtros = {
    local_id: localPropio || filtroLocal || undefined,
    categoria_id: filtroCategoria || undefined,
    q,
  };

  useEffect(() => {
    let vigente = true;
    setLoading(true);
    setError('');
    obtenerValorizacion(filtros)
      .then((d) => vigente && setData(d))
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setLoading(false));
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroLocal, filtroCategoria, q, localPropio]);

  const exportar = async () => {
    try {
      setExportando(true);
      await descargarValorizacionExcel(filtros);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExportando(false);
    }
  };

  const t = data?.totales;
  const tarjetas = [
    { label: 'Valor inventario (costo neto)', valor: clp(t?.valor_inventario), color: 'text-sky-300' },
    { label: 'Valor venta (neto)', valor: clp(t?.valor_venta), color: 'text-emerald-300' },
    { label: 'Ganancia potencial (neta)', valor: clp(t?.ganancia_potencial), color: 'text-amber-300' },
    { label: 'Margen', valor: pct(t?.margen_pct), color: 'text-violet-300' },
  ];

  return (
    <div className="space-y-4">
      <div className="text-sm text-blue-100 bg-blue-900/30 border border-blue-700 rounded-lg px-4 py-3">
        <span className="font-semibold">Todos los valores son netos (sin IVA).</span>{' '}
        El costo es el promedio ponderado de compras y producción (neto). El precio de venta es el precio del
        local sin IVA (precio con IVA ÷ 1,19), para comparar costo y venta en la misma base. Debajo de cada
        precio neto se muestra, como referencia, el precio con IVA que ves en Precios.
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tarjetas.map((c) => (
          <div key={c.label} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-xs text-gray-400">{c.label}</div>
            <div className={`text-xl font-bold mt-1 ${c.color}`}>{loading && !data ? '…' : c.valor}</div>
          </div>
        ))}
      </div>

      {t && (t.sin_costo > 0 || t.sin_precio > 0) && (
        <div className="text-xs text-amber-200 bg-amber-900/30 border border-amber-800 rounded-lg px-3 py-2">
          {t.sin_costo > 0 && <>{t.sin_costo} fila(s) sin costo no suman al valor de inventario ni a la ganancia. </>}
          {t.sin_precio > 0 && <>{t.sin_precio} fila(s) sin precio de venta en su local.</>}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-wrap gap-3">
          {!localPropio && (
            <select
              value={filtroLocal}
              onChange={(e) => setFiltroLocal(Number(e.target.value))}
              className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2"
            >
              <option value={0}>Todos los locales</option>
              {locales.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
          )}
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(Number(e.target.value))}
            className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2"
          >
            <option value={0}>Todas las categorías</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto o SKU..."
            className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 w-64"
          />
        </div>
        <button
          onClick={exportar}
          disabled={exportando || !data || data.items.length === 0}
          className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-50"
        >
          {exportando ? 'Exportando...' : 'Exportar a Excel'}
        </button>
      </div>

      {error && <div className="bg-red-900/40 border border-red-700 text-red-200 rounded-lg p-3">{error}</div>}

      {loading && !data ? (
        <div className="text-gray-400 py-8 text-center">Cargando valorización...</div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-gray-400 py-8 text-center bg-slate-800 rounded-lg">No hay stock para valorizar con estos filtros</div>
      ) : (
        <>
        {/* Escritorio: reporte con muchas columnas numéricas, con scroll dentro de su recuadro */}
        <div className={`hidden lg:block overflow-x-auto bg-slate-800 rounded-lg border border-slate-700 ${loading ? 'opacity-60' : ''}`}>
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-gray-300 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Producto</th>
                <th className="px-3 py-2 text-left">Categoría</th>
                {!localPropio && <th className="px-3 py-2 text-left">Local</th>}
                <th className="px-3 py-2 text-right">Stock</th>
                <th className="px-3 py-2 text-right">Costo neto</th>
                <th className="px-3 py-2 text-right">Valor inventario</th>
                <th className="px-3 py-2 text-right">Precio venta neto</th>
                <th className="px-3 py-2 text-right">Valor venta</th>
                <th className="px-3 py-2 text-right">Ganancia</th>
                <th className="px-3 py-2 text-right">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-gray-200">
              {data.items.map((it) => (
                <tr key={`${it.producto_id}-${it.local_id}`} className="hover:bg-slate-700/40">
                  <td className="px-3 py-2">
                    <div className="font-medium">{it.producto_nombre}</div>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-1 items-center">
                      {it.sku}
                      {it.sin_costo && <Badge color="bg-amber-800 text-amber-100">Sin costo</Badge>}
                      {it.sin_precio && <Badge color="bg-slate-600 text-slate-100">Sin precio</Badge>}
                      {it.stock_negativo && <Badge color="bg-red-800 text-red-100">Stock negativo</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-400">{it.categoria_nombre || '—'}</td>
                  {!localPropio && <td className="px-3 py-2 text-gray-400">{it.local_nombre}</td>}
                  <td className={`px-3 py-2 text-right ${it.stock_negativo ? 'text-red-400' : ''}`}>
                    {num(it.stock)} <span className="text-xs text-gray-500">{it.unidad}</span>
                  </td>
                  <td className="px-3 py-2 text-right">{clp(it.costo_unitario)}</td>
                  <td className="px-3 py-2 text-right font-medium text-sky-300">{clp(it.valor_inventario)}</td>
                  <td className="px-3 py-2 text-right">
                    {clp(it.precio_venta_neto)}
                    {it.precio_venta_con_iva !== null && it.precio_incluye_iva && (
                      <div className="text-xs text-gray-500" title="Precio de lista con IVA (referencia)">
                        {clp(it.precio_venta_con_iva)} c/IVA
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-300">{clp(it.valor_venta)}</td>
                  <td className="px-3 py-2 text-right text-amber-300">{clp(it.ganancia_potencial)}</td>
                  <td className="px-3 py-2 text-right">{pct(it.margen_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 text-xs text-gray-500 border-t border-slate-700">
            {data.items.length} fila(s) · Valores netos (sin IVA) · Costo = promedio ponderado · Precio venta neto = precio con IVA ÷ 1,19
          </div>
        </div>

        {/* Móvil: una tarjeta por producto y local */}
        <ul className={`lg:hidden space-y-3 ${loading ? 'opacity-60' : ''}`}>
          {data.items.map((it) => (
            <li key={`${it.producto_id}-${it.local_id}`} className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-2 text-gray-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-white break-words">{it.producto_nombre}</div>
                  <div className="text-xs text-gray-400">
                    {it.sku}
                    {it.categoria_nombre ? ` · ${it.categoria_nombre}` : ''}
                    {!localPropio && it.local_nombre ? ` · ${it.local_nombre}` : ''}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {it.sin_costo && <Badge color="bg-amber-800 text-amber-100">Sin costo</Badge>}
                    {it.sin_precio && <Badge color="bg-slate-600 text-slate-100">Sin precio</Badge>}
                    {it.stock_negativo && <Badge color="bg-red-800 text-red-100">Stock negativo</Badge>}
                  </div>
                </div>
                <div className={`text-right shrink-0 font-semibold ${it.stock_negativo ? 'text-red-400' : 'text-white'}`}>
                  {num(it.stock)} <span className="text-xs text-gray-400 font-normal">{it.unidad}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <span className="text-gray-400">Costo neto</span><span className="text-right">{clp(it.costo_unitario)}</span>
                <span className="text-gray-400">Precio venta neto</span><span className="text-right">{clp(it.precio_venta_neto)}</span>
                <span className="text-gray-400">Valor inventario</span><span className="text-right text-sky-300">{clp(it.valor_inventario)}</span>
                <span className="text-gray-400">Valor venta</span><span className="text-right text-emerald-300">{clp(it.valor_venta)}</span>
                <span className="text-gray-400">Ganancia</span><span className="text-right text-amber-300">{clp(it.ganancia_potencial)}</span>
                <span className="text-gray-400">Margen</span><span className="text-right">{pct(it.margen_pct)}</span>
              </div>
            </li>
          ))}
          <li className="text-xs text-gray-500 text-center">{data.items.length} fila(s) · Valores netos (sin IVA)</li>
        </ul>
        </>
      )}
    </div>
  );
}
