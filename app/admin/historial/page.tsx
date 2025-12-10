'use client';

import { useState, useEffect } from 'react';
import { listarMovimientos, MovimientoInventario } from '@/lib/api/movimientos';
import { getProductos, Producto } from '@/lib/api/productos';
import { getLocales, Local } from '@/lib/api/locales';

export default function HistorialMovimientosPage() {
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [filtroProducto, setFiltroProducto] = useState<number>(0);
  const [filtroLocal, setFiltroLocal] = useState<number>(0);
  const [filtroTipo, setFiltroTipo] = useState<string>('');

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    cargarMovimientos();
  }, [filtroProducto, filtroLocal, filtroTipo]);

  const cargarDatos = async () => {
    try {
      const [prodData, locData] = await Promise.all([
        getProductos(),
        getLocales()
      ]);
      setProductos(prodData);
      setLocales(locData);
    } catch (err) {
      console.error('Error al cargar datos:', err);
    }
  };

  const cargarMovimientos = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listarMovimientos(
        filtroProducto || undefined,
        filtroLocal || undefined,
        filtroTipo || undefined
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Historial de Movimientos</h1>
      </div>

      {/* Filtros */}
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Filtrar por Producto
            </label>
            <select
              value={filtroProducto}
              onChange={(e) => setFiltroProducto(Number(e.target.value))}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
            >
              <option value={0}>Todos los productos</option>
              {productos.map(producto => (
                <option key={producto.id} value={producto.id}>
                  {producto.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
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
          </div>

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
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Origen</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Destino</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Cantidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {movimientos.map((mov) => {
                  const tipoInfo = getTipoLabel(mov.tipo_movimiento);
                  return (
                    <tr key={mov.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-4 text-gray-300 text-sm">
                        {formatFecha(mov.fecha_movimiento)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`${tipoInfo.color} text-white px-2 py-1 rounded text-xs font-semibold`}>
                          {tipoInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-white font-medium">{mov.producto?.nombre}</div>
                        <div className="text-xs text-gray-400">SKU: {mov.producto?.sku}</div>
                      </td>
                      <td className="px-4 py-4 text-gray-300">
                        {mov.local_origen?.nombre || '-'}
                      </td>
                      <td className="px-4 py-4 text-gray-300">
                        {mov.local_destino?.nombre || '-'}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-white font-semibold">{mov.cantidad}</span>
                      </td>
                      <td className="px-4 py-4 text-gray-300 text-sm">
                        {mov.usuario}
                      </td>
                      <td className="px-4 py-4 text-gray-400 text-sm max-w-xs truncate">
                        {mov.notas || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
