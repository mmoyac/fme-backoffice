'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import ProductoAutocomplete from '../../../cotizaciones/components/ProductoAutocomplete';

interface TipoOT { id: number; codigo: string; nombre: string; activo?: boolean; }
interface Local { id: number; nombre: string; }
interface Producto { id: number; nombre: string; tiene_receta?: boolean; }
interface UnidadMedida { id: number; nombre: string; abreviacion?: string; }

interface ItemForm {
  producto_id: number;
  nombre: string;
  unidad_medida_id: number | '';
  cantidad: number;
}

export default function NuevaOTPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tipos, setTipos] = useState<TipoOT[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);

  const [tipoId, setTipoId] = useState<number | ''>('');
  const [tipoCodigoSeleccionado, setTipoCodigoSeleccionado] = useState('');
  const [localId, setLocalId] = useState<number | ''>('');
  const [fechaProgramada, setFechaProgramada] = useState('');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState<ItemForm[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Venimos de una cotización o pedido?
  const cotizacionId = searchParams.get('cotizacion_id');
  const pedidoId = searchParams.get('pedido_id');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user?.access_token}`,
  };

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/tipos`, { headers }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/locales/`, { headers }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/productos/`, { headers }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/maestras/unidades`, { headers }).then(r => r.json()),
    ]).then(([t, l, p, u]) => {
      setTipos((t as TipoOT[]).filter((x: TipoOT) => x.activo !== false));
      setLocales(l);
      setProductos(p);
      setUnidades(u);
    }).catch(() => setError('Error al cargar datos'));
  }, []);

  const agregarItem = () => {
    setItems([...items, { producto_id: 0, nombre: '', unidad_medida_id: '', cantidad: 1 }]);
  };

  const actualizarItem = (idx: number, field: keyof ItemForm, value: any) => {
    const nuevos = [...items];
    nuevos[idx] = { ...nuevos[idx], [field]: value };
    setItems(nuevos);
  };

  const seleccionarProducto = (idx: number, productoId: number, nombre: string) => {
    const nuevos = [...items];
    nuevos[idx] = { ...nuevos[idx], producto_id: productoId, nombre };
    setItems(nuevos);
  };

  const eliminarItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoId) { setError('Debes seleccionar un tipo de OT'); return; }
    if (!localId) { setError('Debes seleccionar un local'); return; }
    if (items.length === 0) { setError('Debes agregar al menos un ítem'); return; }
    if (items.some(i => i.producto_id === 0)) { setError('Todos los ítems deben tener un producto'); return; }

    setGuardando(true);
    setError('');
    try {
      const body = {
        tipo_ot_id: tipoId,
        local_id: localId,
        pedido_id: pedidoId ? Number(pedidoId) : null,
        cotizacion_id: cotizacionId ? Number(cotizacionId) : null,
        fecha_programada: fechaProgramada ? new Date(fechaProgramada).toISOString() : null,
        notas: notas || null,
        items: items.map(i => ({
          producto_id: i.producto_id,
          unidad_medida_id: i.unidad_medida_id || null,
          cantidad: i.cantidad,
        })),
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ordenes-trabajo/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al crear OT');
      }
      const ot = await res.json();
      router.push(`/admin/produccion/ordenes-trabajo/${ot.id}`);
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
        <h1 className="text-3xl font-bold text-white">Nueva Orden de Trabajo</h1>
      </div>

      {(cotizacionId || pedidoId) && (
        <div className="bg-blue-900/30 border border-blue-700 text-blue-200 px-4 py-3 rounded text-sm">
          {cotizacionId && <span>Vinculada a cotización #{cotizacionId}</span>}
          {pedidoId && <span>Vinculada a pedido #{pedidoId}</span>}
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos generales */}
        <div className="bg-slate-800 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Datos generales</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de OT *</label>
              <select
                required
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                value={tipoId}
                onChange={e => {
                  const id = Number(e.target.value);
                  setTipoId(id);
                  const t = tipos.find(x => x.id === id);
                  setTipoCodigoSeleccionado(t?.codigo ?? '');
                  setItems([]); // limpiar ítems al cambiar tipo
                }}
              >
                <option value="">Seleccionar tipo...</option>
                {tipos.map(t => (
                  <option key={t.id} value={t.id}>{t.codigo} — {t.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Local *</label>
              <select
                required
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                value={localId}
                onChange={e => setLocalId(Number(e.target.value))}
              >
                <option value="">Seleccionar local...</option>
                {locales.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Fecha programada</label>
              <input
                type="datetime-local"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                value={fechaProgramada}
                onChange={e => setFechaProgramada(e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Notas internas</label>
              <textarea
                rows={2}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                placeholder="Observaciones, instrucciones especiales..."
                value={notas}
                onChange={e => setNotas(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Ítems */}
        <div className="bg-slate-800 rounded-lg p-6 space-y-4">
          {tipoCodigoSeleccionado === 'OP' && (
            <div className="bg-blue-900/30 border border-blue-700 text-blue-200 px-4 py-3 rounded text-sm">
              <strong>ℹ️ Información importante</strong><br />
              Solo aparecen productos que tienen <strong>receta configurada</strong>. Si no ves el producto en la lista,
              verifica que tenga la opción "Tiene Receta" activada en el catálogo y al menos una receta creada.
            </div>
          )}

          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <h2 className="text-lg font-semibold text-white">Ítems a producir / ejecutar</h2>
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
                <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-slate-700 rounded p-3">
                  <div className="col-span-5">
                    {idx === 0 && <label className="block text-xs text-gray-400 mb-1">Producto</label>}
                    <ProductoAutocomplete
                      productos={tipoCodigoSeleccionado === 'OP'
                        ? productos.filter(p => p.tiene_receta)
                        : productos}
                      value={item.producto_id}
                      accessToken={user?.access_token ?? undefined}
                      onSelect={(id, nombre) => seleccionarProducto(idx, id, nombre)}
                    />
                  </div>
                  <div className="col-span-3">
                    {idx === 0 && <label className="block text-xs text-gray-400 mb-1">Unidad</label>}
                    <select
                      className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-white text-sm"
                      value={item.unidad_medida_id}
                      onChange={e => actualizarItem(idx, 'unidad_medida_id', e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">Sin unidad</option>
                      {unidades.map(u => (
                        <option key={u.id} value={u.id}>{u.abreviacion || u.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
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
              ))}
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
            {guardando ? 'Creando...' : 'Crear OT'}
          </button>
        </div>
      </form>
    </div>
  );
}
