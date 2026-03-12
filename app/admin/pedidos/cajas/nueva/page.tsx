'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthService } from '@/lib/auth';
import { crearPreventa, type ItemPreventaCreate } from '@/lib/api/preventa';
import { getClientes, type Cliente } from '@/lib/api/clientes';
import { getLocales, type Local } from '@/lib/api/locales';
import { getMediosPago, type MedioPago } from '@/lib/api/maestras';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PrecioProveedor {
  id: number;
  proveedor_id: number;
  proveedor_nombre: string;
  precio_kg: number;
  precio_minimo_kg: number | null;
}

interface ProductoConPrecios {
  id: number;
  nombre: string;
  sku: string;
  precio_incluye_iva: boolean;
  descuento_contado: number | null;
  precios_proveedores: PrecioProveedor[];
}

interface LocalCliente {
  id: number;
  nombre: string;
  direccion: string;
}

interface ItemFormulario {
  id: string;
  producto_id: number;
  proveedor_id: number;
  cantidad: number;
  precio_kg: number;
  precio_minimo_kg: number | null;
  precio_acordado_kg: number | null; // null = usar precio base
  local_cliente_id: number | null;
  stock_disponible: number | null; // null = no cargado aún
}

function genId() {
  return Math.random().toString(36).slice(2);
}

const inputClass =
  'w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all';
const labelClass = 'block text-sm font-medium text-slate-300 mb-1.5';
const glowClass = 'ring-2 ring-cyan-400 !border-cyan-400 shadow-[0_0_14px_2px_rgba(94,200,242,0.35)]';

export default function NuevaPreventaPage() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [productos, setProductos] = useState<ProductoConPrecios[]>([]);
  const [localesCliente, setLocalesCliente] = useState<LocalCliente[]>([]);
  const [loading, setLoading] = useState(true);
  // búsqueda autocomplete por item: itemId -> texto
  const [searchCorte, setSearchCorte] = useState<Record<string, string>>({});
  const [openCorte, setOpenCorte] = useState<string | null>(null);
  const corteRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [clienteId, setClienteId] = useState<number | null>(null);
  const [localId, setLocalId] = useState<number | null>(null);
  const [notas, setNotas] = useState('');
  const [tipoDocId, setTipoDocId] = useState<number>(2); // 1=FAC, 2=BOL
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
  const [medioPagoId, setMedioPagoId] = useState<number | null>(null);
  const [items, setItems] = useState<ItemFormulario[]>([
    { id: genId(), producto_id: 0, proveedor_id: 0, cantidad: 1, precio_kg: 0, precio_minimo_kg: null, precio_acordado_kg: null, local_cliente_id: null, stock_disponible: null },
  ]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!AuthService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    Promise.all([
      AuthService.getCurrentUser(),
      getClientes(),
      getLocales(),
      getMediosPago(),
      fetch(`${API_URL}/api/precios-proveedor/productos`, {
        headers: AuthService.getAuthHeaders(),
      }).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
    ])
      .then(([usuario, cls, locs, medios, prods]) => {
        const locsActivos = locs.filter((l: Local) => l.activo !== false);
        const mediosActivos: MedioPago[] = (medios as MedioPago[]).filter((m) => m.activo);
        setClientes(cls);
        setLocales(locsActivos);
        setMediosPago(mediosActivos);
        // No pre-seleccionar: vendedor debe elegir conscientemente
        setProductos(prods
          .filter((p: ProductoConPrecios) => p.precios_proveedores.length > 0)
          .sort((a: ProductoConPrecios, b: ProductoConPrecios) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
        );
        // Seleccionar local por defecto del usuario logueado
        if (usuario?.local_defecto_id) {
          setLocalId(usuario.local_defecto_id);
        } else if (locsActivos.length > 0) {
          setLocalId(locsActivos[0].id);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  // Stock por producto: producto_id -> proveedor_id -> cajas_disponibles
  const [stockMap, setStockMap] = useState<Record<number, Record<number, number>>>({});

  const cargarStockProducto = async (producto_id: number) => {
    if (stockMap[producto_id] !== undefined) return; // ya cargado
    try {
      const res = await fetch(`${API_URL}/api/stock-cajas/producto/${producto_id}`, {
        headers: AuthService.getAuthHeaders(),
      });
      if (!res.ok) return;
      const data: { proveedor_id: number; cajas_disponibles: number }[] = await res.json();
      setStockMap((prev) => ({
        ...prev,
        [producto_id]: Object.fromEntries(data.map((d) => [d.proveedor_id, d.cajas_disponibles])),
      }));
    } catch { /* silencio */ }
  };

  const getStock = (producto_id: number, proveedor_id: number): number | null => {
    if (!producto_id || !proveedor_id) return null;
    return stockMap[producto_id]?.[proveedor_id] ?? null;
  };

  const getStockForProducto = (producto_id: number): Record<number, number> =>
    stockMap[producto_id] ?? {};

  // Devuelve cuántas cajas están efectivamente disponibles para el ítem dado,
  // descontando lo que otros ítems del formulario ya están reclamando.
  const getEffectiveStock = (producto_id: number, proveedor_id: number, excludeItemId: string): number | null => {
    if (!producto_id || !proveedor_id) return null;
    const raw = stockMap[producto_id]?.[proveedor_id] ?? null;
    if (raw === null) return null;
    const alreadyClaimed = items
      .filter(i => i.id !== excludeItemId && i.producto_id === producto_id && i.proveedor_id === proveedor_id)
      .reduce((sum, i) => sum + i.cantidad, 0);
    return Math.max(0, raw - alreadyClaimed);
  };

  const cargarLocalesCliente = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/locales_cliente/cliente/${id}`, {
        headers: AuthService.getAuthHeaders(),
      });
      if (res.ok) setLocalesCliente(await res.json());
      else setLocalesCliente([]);
    } catch {
      setLocalesCliente([]);
    }
  };

  const handleClienteChange = (id: number | null) => {
    setClienteId(id);
    setLocalesCliente([]);
    // Limpiar local_cliente_id de todos los items
    setItems((prev) => prev.map((i) => ({ ...i, local_cliente_id: null })));
    if (id) {
      cargarLocalesCliente(id);
      // Auto-seleccionar tipo de documento según tipo de cliente
      const cliente = clientes.find((c) => c.id === id);
      setTipoDocId(cliente?.es_empresa ? 1 : 2);
    }
  };

  const getProveedoresForProducto = useCallback(
    (producto_id: number): PrecioProveedor[] => {
      const prod = productos.find((p) => p.id === producto_id);
      return prod?.precios_proveedores ?? [];
    },
    [productos]
  );

  const updateItem = (id: string, field: keyof ItemFormulario, value: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'producto_id') {
          updated.proveedor_id = 0;
          updated.precio_kg = 0;
          updated.stock_disponible = null;
          cargarStockProducto(value);
        }
        if (field === 'proveedor_id') {
          const proveedores = getProveedoresForProducto(item.producto_id);
          const prov = proveedores.find((p) => p.proveedor_id === value);
          updated.precio_kg = prov?.precio_kg ?? 0;
          updated.precio_minimo_kg = prov?.precio_minimo_kg ?? null;
          updated.precio_acordado_kg = null; // reset precio acordado al cambiar proveedor
          const stock = getEffectiveStock(item.producto_id, value, id);
          updated.stock_disponible = stock;
          // Ajustar cantidad si excede stock
          if (stock !== null && updated.cantidad > stock) {
            updated.cantidad = Math.max(1, stock);
          }
        }
        if (field === 'cantidad') {
          const stock = getEffectiveStock(item.producto_id, item.proveedor_id, id);
          if (stock !== null) updated.cantidad = Math.min(value, stock);
        }
        return updated;
      })
    );
  };

  const addItem = () => {
    const newId = genId();
    setItems((prev) => [
      ...prev,
      { id: newId, producto_id: 0, proveedor_id: 0, cantidad: 1, precio_kg: 0, precio_minimo_kg: null, precio_acordado_kg: null, local_cliente_id: null, stock_disponible: null },
    ]);
    setSearchCorte((prev) => ({ ...prev, [newId]: '' }));
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const stepCantidad = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const stock = getEffectiveStock(item.producto_id, item.proveedor_id, item.id);
        const nueva = Math.max(1, item.cantidad + delta);
        return { ...item, cantidad: stock !== null ? Math.min(nueva, stock) : nueva };
      })
    );
  };

  const totalCajas = items.reduce((s, i) => s + (i.cantidad || 0), 0);

  const puedeGuardar =
    clienteId !== null &&
    localId !== null &&
    medioPagoId !== null &&
    items.length > 0 &&
    items.every(
      (i) =>
        i.producto_id > 0 &&
        i.proveedor_id > 0 &&
        i.cantidad > 0 &&
        i.local_cliente_id !== null &&
        (getEffectiveStock(i.producto_id, i.proveedor_id, i.id) === null || i.cantidad <= (getEffectiveStock(i.producto_id, i.proveedor_id, i.id) ?? Infinity)) &&
        (i.precio_acordado_kg === null || (i.precio_minimo_kg !== null && i.precio_acordado_kg >= i.precio_minimo_kg && i.precio_acordado_kg <= i.precio_kg))
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeGuardar) return;
    setError('');
    setGuardando(true);
    try {
      const resultado = await crearPreventa({
        cliente_id: clienteId!,
        local_id: localId!,
        notas: notas || undefined,
        tipo_documento_tributario_id: tipoDocId,
        medio_pago_id: medioPagoId!,
        items: items.map(
          (i): ItemPreventaCreate => ({
            producto_id: i.producto_id,
            proveedor_id: i.proveedor_id,
            cantidad: i.cantidad,
            local_cliente_id: i.local_cliente_id ?? undefined,
            precio_acordado_kg: i.precio_acordado_kg ?? undefined,
          })
        ),
      });
      router.push(`/admin/pedidos/cajas?success=${resultado.numero_pedido}`);
    } catch (e: any) {
      setError(e.message || 'Error al crear la pre-venta');
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const firstIncompleteIdx = clienteId
    ? items.findIndex(i => !i.producto_id || !i.proveedor_id || i.local_cliente_id === null)
    : -1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/pedidos/cajas"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-3"
        >
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-white">Nueva Pre-Venta</h1>
        <p className="text-slate-400 text-sm mt-1">
          Registra los cortes que el cliente necesita
        </p>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 mb-5 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Local de Venta — asignado automáticamente al usuario logueado */}
        <div>
          <label className={labelClass}>Local de Venta</label>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm">
            <span className="text-slate-400">🏪</span>
            <span className="text-white font-medium">
              {localId ? (locales.find(l => l.id === localId)?.nombre ?? `Local #${localId}`) : 'Cargando...'}
            </span>
            <span className="text-slate-500 text-xs ml-auto">Asignado automáticamente</span>
          </div>
        </div>

        {/* Cliente */}
        <div>
          <label className={labelClass}>Cliente *</label>
          <select
            value={clienteId ?? ''}
            onChange={(e) => handleClienteChange(Number(e.target.value) || null)}
            className={`${inputClass} ${!clienteId ? glowClass : ''}`}
            required
          >
            <option value="">— Seleccionar cliente —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}{c.telefono ? ` · ${c.telefono}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de Documento */}
        <div>
          <label className={`${labelClass} ${!clienteId ? 'opacity-40' : ''}`}>Tipo de Documento</label>
          <div className={`flex gap-3 ${!clienteId ? 'opacity-40 pointer-events-none' : ''}`}>
            <button
              type="button"
              onClick={() => setTipoDocId(2)}
              disabled={!clienteId}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-semibold text-sm transition-colors ${
                tipoDocId === 2
                  ? 'bg-cyan-600 border-cyan-500 text-white'
                  : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
              }`}
            >
              🧾 Boleta
            </button>
            <button
              type="button"
              onClick={() => setTipoDocId(1)}
              disabled={!clienteId}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-semibold text-sm transition-colors ${
                tipoDocId === 1
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
              }`}
            >
              📄 Factura
            </button>
          </div>
          {!clienteId && (
            <p className="text-slate-500 text-xs mt-1.5">↑ Selecciona primero el cliente</p>
          )}
          {tipoDocId === 1 && clienteId && (() => {
            const cliente = clientes.find((c) => c.id === clienteId);
            if (cliente?.es_empresa) return null;
            return (
              <p className="text-amber-400 text-xs mt-1.5">
                ⚠️ El cliente seleccionado no es empresa. Considera usar Boleta.
              </p>
            );
          })()}
          {tipoDocId === 2 && clienteId && (() => {
            const cliente = clientes.find((c) => c.id === clienteId);
            if (!cliente?.es_empresa) return null;
            return (
              <p className="text-blue-400 text-xs mt-1.5">
                ℹ️ Cliente empresa — se seleccionó Factura automáticamente, puedes cambiar si es necesario.
              </p>
            );
          })()}
        </div>

        {/* Medio de Pago */}
        <div>
          <label className={`${labelClass} ${!clienteId ? 'opacity-40' : ''}`}>
            Medio de Pago *
            {clienteId && !medioPagoId && (
              <span className="ml-2 text-amber-400 font-normal text-xs">← selecciona uno para continuar</span>
            )}
          </label>
          <div className={`flex flex-col gap-2 ${!clienteId ? 'opacity-40 pointer-events-none' : ''}`}>
            {mediosPago.map((mp) => {
              const selected = medioPagoId === mp.id;
              return (
                <button
                  key={mp.id}
                  type="button"
                  onClick={() => setMedioPagoId(mp.id)}
                  disabled={!clienteId}
                  className={`flex items-center gap-3 py-3 px-4 rounded-xl border text-sm transition-all disabled:cursor-not-allowed text-left ${
                    selected
                      ? 'bg-cyan-600/20 border-cyan-500 text-white ring-1 ring-cyan-500'
                      : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    selected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-500'
                  }`} />
                  <span className="text-lg leading-none">{mp.es_contado ? '💵' : '📋'}</span>
                  <span className="flex-1">
                    <span className="font-semibold">{mp.nombre}</span>
                    {mp.es_contado && (
                      <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5">
                        Al contado
                      </span>
                    )}
                  </span>
                  {selected && (
                    <span className="text-cyan-400 text-sm font-bold">✓</span>
                  )}
                </button>
              );
            })}
          </div>
          {clienteId && medioPagoId && (() => {
            const mp = mediosPago.find((m) => m.id === medioPagoId);
            if (mp?.es_contado) return (
              <p className="text-emerald-400 text-xs mt-1.5">✅ Precio al contado — se aplicará descuento en picking si está configurado</p>
            );
            return null;
          })()}
        </div>

        {/* Notas */}
        <div>
          <label className={`${labelClass} ${!clienteId ? 'opacity-40' : ''}`}>Notas <span className="text-slate-500 font-normal">(opcional)</span></label>
          <input
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Horario de entrega, instrucciones..."
            disabled={!clienteId}
            className={`${inputClass} disabled:opacity-40`}
          />
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`font-semibold text-base ${!clienteId ? 'text-slate-500' : 'text-white'}`}>
              Cortes Pedidos
              <span className="text-slate-500 font-normal text-sm ml-2">({items.length})</span>
            </h2>
          </div>

          {/* Bloqueo si no hay cliente */}
          {!clienteId ? (
            <div className="flex flex-col items-center justify-center gap-3 bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl py-10 px-6 text-center">
              <span className="text-3xl">👆</span>
              <p className="text-slate-400 text-sm font-medium">
                Selecciona un cliente para comenzar a agregar cortes
              </p>
            </div>
          ) : (
          <>
          <div className="space-y-3">
            {items.map((item, idx) => {
              const proveedores = getProveedoresForProducto(item.producto_id);
              return (
                <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
                  {/* Header de la tarjeta */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">
                      Corte {idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-300 text-sm font-medium py-1 px-2"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>

                  {/* Progreso del corte */}
                  {(() => {
                    const paso = item.producto_id === 0 ? 0 : item.proveedor_id === 0 ? 1 : item.local_cliente_id === null ? 2 : 3;
                    const steps = ['Corte', 'Proveedor', 'Local', 'Cantidad'];
                    return (
                      <div className="flex items-center gap-1 flex-wrap">
                        {steps.map((label, i) => (
                          <div key={i} className="flex items-center gap-0.5">
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                              i < paso
                                ? 'bg-emerald-900/30 border-emerald-700 text-emerald-400'
                                : i === paso
                                ? 'bg-cyan-900/40 border-cyan-600 text-cyan-300'
                                : 'border-slate-700 text-slate-600'
                            }`}>
                              {i < paso ? '✓ ' : ''}{label}
                            </span>
                            {i < steps.length - 1 && (
                              <span className="text-slate-700 text-[10px] mx-0.5">›</span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Corte */}
                  <div ref={(el) => { corteRefs.current[item.id] = el; }} className="relative">
                    <label className={labelClass}>Corte / Producto *</label>
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="Buscar corte..."
                      value={openCorte === item.id
                        ? (searchCorte[item.id] ?? '')
                        : (productos.find(p => p.id === item.producto_id)?.nombre ?? '')
                      }
                      onFocus={() => {
                        setOpenCorte(item.id);
                        setSearchCorte(prev => ({ ...prev, [item.id]: '' }));
                      }}
                      onChange={(e) => setSearchCorte(prev => ({ ...prev, [item.id]: e.target.value }))}
                      onBlur={() => setTimeout(() => setOpenCorte(null), 150)}
                      className={`${inputClass} ${idx === firstIncompleteIdx && item.producto_id === 0 ? glowClass : ''}`}
                    />
                    {openCorte === item.id && (() => {
                      const q = (searchCorte[item.id] ?? '').toLowerCase();
                      const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(q));
                      return (
                        <ul className="absolute z-50 left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                          {filtrados.length === 0 ? (
                            <li className="px-4 py-3 text-slate-400 text-sm">Sin resultados</li>
                          ) : filtrados.map(p => (
                            <li
                              key={p.id}
                              onMouseDown={() => {
                                updateItem(item.id, 'producto_id', p.id);
                                setOpenCorte(null);
                              }}
                              className={`px-4 py-2.5 cursor-pointer text-sm hover:bg-slate-700 ${
                                item.producto_id === p.id ? 'text-cyan-400 font-semibold' : 'text-white'
                              }`}
                            >
                              {p.nombre}
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>

                  {/* Proveedor */}
                  <div>
                    <label className={labelClass}>Proveedor (Frigorifico) *</label>
                    <select
                      value={item.proveedor_id || ''}
                      onChange={(e) => updateItem(item.id, 'proveedor_id', Number(e.target.value))}
                      disabled={!item.producto_id}
                      className={`${inputClass} disabled:opacity-40 ${idx === firstIncompleteIdx && item.producto_id > 0 && !item.proveedor_id ? glowClass : ''}`}
                      required
                    >
                      <option value="">— Seleccionar proveedor —</option>
                      {proveedores.map((pv) => {
                        const stockProv = getEffectiveStock(item.producto_id, pv.proveedor_id, item.id);
                        const sinStock = stockProv !== null && stockProv === 0;
                        return (
                          <option key={pv.proveedor_id} value={pv.proveedor_id} disabled={sinStock}>
                            {pv.proveedor_nombre}{stockProv !== null ? ` (${stockProv} cajas)` : ''}{sinStock ? ' — SIN STOCK' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {/* Badge de stock */}
                    {item.proveedor_id > 0 && (() => {
                      const stock = getEffectiveStock(item.producto_id, item.proveedor_id, item.id);
                      if (stock === null) return null;
                      const color = stock === 0 ? 'text-red-400 bg-red-900/30 border-red-800'
                        : stock <= 3 ? 'text-amber-400 bg-amber-900/30 border-amber-800'
                        : 'text-emerald-400 bg-emerald-900/30 border-emerald-800';
                      return (
                        <div className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${color}`}>
                          {stock === 0 ? '⛔' : stock <= 3 ? '⚠️' : '✅'}
                          {stock === 0 ? 'Sin stock disponible' : `${stock} caja${stock !== 1 ? 's' : ''} disponible${stock !== 1 ? 's' : ''}`}
                        </div>
                      );
                    })()}
                    {item.producto_id === 0 && (
                      <p className="text-slate-500 text-xs mt-1.5">↑ Selecciona primero el corte</p>
                    )}
                  </div>

                  {/* Local de entrega del cliente */}
                  <div>
                    <label className={labelClass}>
                      Local de Entrega *
                      {localesCliente.length === 0 && clienteId && (
                        <span className="text-amber-400 font-normal ml-2 text-xs">
                          — sin locales registrados para este cliente
                        </span>
                      )}
                    </label>
                    <select
                      value={item.local_cliente_id ?? ''}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it) =>
                            it.id === item.id
                              ? { ...it, local_cliente_id: Number(e.target.value) || null }
                              : it
                          )
                        )
                      }
                      disabled={!item.proveedor_id || !clienteId || localesCliente.length === 0}
                      className={`${inputClass} disabled:opacity-40 ${idx === firstIncompleteIdx && item.proveedor_id > 0 && item.local_cliente_id === null ? glowClass : ''}`}
                      required
                    >
                      <option value="">— Seleccionar local de entrega —</option>
                      {localesCliente.map((lc) => (
                        <option key={lc.id} value={lc.id}>
                          {lc.nombre} · {lc.direccion}
                        </option>
                      ))}
                    </select>
                    {!item.proveedor_id && item.producto_id > 0 && (
                      <p className="text-slate-500 text-xs mt-1.5">↑ Selecciona primero el proveedor</p>
                    )}
                  </div>

                  {/* Precio referencia */}
                  {item.precio_kg > 0 && (() => {
                    const prod = productos.find((p) => p.id === item.producto_id);
                    const incluyeIva = prod?.precio_incluye_iva !== false;
                    const dcto = prod?.descuento_contado ?? 0;
                    const medioSeleccionado = mediosPago.find((m) => m.id === medioPagoId);
                    const esContado = medioSeleccionado?.es_contado === true;
                    const precioContado = dcto > 0 ? Math.round(item.precio_kg * (1 - dcto / 100)) : null;
                    return (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <span>Precio ref:</span>
                          <span className={`font-semibold ${
                            esContado && precioContado !== null ? 'text-slate-500 line-through text-xs' : 'text-cyan-300'
                          }`}>
                            ${item.precio_kg.toLocaleString('es-CL')}/kg
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            incluyeIva
                              ? 'text-emerald-300 bg-emerald-900/30 border-emerald-700'
                              : 'text-amber-300 bg-amber-900/30 border-amber-700'
                          }`}>
                            {incluyeIva ? 'IVA incluido' : 'Precio neto + IVA'}
                          </span>
                        </div>
                        {precioContado !== null && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-400">Precio contado:</span>
                            <span className={`font-bold ${
                              esContado ? 'text-emerald-300' : 'text-slate-500'
                            }`}>
                              ${precioContado.toLocaleString('es-CL')}/kg
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                              esContado
                                ? 'text-emerald-300 bg-emerald-900/30 border-emerald-700'
                                : 'text-slate-500 bg-slate-800 border-slate-700'
                            }`}>
                              {dcto}% dcto
                            </span>
                            {!esContado && (
                              <span className="text-slate-600 text-xs italic">solo si pago al contado</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Precio acordado (solo si hay precio mínimo configurado) */}
                  {item.precio_kg > 0 && item.precio_minimo_kg !== null && (
                    <div>
                      <label className={labelClass}>
                        Precio Acordado{' '}
                        <span className="text-slate-500 font-normal">(opcional)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-sm">$</span>
                        <input
                          type="number"
                          min={item.precio_minimo_kg}
                          max={item.precio_kg}
                          step={1}
                          value={item.precio_acordado_kg ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Number(e.target.value);
                            setItems((prev) =>
                              prev.map((it) =>
                                it.id === item.id ? { ...it, precio_acordado_kg: val } : it
                              )
                            );
                          }}
                          placeholder={`${item.precio_kg.toLocaleString('es-CL')} (base)`}
                          className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                        />
                        <span className="text-slate-400 text-sm">/kg</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Rango permitido: <span className="text-amber-400 font-semibold">${item.precio_minimo_kg.toLocaleString('es-CL')}</span>
                        {' '}–{' '}
                        <span className="text-cyan-400 font-semibold">${item.precio_kg.toLocaleString('es-CL')}</span> /kg
                      </p>
                      {/* Validación en tiempo real */}
                      {item.precio_acordado_kg !== null && (
                        item.precio_acordado_kg < item.precio_minimo_kg ? (
                          <p className="text-red-400 text-xs mt-1">⚠️ Por debajo del precio mínimo permitido</p>
                        ) : item.precio_acordado_kg > item.precio_kg ? (
                          <p className="text-amber-400 text-xs mt-1">ℹ️ No puede superar el precio base</p>
                        ) : (
                          <p className="text-emerald-400 text-xs mt-1">
                            ✓ Descuento de ${(item.precio_kg - item.precio_acordado_kg).toLocaleString('es-CL')}/kg aplicado
                          </p>
                        )
                      )}
                    </div>
                  )}

                  {/* Cantidad con +/- — ancho completo */}
                  <div>
                    {!item.local_cliente_id && item.proveedor_id > 0 && (
                      <p className="text-slate-500 text-xs mb-2">↑ Selecciona primero el local de entrega</p>
                    )}
                    <div className={!item.local_cliente_id ? 'opacity-40 pointer-events-none select-none' : ''}>
                    <label className={labelClass}>
                      Cantidad de Cajas *
                      {(() => {
                        const stock = getEffectiveStock(item.producto_id, item.proveedor_id, item.id);
                        if (stock === null || !item.proveedor_id) return null;
                        return (
                          <span className="text-slate-500 font-normal ml-2 text-xs">
                            máx. {stock}
                          </span>
                        );
                      })()}
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => stepCantidad(item.id, -1)}
                        className="w-14 h-14 flex-shrink-0 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 border border-slate-600 rounded-xl text-white text-2xl font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={getEffectiveStock(item.producto_id, item.proveedor_id, item.id) ?? undefined}
                        step={1}
                        value={item.cantidad}
                        onChange={(e) => updateItem(item.id, 'cantidad', Number(e.target.value))}
                        className="flex-1 min-w-0 bg-slate-700 border border-slate-600 text-white rounded-xl py-3 text-2xl text-center font-bold focus:outline-none focus:border-cyan-400"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => stepCantidad(item.id, 1)}
                        disabled={(() => {
                          const stock = getEffectiveStock(item.producto_id, item.proveedor_id, item.id);
                          return stock !== null && item.cantidad >= stock;
                        })()}
                        className="w-14 h-14 flex-shrink-0 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 disabled:opacity-40 border border-slate-600 rounded-xl text-white text-2xl font-bold"
                      >
                        +
                      </button>
                    </div>
                    {/* Alerta si excede stock */}
                    {(() => {
                      const stock = getEffectiveStock(item.producto_id, item.proveedor_id, item.id);
                      if (stock !== null && item.cantidad > stock) {
                        return (
                          <p className="text-red-400 text-xs mt-1">
                            ⚠️ No hay suficiente stock. Máximo disponible: {stock}
                          </p>
                        );
                      }
                      return null;
                    })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botón agregar corte */}
          <button
            type="button"
            onClick={addItem}
            className="mt-3 w-full border-2 border-dashed border-slate-600 hover:border-cyan-600 text-slate-400 hover:text-cyan-400 rounded-xl py-4 text-sm font-medium transition-colors"
          >
            + Agregar otro corte
          </button>
          </>
          )}
        </div>
      </form>

      {/* Barra sticky de resumen y submit */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 px-4 py-4 z-50">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm">
              {items.length} corte{items.length !== 1 ? 's' : ''} · {totalCajas} caja{totalCajas !== 1 ? 's' : ''}
            </div>
            {!puedeGuardar ? (
              <div className="text-amber-400 text-xs truncate">
                ⚠️ {(() => {
                  if (!clienteId) return 'Selecciona un cliente';
                  for (let i = 0; i < items.length; i++) {
                    const it = items[i];
                    const n = items.length > 1 ? ` (corte ${i + 1})` : '';
                    if (!it.producto_id) return `Elige el corte${n}`;
                    if (!it.proveedor_id) return `Elige el proveedor${n}`;
                    if (it.local_cliente_id === null) return `Elige local de entrega${n}`;
                  }
                  return 'Completa todos los campos';
                })()}
              </div>
            ) : (
              <div className="text-slate-500 text-xs">Precio final al confirmar picking</div>
            )}
          </div>
          <Link
            href="/admin/pedidos/cajas"
            className="px-4 py-3 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium flex-shrink-0"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            form=""
            disabled={!puedeGuardar || guardando}
            onClick={handleSubmit as any}
            className="bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors flex-shrink-0"
          >
            {guardando ? 'Creando...' : 'Crear Pre-Venta'}
          </button>
        </div>
      </div>
    </div>
  );
}
