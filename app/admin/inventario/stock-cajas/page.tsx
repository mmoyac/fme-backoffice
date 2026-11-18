'use client';

import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';
import DataList from '@/components/ui/DataList';

// Tipos TypeScript
interface StockCajas {
  id: number;
  producto_id: number;
  proveedor_id: number;
  cajas_disponibles: number;
  cajas_totales_recibidas: number;
  cajas_totales_vendidas: number;
  fecha_ultima_actualizacion: string;
  producto_nombre: string;
  producto_sku: string;
  proveedor_nombre: string;
  proveedor_rut: string;
}

interface MovimientoStock {
  id: number;
  producto_id: number;
  proveedor_id: number;
  tipo_movimiento: string;
  cajas_movimiento: number;
  cajas_antes: number;
  cajas_despues: number;
  descripcion: string;
  usuario: string;
  fecha_movimiento: string;
  producto_nombre: string;
  proveedor_nombre: string;
}

interface ResumenStock {
  total_productos: number;
  total_proveedores: number;
  total_cajas_disponibles: number;
  productos_sin_stock: number;
  productos_con_stock: StockCajas[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function StockCajasPage() {
  const [loading, setLoading] = useState(true);
  const [stockItems, setStockItems] = useState<StockCajas[]>([]);
  const [resumen, setResumen] = useState<ResumenStock | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
  const [vistaActiva, setVistaActiva] = useState<'stock' | 'movimientos' | 'resumen'>('resumen');
  const [filtroSoloConStock, setFiltroSoloConStock] = useState(false);
  
  // Estados para modal de ajuste
  const [modalAjusteAbierto, setModalAjusteAbierto] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState<StockCajas | null>(null);
  const [nuevaCantidad, setNuevaCantidad] = useState(0);

  useEffect(() => {
    cargarDatos();
  }, [vistaActiva, filtroSoloConStock]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      const token = AuthService.getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      if (vistaActiva === 'resumen') {
        const response = await fetch(`${API_URL}/api/stock-cajas/resumen`, { headers });
        if (response.ok) {
          const data = await response.json();
          setResumen(data);
        }
      } else if (vistaActiva === 'stock') {
        const url = `${API_URL}/api/stock-cajas/?solo_con_stock=${filtroSoloConStock}`;
        const response = await fetch(url, { headers });
        if (response.ok) {
          const data = await response.json();
          setStockItems(data);
        }
      } else if (vistaActiva === 'movimientos') {
        const response = await fetch(`${API_URL}/api/stock-cajas/movimientos?limit=50`, { headers });
        if (response.ok) {
          const data = await response.json();
          setMovimientos(data);
        }
      }

    } catch (err) {
      console.error('Error al cargar datos:', err);
      alert('Error al cargar datos del stock');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalAjuste = (item: StockCajas) => {
    setItemSeleccionado(item);
    setNuevaCantidad(item.cajas_disponibles);
    setModalAjusteAbierto(true);
  };

  const realizarAjuste = async () => {
    if (!itemSeleccionado) return;

    try {
      const token = AuthService.getToken();
      const response = await fetch(
        `${API_URL}/api/stock-cajas/ajustar/${itemSeleccionado.producto_id}/${itemSeleccionado.proveedor_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            cajas_disponibles: nuevaCantidad
          })
        }
      );

      if (response.ok) {
        const resultado = await response.json();
        alert(`Ajuste realizado: ${resultado.mensaje}`);
        setModalAjusteAbierto(false);
        cargarDatos();
      } else {
        throw new Error('Error en el ajuste');
      }
    } catch (err) {
      alert('Error al realizar ajuste: ' + err);
    }
  };

  const getTipoMovimientoColor = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA_ENROLAMIENTO':
        return 'text-green-400';
      case 'SALIDA_PEDIDO':
        return 'text-red-400';
      case 'AJUSTE_INVENTARIO':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTipoMovimientoNombre = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA_ENROLAMIENTO':
        return 'Entrada (Enrolamiento)';
      case 'SALIDA_PEDIDO':
        return 'Salida (Pedido)';
      case 'AJUSTE_INVENTARIO':
        return 'Ajuste Manual';
      default:
        return tipo;
    }
  };

  if (loading) return <div className="p-6 text-white">Cargando stock de cajas...</div>;

  const stockActual = (i: StockCajas) => (
    <div className={`text-lg font-bold ${i.cajas_disponibles > 0 ? 'text-primary' : 'text-red-400'}`}>{i.cajas_disponibles}</div>
  );
  const botonAjustar = (i: StockCajas) => (
    <button onClick={() => abrirModalAjuste(i)} className="text-blue-400 hover:text-blue-300 text-sm">
      Ajustar
    </button>
  );
  const tipoMov = (m: MovimientoStock) => (
    <div className={`text-sm ${getTipoMovimientoColor(m.tipo_movimiento)}`}>{getTipoMovimientoNombre(m.tipo_movimiento)}</div>
  );
  const cajasMov = (m: MovimientoStock) => (
    <div className={`text-sm font-bold ${m.cajas_movimiento > 0 ? 'text-green-400' : 'text-red-400'}`}>
      {m.cajas_movimiento > 0 ? '+' : ''}{m.cajas_movimiento}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Stock de Cajas por Proveedor</h1>
          <p className="text-gray-400">Gestión de stock de cajas alimentado desde enrolamientos</p>
        </div>
      </div>

      {/* Navegación de vistas */}
      <div className="flex space-x-1 bg-slate-800 rounded-lg p-1 max-w-full overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setVistaActiva('resumen')}
          className={`px-4 md:px-6 py-2 rounded-lg transition-colors shrink-0 ${
            vistaActiva === 'resumen' 
              ? 'bg-primary text-slate-900 font-semibold' 
              : 'text-gray-300 hover:text-white'
          }`}
        >
          📊 Resumen
        </button>
        <button
          onClick={() => setVistaActiva('stock')}
          className={`px-4 md:px-6 py-2 rounded-lg transition-colors shrink-0 ${
            vistaActiva === 'stock' 
              ? 'bg-primary text-slate-900 font-semibold' 
              : 'text-gray-300 hover:text-white'
          }`}
        >
          📦 Stock Detallado
        </button>
        <button
          onClick={() => setVistaActiva('movimientos')}
          className={`px-4 md:px-6 py-2 rounded-lg transition-colors shrink-0 ${
            vistaActiva === 'movimientos' 
              ? 'bg-primary text-slate-900 font-semibold' 
              : 'text-gray-300 hover:text-white'
          }`}
        >
          📋 Movimientos
        </button>
      </div>

      {/* Información */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-2">📦 Stock de Cajas por Proveedor</h4>
        <p className="text-sm text-gray-300 mb-2">
          Este stock se alimenta automáticamente desde los <strong>enrolamientos de recepción</strong> y se descuenta 
          cuando se confirman pedidos de cajas variables.
        </p>
        <div className="flex items-center text-sm text-blue-400">
          <span className="mr-2">💡</span>
          <span>Tip: Cada caja recibida en un enrolamiento incrementa automáticamente este stock.</span>
        </div>
      </div>

      {/* Vista de Resumen */}
      {vistaActiva === 'resumen' && resumen && (
        <div className="space-y-6">
          {/* Métricas generales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-slate-800 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-primary">{resumen.total_cajas_disponibles}</div>
              <div className="text-sm text-gray-400">Total Cajas Disponibles</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-blue-400">{resumen.total_productos}</div>
              <div className="text-sm text-gray-400">Productos con Stock</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-emerald-400">{resumen.total_proveedores}</div>
              <div className="text-sm text-gray-400">Proveedores Activos</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-red-400">{resumen.productos_sin_stock}</div>
              <div className="text-sm text-gray-400">Sin Stock</div>
            </div>
          </div>

          {/* Top productos con stock */}
          <div className="bg-slate-800 rounded-lg border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Top Productos con Mayor Stock</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resumen.productos_con_stock.slice(0, 12).map((item) => (
                  <div key={item.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white truncate">{item.producto_nombre}</h4>
                        <p className="text-sm text-gray-400">{item.producto_sku}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{item.cajas_disponibles}</div>
                        <div className="text-xs text-gray-400">cajas</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-300">
                      <div>{item.proveedor_nombre}</div>
                      <div className="text-xs text-gray-400">{item.proveedor_rut}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vista de Stock Detallado */}
      {vistaActiva === 'stock' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-4">
              <label className="flex items-center text-gray-300">
                <input
                  type="checkbox"
                  checked={filtroSoloConStock}
                  onChange={(e) => setFiltroSoloConStock(e.target.checked)}
                  className="mr-2"
                />
                Solo mostrar con stock disponible
              </label>
            </div>
            <div className="text-sm text-gray-400">
              Total: {stockItems.length} registro(s)
            </div>
          </div>

          {/* Tabla de stock */}
          <DataList
            items={stockItems}
            getKey={(i) => i.id}
            empty="No hay stock registrado"
            columns={[
              {
                header: 'Producto',
                className: 'w-[22%]',
                cell: (i) => (
                  <>
                    <div className="font-medium text-white truncate" title={i.producto_nombre}>{i.producto_nombre}</div>
                    <div className="text-xs text-gray-400">{i.producto_sku}</div>
                  </>
                ),
              },
              {
                header: 'Proveedor',
                className: 'w-[20%]',
                cell: (i) => (
                  <>
                    <div className="text-white truncate" title={i.proveedor_nombre}>{i.proveedor_nombre}</div>
                    <div className="text-xs text-gray-400">{i.proveedor_rut}</div>
                  </>
                ),
              },
              { header: 'Stock Actual', className: 'w-[11%] text-center', sinTruncar: true, cell: stockActual },
              { header: 'Recibidas', className: 'w-[11%] text-center', sinTruncar: true, cell: (i) => <span className="text-gray-300">{i.cajas_totales_recibidas}</span> },
              { header: 'Vendidas', className: 'w-[11%] text-center', sinTruncar: true, cell: (i) => <span className="text-gray-300">{i.cajas_totales_vendidas}</span> },
              { header: 'Actualización', className: 'w-[14%] text-center', sinTruncar: true, cell: (i) => <span className="text-gray-300">{new Date(i.fecha_ultima_actualizacion).toLocaleDateString('es-CL')}</span> },
              { header: 'Acciones', className: 'w-[11%] text-center', sinTruncar: true, cell: botonAjustar },
            ]}
            card={(i) => (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-white break-words">{i.producto_nombre}</div>
                    <div className="text-xs text-gray-400">{i.producto_sku}</div>
                  </div>
                  <div className="shrink-0 text-right">{stockActual(i)}<div className="text-[11px] text-gray-400">disponibles</div></div>
                </div>
                <div className="text-sm text-white">{i.proveedor_nombre} <span className="text-xs text-gray-400">{i.proveedor_rut}</span></div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-300">
                  <span>Recibidas: {i.cajas_totales_recibidas}</span>
                  <span>Vendidas: {i.cajas_totales_vendidas}</span>
                  <span>Actualizado: {new Date(i.fecha_ultima_actualizacion).toLocaleDateString('es-CL')}</span>
                </div>
                <div className="pt-2 border-t border-slate-700">{botonAjustar(i)}</div>
              </div>
            )}
          />
        </div>
      )}

      {/* Vista de Movimientos */}
      {vistaActiva === 'movimientos' && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Historial de Movimientos (Últimos 50)</h3>
          <DataList
            items={movimientos}
            getKey={(m) => m.id}
            empty="No hay movimientos registrados"
            columns={[
              {
                header: 'Fecha',
                className: 'w-[13%]',
                sinTruncar: true,
                cell: (m) => (
                  <>
                    <div className="text-white">{new Date(m.fecha_movimiento).toLocaleDateString('es-CL')}</div>
                    <div className="text-xs text-gray-400">{new Date(m.fecha_movimiento).toLocaleTimeString('es-CL')}</div>
                  </>
                ),
              },
              { header: 'Producto', className: 'w-[20%]', cell: (m) => <span className="text-white" title={m.producto_nombre}>{m.producto_nombre}</span> },
              { header: 'Proveedor', className: 'w-[17%]', cell: (m) => <span className="text-white" title={m.proveedor_nombre}>{m.proveedor_nombre}</span> },
              { header: 'Tipo', className: 'w-[14%]', sinTruncar: true, cell: tipoMov },
              { header: 'Movimiento', className: 'w-[11%] text-center', sinTruncar: true, cell: cajasMov },
              { header: 'Antes → Después', className: 'w-[13%] text-center', sinTruncar: true, cell: (m) => <span className="text-gray-300">{m.cajas_antes} → {m.cajas_despues}</span> },
              { header: 'Usuario', className: 'w-[12%]', cell: (m) => <span className="text-gray-300" title={m.usuario}>{m.usuario}</span> },
            ]}
            card={(m) => (
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white font-medium break-words">{m.producto_nombre}</div>
                    <div className="text-xs text-gray-400 break-words">{m.proveedor_nombre}</div>
                  </div>
                  <div className="shrink-0 text-right">{cajasMov(m)}<div className="text-xs text-gray-300">{m.cajas_antes} → {m.cajas_despues}</div></div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {tipoMov(m)}
                  <span className="text-gray-400">
                    {new Date(m.fecha_movimiento).toLocaleDateString('es-CL')} {new Date(m.fecha_movimiento).toLocaleTimeString('es-CL')}
                  </span>
                  <span className="text-gray-400">{m.usuario}</span>
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* Modal de ajuste */}
      {modalAjusteAbierto && itemSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6 w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Ajustar Stock</h3>
            
            <div className="space-y-4">
              <div className="bg-slate-700 rounded p-3">
                <div className="text-sm text-gray-300">
                  <div><strong>{itemSeleccionado.producto_nombre}</strong></div>
                  <div>{itemSeleccionado.proveedor_nombre}</div>
                  <div className="text-gray-400">Stock actual: {itemSeleccionado.cajas_disponibles} cajas</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nueva cantidad de cajas
                </label>
                <input
                  type="number"
                  value={nuevaCantidad}
                  onChange={(e) => setNuevaCantidad(Number(e.target.value))}
                  min="0"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                />
              </div>

              {nuevaCantidad !== itemSeleccionado.cajas_disponibles && (
                <div className="bg-blue-600/20 border border-blue-600 rounded p-3">
                  <div className="text-sm text-blue-400">
                    Diferencia: {nuevaCantidad - itemSeleccionado.cajas_disponibles > 0 ? '+' : ''}
                    {nuevaCantidad - itemSeleccionado.cajas_disponibles} cajas
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setModalAjusteAbierto(false)}
                className="px-4 py-2 text-gray-300 border border-gray-600 rounded hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={realizarAjuste}
                className="px-4 py-2 bg-primary text-slate-900 font-semibold rounded hover:bg-primary-dark"
              >
                Ajustar Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}