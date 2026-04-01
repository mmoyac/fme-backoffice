'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { useTenant } from '@/lib/TenantContext';
import ProductoAutocomplete from '../components/ProductoAutocomplete';

async function geocodeAddress(address: string): Promise<[number, number]> {
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&country=cl&limit=1`
  );
  if (!res.ok) throw new Error('Error en geocodificación');
  const data = await res.json();
  if (!data.features?.length) throw new Error('Dirección no encontrada');
  return data.features[0].center;
}

async function calcularRuta(origen: [number, number], destino: [number, number]) {
  const res = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${origen[0]},${origen[1]};${destino[0]},${destino[1]}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&geometries=geojson`
  );
  if (!res.ok) throw new Error('Error calculando ruta');
  const data = await res.json();
  if (!data.routes?.length) throw new Error('No se encontró ruta');
  return {
    distanciaKm: data.routes[0].distance / 1000,
    tiempoMinutos: Math.round(data.routes[0].duration / 60),
  };
}

interface ItemCotizacion {
  producto_id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface Version {
  id: number;
  numero_version: number;
  items: ItemCotizacion[];
  monto_total: number;
  motivo_cambio?: string;
  es_version_aceptada: boolean;
  creado_por?: { id: number; nombre_completo?: string; email: string };
  created_at: string;
}

interface LogEntry {
  id: number;
  accion: string;
  detalle?: string;
  version_id?: number;
  usuario?: { id: number; nombre_completo?: string; email: string };
  created_at: string;
}

interface Cotizacion {
  id: number;
  numero_cotizacion: string;
  cliente: { id: number; nombre: string; email?: string; telefono?: string; direccion?: string };
  canal_venta?: { id: number; nombre: string };
  estado_cotizacion: { id: number; codigo: string; nombre: string; color: string };
  fecha_vencimiento?: string;
  notas?: string;
  version_activa?: Version;
  versiones: Version[];
  log: LogEntry[];
  created_at: string;
}

interface Producto { id: number; nombre: string; precio_venta?: number; }

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR:  'bg-gray-600 text-gray-200',
  ENVIADA:   'bg-blue-900 text-blue-200',
  ACEPTADA:  'bg-green-900 text-green-200',
  RECHAZADA: 'bg-red-900 text-red-200',
  VENCIDA:   'bg-orange-900 text-orange-200',
};

const ACCION_ICONS: Record<string, string> = {
  CREADA: '📄', VERSION_CREADA: '📝', ENVIADA: '📤',
  ACEPTADA: '✅', RECHAZADA: '❌', VENCIDA: '⏰',
};

export default function DetalleCotizacionPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);

  // Modal nueva versión
  const [modalVersion, setModalVersion] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);

  // Modal aceptar
  const [modalAceptar, setModalAceptar] = useState(false);
  const [tiposDocumento, setTiposDocumento] = useState<{id: number; nombre: string; codigo: string}[]>([]);
  const [tiposPedido, setTiposPedido] = useState<{id: number; nombre: string}[]>([]);
  const [locales, setLocales] = useState<{id: number; nombre: string; direccion?: string}[]>([]);
  const [mediosPago, setMediosPago] = useState<{id: number; nombre: string; permite_cheque: boolean; es_contado: boolean; plazo_dias: number}[]>([]);
  const [aceptarForm, setAceptarForm] = useState({
    tipo_documento_id: '',
    tipo_pedido_id: '1',
    local_despacho_id: '',
    notas: '',
    medio_pago_id: '',
  });
  const [itemsVersion, setItemsVersion] = useState<ItemCotizacion[]>([]);
  const [motivoVersion, setMotivoVersion] = useState('');
  const [errorVersion, setErrorVersion] = useState('');

  // Delivery
  const [requiereDelivery, setRequiereDelivery] = useState(false);
  const [costoDeliveryCalc, setCostoDeliveryCalc] = useState<{distanciaKm: number; tiempoMinutos: number; costoTotal: number} | null>(null);
  const [calculandoDelivery, setCalculandoDelivery] = useState(false);
  const [errorDelivery, setErrorDelivery] = useState('');
  const [noCobraDelivery, setNoCobraDelivery] = useState(false);

  const { config: tenantConfig } = useTenant();
  const costoFijoDelivery = (tenantConfig as any)?.delivery?.costo_fijo ?? 2000;
  const costoPorKmDelivery = (tenantConfig as any)?.delivery?.costo_por_km ?? 150;
  const montoMinimoGratis = (tenantConfig as any)?.delivery?.monto_minimo_gratis ?? null;
  const maxKmDelivery: number | null = (tenantConfig as any)?.delivery?.max_km ?? null;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user?.access_token}`,
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cotizaciones/${params.id}`, { headers });
      if (!res.ok) throw new Error('Cotización no encontrada');
      setCotizacion(await res.json());
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // Calcular costo de delivery cuando se activa o cambia el local
  useEffect(() => {
    if (!requiereDelivery || !cotizacion) {
      setCostoDeliveryCalc(null);
      setErrorDelivery('');
      return;
    }
    const montoTotal = cotizacion.version_activa?.monto_total ?? 0;
    const deliveryGratis = montoMinimoGratis !== null && montoTotal >= montoMinimoGratis;
    if (deliveryGratis) {
      setCostoDeliveryCalc({ distanciaKm: 0, tiempoMinutos: 0, costoTotal: 0 });
      return;
    }
    if (!aceptarForm.local_despacho_id) {
      setErrorDelivery('Selecciona un local de despacho para calcular el delivery');
      setCostoDeliveryCalc(null);
      return;
    }
    const localSeleccionado = locales.find(l => l.id === Number(aceptarForm.local_despacho_id));
    const direccionOrigen = localSeleccionado?.direccion;
    const direccionDestino = cotizacion.cliente.direccion;
    if (!direccionOrigen || !direccionDestino) {
      setErrorDelivery(!direccionOrigen ? 'El local no tiene dirección registrada' : 'El cliente no tiene dirección registrada');
      setCostoDeliveryCalc(null);
      return;
    }
    setCalculandoDelivery(true);
    setErrorDelivery('');
    setCostoDeliveryCalc(null);
    (async () => {
      try {
        const [coordsOrigen, coordsDestino] = await Promise.all([
          geocodeAddress(direccionOrigen),
          geocodeAddress(direccionDestino),
        ]);
        const { distanciaKm, tiempoMinutos } = await calcularRuta(coordsOrigen, coordsDestino);
        if (maxKmDelivery !== null && distanciaKm > maxKmDelivery) {
          setErrorDelivery(`La dirección está a ${Math.round(distanciaKm * 10) / 10} km, superando el límite de ${maxKmDelivery} km`);
          return;
        }
        const costoTotal = costoFijoDelivery + Math.round(distanciaKm * costoPorKmDelivery);
        setCostoDeliveryCalc({ distanciaKm: Math.round(distanciaKm * 100) / 100, tiempoMinutos, costoTotal });
      } catch (err) {
        setErrorDelivery(err instanceof Error ? err.message : 'Error calculando delivery');
      } finally {
        setCalculandoDelivery(false);
      }
    })();
  }, [requiereDelivery, aceptarForm.local_despacho_id, locales.length]);

  const abrirModalVersion = async () => {
    if (productos.length === 0) {
      const [resProd, resPrecios] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/productos/`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/precios/`, { headers }),
      ]);
      const todosProductos: Producto[] = await resProd.json();
      const precios: { producto_id: number }[] = await resPrecios.json();
      const idsConPrecio = new Set(precios.map(p => p.producto_id));
      setProductos(todosProductos.filter(p => idsConPrecio.has(p.id)));
    }
    // Copiar ítems de la versión activa
    const itemsCopia = (cotizacion?.version_activa?.items ?? []).map(i => ({ ...i }));
    setItemsVersion(itemsCopia);
    setMotivoVersion('');
    setErrorVersion('');
    setModalVersion(true);
  };

  const actualizarItemVersion = (idx: number, field: keyof ItemCotizacion, value: any) => {
    const nuevos = [...itemsVersion];
    nuevos[idx] = { ...nuevos[idx], [field]: value };
    if (field === 'cantidad' || field === 'precio_unitario') {
      nuevos[idx].subtotal = nuevos[idx].cantidad * nuevos[idx].precio_unitario;
    }
    setItemsVersion(nuevos);
  };

  const seleccionarProductoVersion = (idx: number, productoId: number, nombre: string, precioMax: number) => {
    const nuevos = [...itemsVersion];
    nuevos[idx] = {
      ...nuevos[idx],
      producto_id: productoId,
      nombre,
      precio_unitario: precioMax,
      subtotal: nuevos[idx].cantidad * precioMax,
    };
    setItemsVersion(nuevos);
  };

  const montoTotalVersion = itemsVersion.reduce((s, i) => s + i.subtotal, 0);

  const crearVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsVersion.length === 0 || itemsVersion.some(i => i.producto_id === 0)) {
      setErrorVersion('Todos los ítems deben tener producto'); return;
    }
    setProcesando(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cotizaciones/${params.id}/versiones`, {
        method: 'POST', headers,
        body: JSON.stringify({ items: itemsVersion, monto_total: montoTotalVersion, motivo_cambio: motivoVersion || null }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      setModalVersion(false);
      cargar();
    } catch (e: any) {
      setErrorVersion(e.message);
    } finally {
      setProcesando(false);
    }
  };

  const cambiarEstado = async (codigo: string) => {
    setProcesando(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cotizaciones/${params.id}/estado?nuevo_estado_codigo=${codigo}`,
        { method: 'PATCH', headers }
      );
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      cargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  };

  const abrirModalAceptar = async () => {
    setError('');
    try {
      const [tdRes, tpRes, locRes, mpRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/maestras/tipos-documento`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tipos-pedido/`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/locales/`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/maestras/medios-pago?activo=true`, { headers }),
      ]);
      if (tdRes.ok) setTiposDocumento(await tdRes.json());
      if (tpRes.ok) setTiposPedido(await tpRes.json());
      if (locRes.ok) setLocales(await locRes.json());
      if (mpRes.ok) setMediosPago(await mpRes.json());
    } catch {}
    setModalAceptar(true);
  };

  const confirmarAceptar = async () => {
    if (!aceptarForm.tipo_documento_id) { setError('Debes seleccionar un tipo de documento'); return; }
    setProcesando(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cotizaciones/${params.id}/aceptar`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tipo_documento_id: Number(aceptarForm.tipo_documento_id),
          tipo_pedido_id: Number(aceptarForm.tipo_pedido_id) || 1,
          local_despacho_id: aceptarForm.local_despacho_id ? Number(aceptarForm.local_despacho_id) : null,
          notas: aceptarForm.notas || null,
          medio_pago_id: aceptarForm.medio_pago_id ? Number(aceptarForm.medio_pago_id) : null,
          requiere_delivery: requiereDelivery,
          costo_delivery: requiereDelivery
            ? (noCobraDelivery ? 0 : (costoDeliveryCalc?.costoTotal ?? null))
            : null,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      setModalAceptar(false);
      setAceptarForm({ tipo_documento_id: '', tipo_pedido_id: '1', local_despacho_id: '', notas: '', medio_pago_id: '' });
      setRequiereDelivery(false);
      setCostoDeliveryCalc(null);
      setNoCobraDelivery(false);
      cargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  };

  const formatFecha = (f?: string) => f
    ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>;
  if (!cotizacion) return <div className="text-center py-12 text-red-400">{error}</div>;

  const estado = cotizacion.estado_cotizacion.codigo;
  const puedeVersionar = ['BORRADOR', 'ENVIADA'].includes(estado);
  const puedeAceptar = ['BORRADOR', 'ENVIADA'].includes(estado);
  const puedeEnviar = estado === 'BORRADOR';
  const puedeRechazar = ['BORRADOR', 'ENVIADA'].includes(estado);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">←</button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white font-mono">{cotizacion.numero_cotizacion}</h1>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ESTADO_COLORS[estado]}`}>
                {cotizacion.estado_cotizacion.nombre}
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-0.5">Creada el {formatFecha(cotizacion.created_at)}</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 flex-wrap">
          {puedeVersionar && (
            <button onClick={abrirModalVersion} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded text-sm">
              + Nueva versión
            </button>
          )}
          {puedeEnviar && (
            <button onClick={() => cambiarEstado('ENVIADA')} disabled={procesando}
              className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm disabled:opacity-50">
              Marcar como Enviada
            </button>
          )}
          {puedeRechazar && (
            <button onClick={() => cambiarEstado('RECHAZADA')} disabled={procesando}
              className="bg-red-800 hover:bg-red-700 text-white px-3 py-2 rounded text-sm disabled:opacity-50">
              Rechazar
            </button>
          )}
          {puedeAceptar && estado === 'ENVIADA' && (
            <button onClick={abrirModalAceptar} disabled={procesando}
              className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50">
              ✓ Aceptar cotización
            </button>
          )}
          {puedeAceptar && estado === 'BORRADOR' && (
            <button onClick={abrirModalAceptar} disabled={procesando}
              title="Saltarse el paso de envío y aceptar directamente"
              className="bg-amber-700 hover:bg-amber-600 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50">
              ⚠️ Aceptar sin enviar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded text-sm">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Columna izquierda — cliente + versión activa */}
        <div className="col-span-2 space-y-6">
          {/* Cliente */}
          <div className="bg-slate-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Cliente</h2>
            <p className="text-white font-semibold">{cotizacion.cliente.nombre}</p>
            {cotizacion.cliente.email && <p className="text-gray-400 text-sm">{cotizacion.cliente.email}</p>}
            {cotizacion.cliente.telefono && <p className="text-gray-400 text-sm">{cotizacion.cliente.telefono}</p>}
            {cotizacion.canal_venta && (
              <p className="text-xs text-gray-500 mt-2">Canal: <span className="text-gray-300">{cotizacion.canal_venta.nombre}</span></p>
            )}
            {cotizacion.fecha_vencimiento && (
              <p className="text-xs text-gray-500 mt-1">Vence: <span className="text-gray-300">{cotizacion.fecha_vencimiento}</span></p>
            )}
            {cotizacion.notas && (
              <p className="text-xs text-gray-500 mt-2 italic">"{cotizacion.notas}"</p>
            )}
          </div>

          {/* Versión activa */}
          {cotizacion.version_activa && (
            <div className="bg-slate-800 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase">
                  Versión activa — v{cotizacion.version_activa.numero_version}
                  {cotizacion.version_activa.es_version_aceptada && (
                    <span className="ml-2 text-green-400 text-xs">✓ Aceptada</span>
                  )}
                </h2>
                <span className="text-sm text-gray-500">{formatFecha(cotizacion.version_activa.created_at)}</span>
              </div>
              <table className="min-w-full">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase">
                    <th className="text-left py-1">Producto</th>
                    <th className="text-right py-1">Cant.</th>
                    <th className="text-right py-1">P. Unit.</th>
                    <th className="text-right py-1">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {cotizacion.version_activa.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2 text-sm text-white">{item.nombre}</td>
                      <td className="py-2 text-sm text-gray-300 text-right">{item.cantidad}</td>
                      <td className="py-2 text-sm text-gray-300 text-right">${item.precio_unitario.toLocaleString('es-CL')}</td>
                      <td className="py-2 text-sm font-semibold text-white text-right">${item.subtotal.toLocaleString('es-CL')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-600">
                    <td colSpan={3} className="pt-2 text-right text-gray-400 text-sm font-medium">Total</td>
                    <td className="pt-2 text-right text-white font-bold text-lg">
                      ${cotizacion.version_activa.monto_total.toLocaleString('es-CL')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Historial de versiones */}
          {cotizacion.versiones.length > 1 && (
            <div className="bg-slate-800 rounded-lg p-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Historial de versiones</h2>
              <div className="space-y-3">
                {[...cotizacion.versiones].reverse().map(v => (
                  <div key={v.id} className={`border rounded-lg p-3 ${v.es_version_aceptada ? 'border-green-700 bg-green-900/10' : 'border-slate-700'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">
                        v{v.numero_version}
                        {v.es_version_aceptada && <span className="ml-2 text-green-400 text-xs">✓ Aceptada</span>}
                        {cotizacion.version_activa?.id === v.id && !v.es_version_aceptada && (
                          <span className="ml-2 text-blue-400 text-xs">● Activa</span>
                        )}
                      </span>
                      <span className="text-xs text-gray-500">{formatFecha(v.created_at)}</span>
                    </div>
                    {v.motivo_cambio && <p className="text-xs text-gray-400 italic mb-2">"{v.motivo_cambio}"</p>}
                    <p className="text-sm text-gray-300">{v.items.length} ítem(s) — <span className="font-semibold text-white">${v.monto_total.toLocaleString('es-CL')}</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha — log */}
        <div className="col-span-1">
          <div className="bg-slate-800 rounded-lg p-5 sticky top-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Historial de actividad</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {[...cotizacion.log].reverse().map(entry => (
                <div key={entry.id} className="flex gap-3">
                  <span className="text-lg flex-shrink-0">{ACCION_ICONS[entry.accion] ?? '•'}</span>
                  <div>
                    <p className="text-xs font-semibold text-white">{entry.accion.replace('_', ' ')}</p>
                    {entry.detalle && <p className="text-xs text-gray-400 mt-0.5">{entry.detalle}</p>}
                    <p className="text-xs text-gray-600 mt-0.5">
                      {entry.usuario?.nombre_completo ?? entry.usuario?.email ?? 'Sistema'} · {formatFecha(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal nueva versión */}
      {modalVersion && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full shadow-xl border border-slate-700 my-8">
            <h2 className="text-xl font-bold text-white mb-4">Nueva Versión</h2>
            {errorVersion && (
              <div className="bg-red-900/50 border border-red-500 text-red-100 px-3 py-2 rounded mb-4 text-sm">{errorVersion}</div>
            )}
            <form onSubmit={crearVersion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Motivo del cambio</label>
                <input
                  type="text"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  placeholder="Ej: Cliente solicitó modificar cantidades"
                  value={motivoVersion}
                  onChange={e => setMotivoVersion(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">Ítems</label>
                  <button type="button" onClick={() => setItemsVersion([...itemsVersion, { producto_id: 0, nombre: '', cantidad: 1, precio_unitario: 0, subtotal: 0 }])}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded">
                    + Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {itemsVersion.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <ProductoAutocomplete
                          productos={productos}
                          value={item.producto_id}
                          accessToken={user?.access_token ?? undefined}
                          onSelect={(id, nombre, precio) => seleccionarProductoVersion(idx, id, nombre, precio)}
                        />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min={0.001} step="any" className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-sm"
                          value={item.cantidad} onChange={e => actualizarItemVersion(idx, 'cantidad', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min={0} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-sm"
                          value={item.precio_unitario} onChange={e => actualizarItemVersion(idx, 'precio_unitario', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="col-span-3 text-right text-white text-sm font-semibold">
                        ${item.subtotal.toLocaleString('es-CL')}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button type="button" onClick={() => setItemsVersion(itemsVersion.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-300">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-right mt-2 text-white font-bold">
                  Total: ${montoTotalVersion.toLocaleString('es-CL')}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setModalVersion(false)} className="px-4 py-2 rounded text-gray-300 hover:bg-slate-700">
                  Cancelar
                </button>
                <button type="submit" disabled={procesando} className="px-4 py-2 rounded bg-primary hover:bg-primary-dark text-slate-900 font-semibold disabled:opacity-50">
                  {procesando ? 'Guardando...' : 'Crear versión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Aceptar cotización */}
      {modalAceptar && cotizacion.version_activa && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg space-y-5">
            <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
              Aceptar cotización y generar pedido
            </h3>

            {/* Aviso si se salta el paso de envío */}
            {estado === 'BORRADOR' && (
              <div className="bg-amber-900/50 border border-amber-500 text-amber-200 px-3 py-2 rounded text-sm">
                ⚠️ Esta cotización no fue enviada al cliente. Se generará el pedido saltándose ese paso.
              </div>
            )}

            {/* Resumen */}
            <div className="bg-slate-700 rounded p-3 space-y-1 text-sm">
              <p className="text-gray-300 font-medium">Resumen de la versión activa</p>
              {cotizacion.version_activa.items.map((item, i) => (
                <div key={i} className="flex justify-between text-gray-400">
                  <span>{item.nombre} × {item.cantidad}</span>
                  <span>${(item.subtotal).toLocaleString('es-CL')}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-white border-t border-slate-600 pt-1 mt-1">
                <span>Total</span>
                <span>${cotizacion.version_activa.monto_total.toLocaleString('es-CL')}</span>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {/* Formulario */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Tipo de documento *</label>
                <select
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  value={aceptarForm.tipo_documento_id}
                  onChange={e => setAceptarForm(f => ({ ...f, tipo_documento_id: e.target.value }))}
                >
                  <option value="">Seleccionar...</option>
                  {tiposDocumento.filter(t => ['FAC','BOL'].includes(t.codigo)).map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Tipo de pedido</label>
                <select
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  value={aceptarForm.tipo_pedido_id}
                  onChange={e => setAceptarForm(f => ({ ...f, tipo_pedido_id: e.target.value }))}
                >
                  {tiposPedido.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Local de despacho</label>
                <select
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  value={aceptarForm.local_despacho_id}
                  onChange={e => setAceptarForm(f => ({ ...f, local_despacho_id: e.target.value }))}
                >
                  <option value="">Local de fabricación (por defecto)</option>
                  {locales.filter(l => (l as any).activo !== false).map(l => (
                    <option key={l.id} value={l.id}>{l.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Delivery */}
              <div className="border border-slate-600 rounded p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>🚚</span>
                    <div>
                      <p className="text-sm text-white font-medium">Requiere Delivery</p>
                      <p className="text-xs text-gray-400">
                        {cotizacion.cliente.direccion || 'Selecciona un cliente con dirección para activar'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!cotizacion.cliente.direccion}
                    onClick={() => { setRequiereDelivery(v => !v); setNoCobraDelivery(false); }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${requiereDelivery ? 'bg-blue-600' : 'bg-slate-600'} ${!cotizacion.cliente.direccion ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requiereDelivery ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {requiereDelivery && (
                  <>
                    {calculandoDelivery && <p className="text-xs text-gray-400">Calculando distancia...</p>}
                    {errorDelivery && <p className="text-xs text-red-400">{errorDelivery}</p>}
                    {costoDeliveryCalc && !calculandoDelivery && (
                      <div className="bg-slate-600/50 rounded p-2 text-xs text-gray-300 space-y-1">
                        {costoDeliveryCalc.distanciaKm > 0 && (
                          <p>{costoDeliveryCalc.distanciaKm} km · {costoDeliveryCalc.tiempoMinutos} min estimados</p>
                        )}
                        <p className="text-white font-medium">
                          Costo delivery: ${costoDeliveryCalc.costoTotal.toLocaleString('es-CL')}
                          {costoDeliveryCalc.costoTotal === 0 && ' 🎉 ¡Delivery gratis!'}
                        </p>
                      </div>
                    )}
                    {costoDeliveryCalc && costoDeliveryCalc.costoTotal > 0 && (
                      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={noCobraDelivery}
                          onChange={e => setNoCobraDelivery(e.target.checked)}
                          className="rounded border-slate-500"
                        />
                        No cobrar delivery (enviar como $0)
                      </label>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Medio de pago</label>
                <select
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  value={aceptarForm.medio_pago_id}
                  onChange={e => setAceptarForm(f => ({ ...f, medio_pago_id: e.target.value }))}
                >
                  <option value="">Sin especificar</option>
                  {mediosPago.map(mp => (
                    <option key={mp.id} value={mp.id}>
                      {mp.nombre}{mp.plazo_dias > 0 ? ` (${mp.plazo_dias} días)` : mp.es_contado ? ' (contado)' : mp.permite_cheque ? ' (cheque)' : ''}
                    </option>
                  ))}
                </select>
                {aceptarForm.medio_pago_id && (() => {
                  const mp = mediosPago.find(m => m.id === Number(aceptarForm.medio_pago_id));
                  if (!mp) return null;
                  if (mp.es_contado || (!mp.permite_cheque && mp.plazo_dias === 0))
                    return <p className="text-xs text-green-400 mt-1">Pago al contado — el pedido quedará como pagado</p>;
                  if (mp.permite_cheque)
                    return <p className="text-xs text-yellow-400 mt-1">Cheque — deberás registrar los cheques en el pedido</p>;
                  if (mp.plazo_dias > 0)
                    return <p className="text-xs text-yellow-400 mt-1">Pago diferido a {mp.plazo_dias} días — se creará un cobro pendiente</p>;
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Notas al pedido</label>
                <textarea
                  rows={2}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                  placeholder="Instrucciones de entrega, observaciones..."
                  value={aceptarForm.notas}
                  onChange={e => setAceptarForm(f => ({ ...f, notas: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setModalAceptar(false); setError(''); setRequiereDelivery(false); setCostoDeliveryCalc(null); setNoCobraDelivery(false); }}
                className="px-4 py-2 rounded text-gray-300 hover:bg-slate-700"
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAceptar}
                disabled={!aceptarForm.tipo_documento_id || procesando}
                className="px-5 py-2 rounded bg-green-700 hover:bg-green-600 text-white font-semibold disabled:opacity-50"
              >
                {procesando ? 'Procesando...' : '✓ Confirmar y generar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
