'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DataList from '@/components/ui/DataList';
import { useSearchParams } from 'next/navigation';
import { 
  getLotes,
  getEnrolamientos,
  getProductos,
  deleteLote,
  descargarEtiquetaLote,
  descargarEtiquetasMultiples,
  type LoteList,
  type EnrolamientoList,
  formatearFecha,
  formatearFechaSolo
} from '@/lib/api/recepcion';

interface ProductoSimple {
  id: number;
  nombre: string;
  sku: string;
}

export default function LotesPage() {
  const searchParams = useSearchParams();
  const enrolamientoParam = searchParams.get('enrolamiento');
  
  const [lotes, setLotes] = useState<LoteList[]>([]);
  const [enrolamientos, setEnrolamientos] = useState<EnrolamientoList[]>([]);
  const [productos, setProductos] = useState<ProductoSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filtroEnrolamiento, setFiltroEnrolamiento] = useState<number | ''>(
    enrolamientoParam ? Number(enrolamientoParam) : ''
  );
  const [filtroProducto, setFiltroProducto] = useState<number | ''>('');
  const [filtroDisponible, setFiltroDisponible] = useState<string>('');
  const [filtroVendido, setFiltroVendido] = useState<string>('');
  const [filtroReservado, setFiltroReservado] = useState<string>('');

  // Estados para selección múltiple
  const [lotesSeleccionados, setLotesSeleccionados] = useState<number[]>([]);
  const [modoSeleccion, setModoSeleccion] = useState(false);

  // Estado para modal de detalles
  const [loteDetalles, setLoteDetalles] = useState<LoteList | null>(null);

  useEffect(() => {
    cargarDatos();
  }, [filtroEnrolamiento, filtroProducto, filtroDisponible, filtroVendido]);

  const cargarDatos = async (mostrarLoading: boolean = true) => {
    try {
      if (mostrarLoading) {
        setLoading(true);
      }
      setError(null);

      // Cargar enrolamientos y productos para filtros (solo la primera vez)
      if (enrolamientos.length === 0 || productos.length === 0) {
        const [enrolamientosRes, productosRes] = await Promise.all([
          getEnrolamientos(),
          getProductos()
        ]);
        setEnrolamientos(enrolamientosRes);
        setProductos(productosRes);
      }

      // Cargar lotes con filtros
      const params: any = {};
      if (filtroEnrolamiento) params.enrolamiento_id = Number(filtroEnrolamiento);
      if (filtroProducto) params.producto_id = Number(filtroProducto);
      if (filtroDisponible !== '') params.disponible_venta = filtroDisponible === 'true';
      if (filtroVendido !== '') params.vendido = filtroVendido === 'true';
      if (filtroReservado !== '') params.reservado = filtroReservado === 'true';

      const lotesRes = await getLotes(params);
      setLotes(lotesRes);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      if (mostrarLoading) {
        setLoading(false);
      }
    }
  };

  const limpiarFiltros = () => {
    setFiltroEnrolamiento('');
    setFiltroProducto('');
    setFiltroDisponible('');
    setFiltroVendido('');
    setFiltroReservado('');
  };

  const handleEliminarLote = async (loteId: number, codigoLote: string) => {
    if (!window.confirm(`¿Está seguro de eliminar el lote ${codigoLote}?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await deleteLote(loteId);
      await cargarDatos(false); // No mostrar loading de nuevo, ya está activo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar lote');
      alert(err instanceof Error ? err.message : 'Error al eliminar lote');
    } finally {
      setLoading(false);
    }
  };

  const handleImprimirEtiqueta = async (loteId: number, codigoLote: string) => {
    try {
      const blob = await descargarEtiquetaLote(loteId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiqueta_${codigoLote}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al descargar etiqueta');
    }
  };

  const handleImprimirSeleccionadas = async () => {
    if (lotesSeleccionados.length === 0) {
      alert('Seleccione al menos un lote');
      return;
    }

    try {
      const blob = await descargarEtiquetasMultiples(lotesSeleccionados);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiquetas_seleccionadas_${lotesSeleccionados.length}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setLotesSeleccionados([]);
      setModoSeleccion(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al descargar etiquetas');
    }
  };

  const toggleSeleccionLote = (loteId: number) => {
    setLotesSeleccionados(prev => 
      prev.includes(loteId) 
        ? prev.filter(id => id !== loteId)
        : [...prev, loteId]
    );
  };

  const seleccionarTodos = () => {
    if (lotesSeleccionados.length === lotes.length) {
      setLotesSeleccionados([]);
    } else {
      setLotesSeleccionados(lotes.map(l => l.id));
    }
  };

  const calcularPesoTotal = () => {
    const total = lotes.reduce((total, lote) => {
      const peso = parseFloat(lote.peso_actual.toString()) || 0;
      return total + peso;
    }, 0);
    return total || 0;
  };

  const verDetalles = (lote: LoteList) => {
    setLoteDetalles(lote);
  };

  const cerrarDetalles = () => {
    setLoteDetalles(null);
  };

  const getColorEstadoLote = (disponible: boolean, vendido: boolean) => {
    if (vendido) return 'bg-red-500/20 text-red-400 border border-red-500/30';
    if (disponible) return 'bg-green-500/20 text-green-400 border border-green-500/30';
    return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
  };

  const getTextoEstadoLote = (disponible: boolean, vendido: boolean) => {
    if (vendido) return 'Vendido';
    if (disponible) return 'Disponible';
    return 'En Proceso';
  };


  const seleccion = (l: LoteList) => (
    <input
      type="checkbox"
      checked={lotesSeleccionados.includes(l.id)}
      onChange={() => toggleSeleccionLote(l.id)}
      className="rounded border-gray-300 text-primary focus:ring-primary"
    />
  );

  const peso = (l: LoteList) => (
    <div className="text-sm text-gray-300">
      <div className="font-semibold text-white">{l.peso_actual} kg <span className="text-xs text-gray-400 font-normal">neto</span></div>
      {l.peso_bruto_kg && <div className="text-cyan-400 text-xs">{l.peso_bruto_kg} kg bruto</div>}
    </div>
  );

  const estado = (l: LoteList) => (
    <div className="flex flex-wrap gap-1">
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getColorEstadoLote(l.disponible_venta, l.vendido)}`}>
        {getTextoEstadoLote(l.disponible_venta, l.vendido)}
      </span>
      {l.reservado && (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
          🔒 Reservado
        </span>
      )}
    </div>
  );

  const acciones = (l: LoteList) => (
    <>
      <button onClick={() => verDetalles(l)} className="text-blue-400 hover:text-blue-300 text-sm" title="Ver detalles">
        👁️
      </button>
      <button onClick={() => handleImprimirEtiqueta(l.id, l.codigo_lote)} className="text-green-400 hover:text-green-300 text-sm" title="Imprimir etiqueta">
        🖨️
      </button>
      {!l.vendido && (
        <button onClick={() => handleEliminarLote(l.id, l.codigo_lote)} className="text-red-400 hover:text-red-300 text-sm" title="Eliminar lote">
          🗑️
        </button>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Lotes / Cajas</h1>
          <p className="text-gray-400">Gestión de cajas individuales con trazabilidad completa</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/recepcion"
            className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-slate-700 transition-colors"
          >
            ← Volver a Recepción
          </Link>
          <Link
            href="/admin/recepcion/lotes/nuevo"
            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            + Escanear Nueva Caja
          </Link>
        </div>
      </div>

      {/* Info sobre escaneo de cajas */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-2">🔍 Escaneo de Cajas</h4>
        <p className="text-sm text-gray-300">
          Las cajas se procesan durante el enrolamiento cuando el estado es <strong className="text-white">"EN PROCESO"</strong>. 
          Una vez <strong className="text-white">"FINALIZADO"</strong> el enrolamiento, todas las cajas quedan disponibles para venta.
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
        <div className="flex flex-wrap items-center gap-4">          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto min-w-0">
            <label className="text-sm font-medium text-gray-300">Enrolamiento:</label>
            <select
              value={filtroEnrolamiento}
              onChange={(e) => setFiltroEnrolamiento(e.target.value as any)}
              className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-1 text-sm focus:ring-2 focus:ring-primary w-full sm:w-auto max-w-full min-w-0"
            >
              <option value="">Todos</option>
              {enrolamientos.map(enr => (
                <option key={enr.id} value={enr.id}>
                  {enr.patente} - {enr.proveedor_nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto min-w-0">
            <label className="text-sm font-medium text-gray-300">Producto:</label>
            <select
              value={filtroProducto}
              onChange={(e) => setFiltroProducto(e.target.value as any)}
              className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-1 text-sm focus:ring-2 focus:ring-primary w-full sm:w-auto max-w-full min-w-0"
            >
              <option value="">Todos</option>
              {productos.map(prod => (
                <option key={prod.id} value={prod.id}>
                  {prod.nombre} ({prod.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto min-w-0">
            <label className="text-sm font-medium text-gray-300">Disponible:</label>
            <select
              value={filtroDisponible}
              onChange={(e) => setFiltroDisponible(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-1 text-sm focus:ring-2 focus:ring-primary w-full sm:w-auto max-w-full min-w-0"
            >
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto min-w-0">
            <label className="text-sm font-medium text-gray-300">Vendido:</label>
            <select
              value={filtroVendido}
              onChange={(e) => setFiltroVendido(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-1 text-sm focus:ring-2 focus:ring-primary w-full sm:w-auto max-w-full min-w-0"
            >
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto min-w-0">
            <label className="text-sm font-medium text-gray-300">Reservado:</label>
            <select
              value={filtroReservado}
              onChange={(e) => setFiltroReservado(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-1 text-sm focus:ring-2 focus:ring-primary w-full sm:w-auto max-w-full min-w-0"
            >
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>

          <button
            onClick={limpiarFiltros}
            className="px-3 py-1 text-sm text-gray-300 border border-slate-600 rounded hover:bg-slate-700 transition-colors"
          >
            Limpiar
          </button>
        </div>

        {/* Botones de acción */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setModoSeleccion(!modoSeleccion)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                modoSeleccion 
                  ? 'bg-primary text-slate-900' 
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {modoSeleccion ? '✓ Modo Selección' : '☐ Seleccionar'}
            </button>
            
            {modoSeleccion && (
              <>
                <button
                  onClick={seleccionarTodos}
                  className="px-3 py-2 text-sm border border-slate-600 rounded hover:bg-slate-700 transition-colors text-gray-300"
                >
                  {lotesSeleccionados.length === lotes.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                </button>
                <span className="text-sm text-gray-400">
                  {lotesSeleccionados.length} seleccionado{lotesSeleccionados.length !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
          
          {modoSeleccion && lotesSeleccionados.length > 0 && (
            <button
              onClick={handleImprimirSeleccionadas}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              🖨️ Imprimir Etiquetas ({lotesSeleccionados.length})
            </button>
          )}
        </div>
      </div>

      {/* Card de Sumatorias */}
      {lotes.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 rounded-lg border border-blue-500/30 p-4 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">
                {lotes.length}
              </div>
              <div className="text-sm text-gray-300">Total Lotes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">
                {(calcularPesoTotal() || 0).toFixed(2)} kg
              </div>
              <div className="text-sm text-gray-300">Peso Total Neto</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">
                {lotes.filter(l => l.disponible_venta && !l.vendido && !l.reservado).length}
              </div>
              <div className="text-sm text-gray-300">Disponibles</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400">
                {lotes.filter(l => l.reservado).length}
              </div>
              <div className="text-sm text-gray-300">Reservados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">
                {lotes.filter(l => l.vendido).length}
              </div>
              <div className="text-sm text-gray-300">Vendidos</div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando lotes...</p>
        </div>
      ) : lotes.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-white mb-2">No hay lotes procesados</h3>
          <p className="text-gray-400 mb-4">
            {filtroEnrolamiento || filtroDisponible || filtroVendido 
              ? 'No se encontraron lotes con los filtros aplicados.' 
              : 'Aún no se han procesado cajas individuales.'}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Para procesar cajas, primero debe registrar un enrolamiento y cambiar su estado a "EN PROCESO".
          </p>
          <Link
            href="/admin/recepcion/lotes/nuevo"
            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            + Escanear Primera Caja
          </Link>
        </div>
      ) : (
        <DataList
          items={lotes}
          getKey={(l) => l.id}
          columns={[
            ...(modoSeleccion
              ? [{
                  header: (
                    <input
                      type="checkbox"
                      checked={lotesSeleccionados.length === lotes.length && lotes.length > 0}
                      onChange={seleccionarTodos}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  ),
                  className: 'w-[4%]',
                  sinTruncar: true,
                  cell: (l: LoteList) => seleccion(l),
                }]
              : []),
            {
              header: 'Código Lote',
              className: 'w-[20%]',
              sinTruncar: true,
              cell: (l: LoteList) => (
                <>
                  <div className="font-medium text-white break-all">{l.codigo_lote}</div>
                  <div className="text-xs text-gray-400">{formatearFecha(l.fecha_registro)}</div>
                  <div className="text-xs text-gray-500 font-mono break-all" title="QR">{l.qr_propio}</div>
                </>
              ),
            },
            { header: 'Producto', className: modoSeleccion ? 'w-[14%]' : 'w-[18%]', cell: (l: LoteList) => <span className="text-white" title={l.producto_nombre}>{l.producto_nombre}</span> },
            { header: 'Peso Neto / Bruto', className: 'w-[12%]', sinTruncar: true, cell: (l: LoteList) => peso(l) },
            { header: 'Vencimiento', className: 'w-[10%]', sinTruncar: true, cell: (l: LoteList) => <span className="text-gray-300">{formatearFechaSolo(l.fecha_vencimiento)}</span> },
            {
              header: 'Ubicación / Enrol.',
              className: 'w-[14%]',
              cell: (l: LoteList) => (
                <>
                  <div className="font-medium text-white">{l.ubicacion_codigo}</div>
                  <div className="text-xs text-gray-300">{l.enrolamiento_patente}</div>
                </>
              ),
            },
            { header: 'Estado', className: 'w-[13%]', sinTruncar: true, cell: (l: LoteList) => estado(l) },
            { header: 'Acciones', className: 'w-[13%] text-center', sinTruncar: true, cell: (l: LoteList) => <div className="flex items-center justify-center gap-2">{acciones(l)}</div> },
          ]}
          card={(l) => (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  {modoSeleccion && <div className="pt-1">{seleccion(l)}</div>}
                  <div className="min-w-0">
                    <div className="font-medium text-white break-all">{l.codigo_lote}</div>
                    <div className="text-sm text-gray-300 break-words">{l.producto_nombre}</div>
                  </div>
                </div>
                <div className="shrink-0 text-right">{peso(l)}</div>
              </div>
              <div>{estado(l)}</div>
              <div className="text-xs text-gray-400">
                Vence: {formatearFechaSolo(l.fecha_vencimiento)} · Ubicación: {l.ubicacion_codigo} · Enrol.: {l.enrolamiento_patente}
              </div>
              <div className="text-xs text-gray-500">
                Registro: {formatearFecha(l.fecha_registro)} · <span className="font-mono break-all">{l.qr_propio}</span>
              </div>
              <div className="flex items-center gap-4 pt-2 border-t border-slate-700">{acciones(l)}</div>
            </div>
          )}
        />
      )}

      {/* Modal de Detalles del Lote */}
      {loteDetalles && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white">Detalles del Lote</h2>
                <button 
                  onClick={cerrarDetalles}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información Principal */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-3">Información Principal</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-400">Código:</span>
                        <span className="text-white ml-2 font-mono">{loteDetalles.codigo_lote}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">QR:</span>
                        <span className="text-white ml-2 font-mono text-xs">{loteDetalles.qr_propio}</span>
                      </div>
                      {loteDetalles.qr_original && (
                        <div>
                          <span className="text-gray-400">QR Original:</span>
                          <span className="text-white ml-2 font-mono text-xs">{loteDetalles.qr_original}</span>
                        </div>
                      )}
                      {loteDetalles.lote_proveedor && (
                        <div>
                          <span className="text-gray-400">Lote Proveedor:</span>
                          <span className="text-white ml-2">{loteDetalles.lote_proveedor}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400">Producto:</span>
                        <span className="text-white ml-2">{loteDetalles.producto_nombre}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Enrolamiento:</span>
                        <span className="text-white ml-2">{loteDetalles.enrolamiento_patente}</span>
                      </div>
                    </div>
                  </div>

                  {/* Estado */}
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-3">Estado</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400">Estado Actual:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getColorEstadoLote(loteDetalles.disponible_venta, loteDetalles.vendido)}`}>
                          {getTextoEstadoLote(loteDetalles.disponible_venta, loteDetalles.vendido)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Disponible para Venta:</span>
                        <span className={`ml-2 ${loteDetalles.disponible_venta ? 'text-green-400' : 'text-red-400'}`}>
                          {loteDetalles.disponible_venta ? 'Sí' : 'No'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Vendido:</span>
                        <span className={`ml-2 ${loteDetalles.vendido ? 'text-red-400' : 'text-green-400'}`}>
                          {loteDetalles.vendido ? 'Sí' : 'No'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400">Reservado (preventa):</span>
                        {loteDetalles.reservado ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            🔒 Sí — apartado para una preventa
                          </span>
                        ) : (
                          <span className="text-green-400 text-sm">No</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Información Física */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-3">Información Física</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-400">Peso Neto (ventas):</span>
                        <span className="text-white ml-2 font-semibold">{loteDetalles.peso_actual} kg</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Peso Bruto (camión):</span>
                        <span className="text-cyan-300 ml-2 font-semibold">
                          {loteDetalles.peso_bruto_kg ? `${loteDetalles.peso_bruto_kg} kg` : <span className="text-gray-500">no registrado</span>}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Ubicación:</span>
                        <span className="text-white ml-2">{loteDetalles.ubicacion_codigo}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Fecha Vencimiento:</span>
                        <span className="text-white ml-2">{formatearFechaSolo(loteDetalles.fecha_vencimiento)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fechas */}
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-3">Fechas</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-400">Fecha Registro:</span>
                        <span className="text-white ml-2">{formatearFecha(loteDetalles.fecha_registro)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-slate-700">
                <button
                  onClick={() => handleImprimirEtiqueta(loteDetalles.id, loteDetalles.codigo_lote)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  🖨️ Imprimir Etiqueta
                </button>
                <button
                  onClick={cerrarDetalles}
                  className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}