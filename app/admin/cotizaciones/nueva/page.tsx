'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import ProductoAutocomplete from '../components/ProductoAutocomplete';

interface Cliente { id: number; nombre: string; email?: string; rut?: string; }
interface Producto { id: number; nombre: string; sku?: string; precio_venta?: number; }
interface CanalVenta { id: number; nombre: string; }
interface Local { id: number; nombre: string; es_local_fabricacion: boolean; }
interface PrecioInfo { local_id: number; monto_precio: number; }

interface ItemForm {
  producto_id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  stock_total: number;
  stock_fab: number;
  precios: PrecioInfo[];
}

export default function NuevaCotizacionPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [canales, setCanales] = useState<CanalVenta[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);

  const [clienteId, setClienteId] = useState<number | ''>('');
  const [canalId, setCanalId] = useState<number | ''>('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState<ItemForm[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user?.access_token}`,
  };

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clientes/`, { headers }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/productos/`, { headers }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/canales-venta/`, { headers }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/precios/`, { headers }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/locales/`, { headers }).then(r => r.json()),
    ]).then(([c, p, cv, precios, ls]) => {
      setClientes(c);
      const idsConPrecio = new Set((precios as { producto_id: number }[]).map(pr => pr.producto_id));
      setProductos((p as Producto[]).filter(prod => idsConPrecio.has(prod.id)));
      setCanales(cv);
      setLocales(ls);
    }).catch(() => setError('Error al cargar datos'));
  }, []);

  const agregarItem = () => {
    setItems([...items, { producto_id: 0, nombre: '', cantidad: 1, precio_unitario: 0, subtotal: 0, stock_total: 0, stock_fab: 0, precios: [] }]);
  };

  const actualizarItem = (idx: number, field: keyof ItemForm, value: any) => {
    const nuevos = [...items];
    nuevos[idx] = { ...nuevos[idx], [field]: value };
    if (field === 'cantidad' || field === 'precio_unitario') {
      nuevos[idx].subtotal = nuevos[idx].cantidad * nuevos[idx].precio_unitario;
    }
    setItems(nuevos);
  };

  const seleccionarProducto = (idx: number, productoId: number, nombre: string, precioMax: number, stockTotal: number, stockFab: number, precios: PrecioInfo[]) => {
    const nuevos = [...items];
    nuevos[idx] = {
      ...nuevos[idx],
      producto_id: productoId,
      nombre,
      precio_unitario: precioMax,
      subtotal: nuevos[idx].cantidad * precioMax,
      stock_total: stockTotal,
      stock_fab: stockFab,
      precios,
    };
    setItems(nuevos);
  };

  const eliminarItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const montoTotal = items.reduce((sum, i) => sum + i.subtotal, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) { setError('Debes seleccionar un cliente'); return; }
    if (items.length === 0) { setError('Debes agregar al menos un ítem'); return; }
    if (items.some(i => i.producto_id === 0)) { setError('Todos los ítems deben tener un producto'); return; }

    setGuardando(true);
    setError('');
    try {
      const body = {
        cliente_id: clienteId,
        canal_venta_id: canalId || null,
        fecha_vencimiento: fechaVencimiento || null,
        notas: notas || null,
        items: items.map(i => ({
          producto_id: i.producto_id,
          nombre: i.nombre,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          subtotal: i.subtotal,
        })),
        monto_total: montoTotal,
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cotizaciones/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al crear cotización');
      }
      const cot = await res.json();
      router.push(`/admin/cotizaciones/${cot.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">← Volver</button>
        <h1 className="text-3xl font-bold text-white">Nueva Cotización</h1>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos generales */}
        <div className="bg-slate-800 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Datos generales</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">Cliente *</label>
              <select
                required
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                value={clienteId}
                onChange={e => setClienteId(Number(e.target.value))}
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}{c.rut ? ` (${c.rut})` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Canal de venta</label>
              <select
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                value={canalId}
                onChange={e => setCanalId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Sin canal</option>
                {canales.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Fecha de vencimiento</label>
              <input
                type="date"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                value={fechaVencimiento}
                onChange={e => setFechaVencimiento(e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Notas internas</label>
              <textarea
                rows={2}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                placeholder="Observaciones internas (no visibles para el cliente)"
                value={notas}
                onChange={e => setNotas(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Ítems */}
        <div className="bg-slate-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <h2 className="text-lg font-semibold text-white">Ítems</h2>
            <button
              type="button"
              onClick={agregarItem}
              className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded transition-colors"
            >
              + Agregar ítem
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-6 text-gray-500 italic text-sm">
              No hay ítems. Haz clic en "Agregar ítem" para comenzar.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="bg-slate-700 rounded p-3 space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      {idx === 0 && <label className="block text-xs text-gray-400 mb-1">Producto</label>}
                      <ProductoAutocomplete
                        productos={productos}
                        value={item.producto_id}
                        localesFabIds={locales.filter(l => l.es_local_fabricacion).map(l => l.id)}
                        accessToken={user?.access_token ?? undefined}
                        onSelect={(id, nombre, precio, stockTotal, stockFab, precios) => seleccionarProducto(idx, id, nombre, precio, stockTotal, stockFab, precios)}
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <label className="block text-xs text-gray-400 mb-1">Cantidad</label>}
                      <input
                        type="number"
                        min={0.001}
                        step="any"
                        className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-white text-sm"
                        value={item.cantidad}
                        onChange={e => actualizarItem(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <label className="block text-xs text-gray-400 mb-1">Precio unit.</label>}
                      <input
                        type="number"
                        min={0}
                        className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-white text-sm"
                        value={item.precio_unitario}
                        onChange={e => actualizarItem(idx, 'precio_unitario', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-3">
                      {idx === 0 && <label className="block text-xs text-gray-400 mb-1">Subtotal</label>}
                      <div className="bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-white text-sm font-semibold">
                        ${item.subtotal.toLocaleString('es-CL')}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => eliminarItem(idx)}
                        className="text-red-400 hover:text-red-300 text-lg leading-none"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {item.producto_id !== 0 && (
                    <div className="flex flex-wrap items-center gap-3 text-xs pl-1">
                      <span className={item.stock_fab <= 0 ? 'text-red-400 font-semibold' : 'text-emerald-400'}>
                        Fab: {item.stock_fab}
                        {item.stock_total !== item.stock_fab && (
                          <span className="text-gray-500 ml-1">· Total: {item.stock_total}</span>
                        )}
                      </span>
                      {item.precios.length > 0 && (
                        <span className="text-gray-500">Precios:</span>
                      )}
                      {item.precios.map((p, pi) => (
                        <button
                          key={pi}
                          type="button"
                          onClick={() => actualizarItem(idx, 'precio_unitario', p.monto_precio)}
                          className={`px-2 py-0.5 rounded border transition-colors ${item.precio_unitario === p.monto_precio ? 'border-primary text-primary' : 'border-slate-500 text-gray-300 hover:border-slate-400'}`}
                        >
                          {locales.find(l => l.id === p.local_id)?.nombre ?? `Local ${p.local_id}`}: ${p.monto_precio.toLocaleString('es-CL')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-end pt-2 border-t border-slate-700">
                <div className="text-right">
                  <span className="text-gray-400 text-sm">Total: </span>
                  <span className="text-white font-bold text-xl ml-2">${montoTotal.toLocaleString('es-CL')}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded text-gray-300 hover:bg-slate-700">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="px-6 py-2 rounded bg-primary hover:bg-primary-dark text-slate-900 font-semibold disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Crear Cotización'}
          </button>
        </div>
      </form>
    </div>
  );
}
