'use client';

import { useState, useEffect } from 'react';
import { transferirInventario, TransferenciaInventario } from '@/lib/api/movimientos';
import { getProductos, Producto } from '@/lib/api/productos';
import { getLocales, Local } from '@/lib/api/locales';
import { getInventarios, Inventario } from '@/lib/api/inventario';

export default function TransferenciasPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [inventarios, setInventarios] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<TransferenciaInventario>({
    producto_id: 0,
    local_origen_id: 0,
    local_destino_id: 0,
    cantidad: 1,
    notas: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [prodData, locData, invData] = await Promise.all([
        getProductos(),
        getLocales(),
        getInventarios()
      ]);
      setProductos(prodData);
      setLocales(locData);
      setInventarios(invData);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar datos iniciales');
    }
  };

  const getStockDisponible = (productoId: number, localId: number): number => {
    const inv = inventarios.find(
      i => i.producto_id === productoId && i.local_id === localId
    );
    return inv?.cantidad_stock || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.producto_id || !formData.local_origen_id || !formData.local_destino_id) {
      setError('Complete todos los campos obligatorios');
      return;
    }

    if (formData.local_origen_id === formData.local_destino_id) {
      setError('El local de origen y destino deben ser diferentes');
      return;
    }

    const stockDisponible = getStockDisponible(formData.producto_id, formData.local_origen_id);
    if (formData.cantidad > stockDisponible) {
      setError(`Stock insuficiente. Disponible: ${stockDisponible} unidades`);
      return;
    }

    try {
      setLoading(true);
      const result = await transferirInventario(formData);
      setSuccess(result.mensaje || 'Transferencia realizada exitosamente');
      
      // Limpiar formulario
      setFormData({
        producto_id: 0,
        local_origen_id: 0,
        local_destino_id: 0,
        cantidad: 1,
        notas: ''
      });

      // Recargar inventarios
      const invData = await getInventarios();
      setInventarios(invData);
    } catch (err: any) {
      setError(err.message || 'Error al realizar la transferencia');
    } finally {
      setLoading(false);
    }
  };

  const productoSeleccionado = productos.find(p => p.id === formData.producto_id);
  const stockOrigen = formData.local_origen_id ? getStockDisponible(formData.producto_id, formData.local_origen_id) : 0;
  const stockDestino = formData.local_destino_id ? getStockDisponible(formData.producto_id, formData.local_destino_id) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Transferencias de Inventario</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Nueva Transferencia</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Producto */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Producto *
              </label>
              <select
                value={formData.producto_id}
                onChange={(e) => setFormData({ ...formData, producto_id: Number(e.target.value) })}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
                required
              >
                <option value={0}>-- Seleccionar producto --</option>
                {productos.map(producto => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre} (SKU: {producto.sku})
                  </option>
                ))}
              </select>
            </div>

            {/* Local Origen */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Desde Local *
              </label>
              <select
                value={formData.local_origen_id}
                onChange={(e) => setFormData({ ...formData, local_origen_id: Number(e.target.value) })}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
                required
              >
                <option value={0}>-- Seleccionar local origen --</option>
                {locales.map(local => (
                  <option key={local.id} value={local.id}>
                    {local.nombre} ({local.codigo})
                  </option>
                ))}
              </select>
              {formData.producto_id > 0 && formData.local_origen_id > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  Stock disponible: <span className="font-semibold text-white">{stockOrigen}</span> unidades
                </p>
              )}
            </div>

            {/* Local Destino */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Hacia Local *
              </label>
              <select
                value={formData.local_destino_id}
                onChange={(e) => setFormData({ ...formData, local_destino_id: Number(e.target.value) })}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
                required
              >
                <option value={0}>-- Seleccionar local destino --</option>
                {locales.map(local => (
                  <option key={local.id} value={local.id}>
                    {local.nombre} ({local.codigo})
                  </option>
                ))}
              </select>
              {formData.producto_id > 0 && formData.local_destino_id > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  Stock actual: <span className="font-semibold text-white">{stockDestino}</span> unidades
                </p>
              )}
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cantidad *
              </label>
              <input
                type="number"
                min="1"
                max={stockOrigen}
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: Number(e.target.value) })}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder="Motivo o comentarios adicionales..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Transfiriendo...' : 'Realizar Transferencia'}
            </button>
          </form>
        </div>

        {/* Vista Previa */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Resumen de Transferencia</h2>

          {formData.producto_id > 0 ? (
            <div className="space-y-4">
              {/* Producto */}
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Producto</p>
                <p className="text-white font-semibold">{productoSeleccionado?.nombre}</p>
                <p className="text-xs text-gray-400">SKU: {productoSeleccionado?.sku}</p>
              </div>

              {/* Movimiento */}
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-400">Origen</p>
                    <p className="text-white font-semibold">
                      {locales.find(l => l.id === formData.local_origen_id)?.nombre || '-'}
                    </p>
                    <p className="text-xs text-gray-400">Stock: {stockOrigen}</p>
                  </div>

                  <div className="px-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <p className="text-center text-primary font-bold mt-1">{formData.cantidad}</p>
                  </div>

                  <div className="flex-1 text-right">
                    <p className="text-sm text-gray-400">Destino</p>
                    <p className="text-white font-semibold">
                      {locales.find(l => l.id === formData.local_destino_id)?.nombre || '-'}
                    </p>
                    <p className="text-xs text-gray-400">Stock: {stockDestino}</p>
                  </div>
                </div>
              </div>

              {/* Resultado Esperado */}
              {formData.local_origen_id > 0 && formData.local_destino_id > 0 && (
                <div className="bg-primary/10 border border-primary rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Resultado esperado:</p>
                  <div className="space-y-1">
                    <p className="text-white">
                      <span className="font-semibold">{locales.find(l => l.id === formData.local_origen_id)?.nombre}:</span>{' '}
                      {stockOrigen} → {stockOrigen - formData.cantidad} unidades
                    </p>
                    <p className="text-white">
                      <span className="font-semibold">{locales.find(l => l.id === formData.local_destino_id)?.nombre}:</span>{' '}
                      {stockDestino} → {stockDestino + formData.cantidad} unidades
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>Seleccione un producto para ver el resumen</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
