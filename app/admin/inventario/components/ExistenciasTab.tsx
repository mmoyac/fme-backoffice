'use client';

import { FiltroCompartido, FILTRO_VACIO } from './filtroCompartido';
import { useDeferredValue, useMemo, useState } from 'react';
import { type Producto } from '@/lib/api/productos';
import { type Local } from '@/lib/api/locales';
import { ajusteMerma, type Inventario } from '@/lib/api/inventario';
import { revalidarInventario, useInventarios, useLocales, useProductos } from '@/lib/hooks/catalogos';

const SIN_DATOS: never[] = [];

export function ExistenciasTab({ localPropio = null, filtroCompartido = FILTRO_VACIO }: { localPropio?: number | null; filtroCompartido?: FiltroCompartido } = {}) {
    // Selector de local (solo alcance total). 0 = todos los locales.
    const { local: localSel, setLocal: setLocalSel } = filtroCompartido;
    const [soloNoVerde, setSoloNoVerde] = useState(false);

    // Determina si un producto tiene al menos un local en amarillo o rojo
    function productoTieneNoVerde(producto: Producto): boolean {
      return localesVisibles.some(local => {
        const esTiendaOnline = local.codigo === 'WEB';
        const stock = getStock(producto.id, local.id);
        const displayStock = esTiendaOnline
          ? localesActivos.filter(l => l.codigo !== 'WEB').reduce((sum, l) => sum + getStock(producto.id, l.id), 0)
          : stock;
        if (displayStock <= (producto.stock_critico || 0)) return true;
        if (displayStock <= (producto.stock_minimo || 0)) return true;
        return false;
      });
    }

  // Catálogos con caché compartida (SWR): al volver a la pestaña se muestran al instante
  const productosQ = useProductos();
  const localesQ = useLocales();
  const inventariosQ = useInventarios();
  const productos: Producto[] = productosQ.data ?? SIN_DATOS;
  const locales: Local[] = localesQ.data ?? SIN_DATOS;
  const inventarios: Inventario[] = inventariosQ.data ?? SIN_DATOS;
  // Solo mostrar locales activos
  const localesActivos = locales.filter(l => l.activo !== false);
  const localesFisicos = localesActivos.filter(l => l.codigo !== 'WEB');
  // add-inventario-alcance-por-local: usuario de tienda ve solo su local (sin WEB);
  // alcance total ve todos o el local elegido en el selector.
  const localesVisibles = localPropio
    ? localesActivos.filter(l => l.id === localPropio)
    : localSel
      ? localesActivos.filter(l => l.id === localSel)
      : localesActivos;
  const mostrarSelector = !localPropio && localesFisicos.length > 1;
  const loading = (productosQ.isLoading || localesQ.isLoading || inventariosQ.isLoading) && !productosQ.data;
  const { busqueda: filtro, setBusqueda: setFiltro } = filtroCompartido;

  // Estado modal de merma
  const [modalMerma, setModalMerma] = useState<{ producto: Producto; local: Local; stockActual: number } | null>(null);
  const [cantidadMerma, setCantidadMerma] = useState('');
  const [motivoMerma, setMotivoMerma] = useState('');
  const [guardandoMerma, setGuardandoMerma] = useState(false);
  const [errorMerma, setErrorMerma] = useState('');

  // Filtrar productos por nombre o SKU
  // Ordenar productos alfabéticamente por nombre
  const busquedaDiferida = useDeferredValue(filtro.trim().toLowerCase());
  const productosOrdenados = useMemo(
    () => [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
    [productos],
  );
  const productosFiltrados = useMemo(
    () => !busquedaDiferida
      ? productosOrdenados
      : productosOrdenados.filter(p =>
          p.nombre.toLowerCase().includes(busquedaDiferida) ||
          (p.sku || '').toLowerCase().includes(busquedaDiferida)
        ),
    [productosOrdenados, busquedaDiferida],
  );

  const productosFiltradosFinal = soloNoVerde
    ? productosFiltrados.filter(productoTieneNoVerde)
    : productosFiltrados;

  // Stock por (producto, local) en un mapa: antes se buscaba con find() en cada celda de cada render
  const stockMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of inventarios) m.set(`${i.producto_id}:${i.local_id}`, i.cantidad_stock ?? 0);
    return m;
  }, [inventarios]);

  function getStock(productoId: number, localId: number): number {
    return stockMap.get(`${productoId}:${localId}`) ?? 0;
  }

  function abrirModalMerma(producto: Producto, local: Local) {
    setModalMerma({ producto, local, stockActual: getStock(producto.id, local.id) });
    setCantidadMerma('');
    setMotivoMerma('');
    setErrorMerma('');
  }

  async function confirmarMerma() {
    if (!modalMerma) return;
    const cant = parseInt(cantidadMerma);
    if (!cant || cant <= 0) { setErrorMerma('La cantidad debe ser mayor a cero'); return; }
    if (cant > modalMerma.stockActual) { setErrorMerma(`No puede superar el stock actual (${modalMerma.stockActual})`); return; }
    try {
      setGuardandoMerma(true);
      setErrorMerma('');
      await ajusteMerma(modalMerma.producto.id, modalMerma.local.id, cant, motivoMerma);
      setModalMerma(null);
      await revalidarInventario();
    } catch (err: any) {
      setErrorMerma(err.message || 'Error al registrar la merma');
    } finally {
      setGuardandoMerma(false);
    }
  }

  if (loading) {
    return <div className="text-gray-400">Cargando...</div>;
  }

  if (productos.length === 0 || locales.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-8 text-center text-gray-400">
        Necesitas crear productos y locales primero.
      </div>
    );
  }

  return (
    <div>
      {/* Leyenda de semáforo y filtros */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 border border-slate-700"></span>
            <span className="text-sm text-gray-300">Stock OK</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 border border-slate-700"></span>
            <span className="text-sm text-gray-300">Stock Mínimo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 border border-slate-700"></span>
            <span className="text-sm text-gray-300">Stock Crítico</span>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          {mostrarSelector && (
            <select
              value={localSel}
              onChange={e => setLocalSel(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Local"
            >
              <option value={0}>Todos los locales</option>
              {localesFisicos.map(l => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            className="px-4 py-2 rounded-lg bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary w-full max-w-xs"
            placeholder="Buscar producto o SKU..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={soloNoVerde}
              onChange={e => setSoloNoVerde(e.target.checked)}
              className="accent-yellow-400 w-4 h-4"
            />
            Solo mostrar alertas
          </label>
        </div>
      </div>
      <div className="space-y-6">
        {productosFiltradosFinal.length === 0 ? (
          <div className="text-gray-400 text-center py-8">No se encontraron productos.</div>
        ) : (
          productosFiltradosFinal.map(producto => (
            <div key={producto.id} className="bg-slate-800 rounded-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
                <h3 className="text-xl font-bold text-white">{producto.nombre}</h3>
                <div className="flex gap-4 items-center text-sm text-gray-400">
                  <span>SKU: <span className="font-mono text-gray-300">{producto.sku}</span></span>
                  <span className="border-l border-slate-600 pl-4">Stock mínimo: <span className="font-semibold text-yellow-400">{producto.stock_minimo ?? 0}</span></span>
                  <span>Stock crítico: <span className="font-semibold text-red-400">{producto.stock_critico ?? 0}</span></span>
                </div>
              </div>
              <ul className="divide-y divide-slate-700">
                {localesVisibles.map(local => {
                  const esTiendaOnline = local.codigo === 'WEB';
                  const stock = getStock(producto.id, local.id);
                  const displayStock = esTiendaOnline
                    ? locales
                        .filter(l => l.codigo !== 'WEB')
                        .reduce((sum, l) => sum + getStock(producto.id, l.id), 0)
                    : stock;
                  // Semáforo: rojo = crítico, amarillo = mínimo, verde = ok
                  let semaforoColor = '';
                  if (displayStock <= (producto.stock_critico || 0)) {
                    semaforoColor = 'bg-red-500';
                  } else if (displayStock <= (producto.stock_minimo || 0)) {
                    semaforoColor = 'bg-yellow-400';
                  } else {
                    semaforoColor = 'bg-green-500';
                  }
                  return (
                    <li key={local.id} className="flex justify-between items-center py-2">
                      <span className="text-gray-300 font-medium flex items-center">
                        <span
                          className={`inline-block w-3 h-3 rounded-full mr-2 border border-slate-700 ${semaforoColor}`}
                        ></span>
                        {local.nombre}
                        {esTiendaOnline && (
                          <span className="ml-2 text-xs text-blue-400">(WEB / Global)</span>
                        )}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-right leading-tight">
                          <span className="font-semibold text-lg">
                            {Number(displayStock).toLocaleString('es-CL', { maximumFractionDigits: 3 })}
                          </span>
                          {producto.unidad_medida_simbolo && (
                            <span className="ml-1 text-xs text-gray-400">{producto.unidad_medida_simbolo}</span>
                          )}
                          {/* Equivalencia en unidad de compra (ej. sacos de 25 kg) */}
                          {producto.unidad_compra_descripcion && (producto.factor_conversion_compra || 1) > 1 && displayStock !== 0 && (
                            <span className="block text-xs text-gray-400">
                              ≈ {(Number(displayStock) / Number(producto.factor_conversion_compra)).toLocaleString('es-CL', { maximumFractionDigits: 1 })} × {producto.unidad_compra_descripcion}
                            </span>
                          )}
                        </span>
                        {!esTiendaOnline && (
                          <button
                            onClick={() => abrirModalMerma(producto, local)}
                            disabled={displayStock === 0}
                            title={displayStock === 0 ? 'Sin stock para ajustar' : 'Registrar merma'}
                            className="px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded transition-colors"
                          >
                            ↓ Merma
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      {/* Modal de ajuste por merma */}
      {modalMerma && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white">⬇ Ajuste por Merma</h3>
              <button onClick={() => setModalMerma(null)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-3 text-sm">
                <p className="text-slate-300"><span className="text-white font-medium">Producto:</span> {modalMerma.producto.nombre}</p>
                <p className="text-slate-300 mt-1"><span className="text-white font-medium">Local:</span> {modalMerma.local.nombre}</p>
                <p className="text-slate-300 mt-1"><span className="text-white font-medium">Stock actual:</span> <span className="text-green-400 font-bold">{modalMerma.stockActual}</span></p>
              </div>

              {errorMerma && (
                <div className="bg-red-900/30 border border-red-600/40 rounded-lg p-3 text-red-400 text-sm">❌ {errorMerma}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Cantidad a descontar *
                </label>
                <input
                  type="number"
                  min={1}
                  max={modalMerma.stockActual}
                  value={cantidadMerma}
                  onChange={e => setCantidadMerma(e.target.value)}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder={`Máx. ${modalMerma.stockActual}`}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Motivo (opcional)
                </label>
                <input
                  type="text"
                  value={motivoMerma}
                  onChange={e => setMotivoMerma(e.target.value)}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ej: Producto vencido, daño en transporte..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-700">
              <button
                onClick={() => setModalMerma(null)}
                disabled={guardandoMerma}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarMerma}
                disabled={guardandoMerma || !cantidadMerma}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                {guardandoMerma ? (
                  <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Guardando...</>
                ) : (
                  <>⬇ Confirmar Merma</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
