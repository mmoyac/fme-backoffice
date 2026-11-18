'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  obtenerProveedores,
  listarPasarelas,
  crearPasarela,
  editarPasarela,
  reemplazarCredenciales,
  probarPasarela,
  activarPasarela,
  desactivarPasarela,
  eliminarPasarela,
  listarPagosOnline,
  type Ambiente,
  type PasarelaPago,
  type PagoOnline,
  type ProveedorPago,
} from '@/lib/api/pasarelas';
import DataList, { type Columna } from '@/components/ui/DataList';
import {
  CreditCardIcon,
  PlusIcon,
  PencilIcon,
  KeyIcon,
  TrashIcon,
  ArrowPathIcon,
  SignalIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const ESTADOS_PAGO = ['INICIADO', 'CONFIRMADO', 'RECHAZADO', 'EXPIRADO', 'EN_REVISION'] as const;

const ETIQUETA_ESTADO: Record<string, string> = {
  INICIADO: 'Iniciado',
  CONFIRMADO: 'Confirmado',
  RECHAZADO: 'Rechazado',
  EXPIRADO: 'Expirado',
  EN_REVISION: 'En revisión',
};

const COLOR_ESTADO: Record<string, string> = {
  INICIADO: 'bg-slate-600/40 text-slate-200 border-slate-500/40',
  CONFIRMADO: 'bg-green-900/30 text-green-300 border-green-600/40',
  RECHAZADO: 'bg-red-900/30 text-red-300 border-red-600/40',
  EXPIRADO: 'bg-slate-700/60 text-slate-400 border-slate-600/40',
  EN_REVISION: 'bg-orange-900/40 text-orange-300 border-orange-500/60',
};

const inputCls = 'w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white';
const labelCls = 'block text-sm font-medium text-slate-300 mb-1';

function formatoFecha(valor?: string | null): string {
  if (!valor) return '—';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return valor;
  return d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

function formatoMonto(monto: number | null | undefined): string {
  if (monto == null) return '—';
  return `$${monto.toLocaleString('es-CL')}`;
}

function BadgeAmbiente({ ambiente }: { ambiente: Ambiente }) {
  return ambiente === 'PRODUCCION' ? (
    <span className="inline-block text-xs px-2 py-0.5 rounded-full border bg-green-900/30 text-green-300 border-green-600/40">
      Producción
    </span>
  ) : (
    <span className="inline-block text-xs px-2 py-0.5 rounded-full border bg-amber-900/30 text-amber-300 border-amber-600/40">
      Integración (pruebas)
    </span>
  );
}

function BadgeEstadoPago({ estado }: { estado: string }) {
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${COLOR_ESTADO[estado] ?? COLOR_ESTADO.INICIADO}`}>
      {estado === 'EN_REVISION' ? '⚠️ ' : ''}{ETIQUETA_ESTADO[estado] ?? estado}
    </span>
  );
}

type Panel = { id: number; tipo: 'editar' | 'credenciales' } | null;

export default function PasarelasPagoPage() {
  const [proveedores, setProveedores] = useState<ProveedorPago[]>([]);
  const [entorno, setEntorno] = useState<'desarrollo' | 'produccion'>('desarrollo');
  const [pasarelas, setPasarelas] = useState<PasarelaPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [mensaje, setMensaje] = useState<string>('');
  const [ocupado, setOcupado] = useState<number | null>(null);

  // Panel abierto en una tarjeta (editar / credenciales)
  const [panel, setPanel] = useState<Panel>(null);
  const [formEditar, setFormEditar] = useState<{ nombre_visible: string; orden: number; ambiente: Ambiente }>({
    nombre_visible: '',
    orden: 0,
    ambiente: 'INTEGRACION',
  });
  const [formCredenciales, setFormCredenciales] = useState<Record<string, string>>({});

  // Nueva pasarela
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [nueva, setNueva] = useState<{ proveedor: string; nombre_visible: string; ambiente: Ambiente; orden: number }>({
    proveedor: '',
    nombre_visible: '',
    ambiente: 'INTEGRACION',
    orden: 0,
  });

  // Pagos recientes
  const [pagos, setPagos] = useState<PagoOnline[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [cargandoPagos, setCargandoPagos] = useState(false);

  const proveedorDe = (codigo: string) => proveedores.find((p) => p.codigo === codigo);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const [prov, lista] = await Promise.all([obtenerProveedores(), listarPasarelas()]);
      setProveedores(prov.proveedores);
      setEntorno(prov.entorno);
      setPasarelas(lista);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarPagos = useCallback(async (estado: string) => {
    try {
      setCargandoPagos(true);
      setPagos(await listarPagosOnline(estado || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error obteniendo pagos en línea');
    } finally {
      setCargandoPagos(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    cargarPagos(filtroEstado);
  }, [cargarPagos, filtroEstado]);

  const reemplazarEnLista = (item: PasarelaPago) => {
    setPasarelas((prev) => prev.map((p) => (p.id === item.id ? item : p)));
  };

  const ejecutar = async (id: number, fn: () => Promise<void>) => {
    setOcupado(id);
    setError('');
    setMensaje('');
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setOcupado(null);
    }
  };

  // ---------- Acciones ----------

  const abrirEditar = (p: PasarelaPago) => {
    setFormEditar({ nombre_visible: p.nombre_visible, orden: p.orden, ambiente: p.ambiente });
    setPanel({ id: p.id, tipo: 'editar' });
  };

  const abrirCredenciales = (p: PasarelaPago) => {
    setFormCredenciales({});
    setPanel({ id: p.id, tipo: 'credenciales' });
  };

  const guardarEdicion = (p: PasarelaPago) =>
    ejecutar(p.id, async () => {
      const cambios: { nombre_visible?: string; orden?: number; ambiente?: Ambiente } = {};
      if (formEditar.nombre_visible !== p.nombre_visible) cambios.nombre_visible = formEditar.nombre_visible.trim();
      if (formEditar.orden !== p.orden) cambios.orden = formEditar.orden;
      if (formEditar.ambiente !== p.ambiente) cambios.ambiente = formEditar.ambiente;
      if (Object.keys(cambios).length === 0) {
        setPanel(null);
        return;
      }
      const item = await editarPasarela(p.id, cambios);
      reemplazarEnLista(item);
      setPanel(null);
      setMensaje(
        cambios.ambiente && p.activo
          ? `✅ Pasarela actualizada. Al cambiar el ambiente quedó desactivada.`
          : '✅ Pasarela actualizada.'
      );
    });

  const guardarCredenciales = (p: PasarelaPago) =>
    ejecutar(p.id, async () => {
      const item = await reemplazarCredenciales(p.id, formCredenciales);
      reemplazarEnLista(item);
      setFormCredenciales({});
      setPanel(null);
      setMensaje('✅ Credenciales guardadas. Pruebe la conexión antes de activar.');
    });

  const probar = (p: PasarelaPago) =>
    ejecutar(p.id, async () => {
      const item = await probarPasarela(p.id);
      reemplazarEnLista(item);
      if (item.ultima_prueba_ok) setMensaje(`✅ Conexión exitosa con ${item.nombre_visible}.`);
      else setError(`Prueba fallida: ${item.ultima_prueba_mensaje || 'sin detalle'}`);
    });

  const alternarActivo = (p: PasarelaPago) =>
    ejecutar(p.id, async () => {
      const item = p.activo ? await desactivarPasarela(p.id) : await activarPasarela(p.id);
      reemplazarEnLista(item);
      setMensaje(item.activo ? `✅ ${item.nombre_visible} activada.` : `${item.nombre_visible} desactivada.`);
    });

  const eliminar = (p: PasarelaPago) => {
    if (!window.confirm(`¿Eliminar la pasarela "${p.nombre_visible}"? Esta acción no se puede deshacer.`)) return;
    ejecutar(p.id, async () => {
      await eliminarPasarela(p.id);
      setPasarelas((prev) => prev.filter((x) => x.id !== p.id));
      if (panel?.id === p.id) setPanel(null);
      setMensaje('Pasarela eliminada.');
    });
  };

  const seleccionarProveedorNuevo = (codigo: string) => {
    const prov = proveedorDe(codigo);
    setNueva((prev) => ({
      ...prev,
      proveedor: codigo,
      // Nombre visible por defecto = nombre del proveedor (si el usuario no lo personalizó)
      nombre_visible:
        !prev.nombre_visible || prev.nombre_visible === proveedorDe(prev.proveedor)?.nombre
          ? prov?.nombre ?? ''
          : prev.nombre_visible,
      ambiente: codigo === 'SIMULADA' ? 'INTEGRACION' : prev.ambiente,
    }));
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nueva.proveedor) {
      setError('Seleccione un proveedor');
      return;
    }
    await ejecutar(-1, async () => {
      const item = await crearPasarela({ ...nueva, nombre_visible: nueva.nombre_visible.trim() });
      setPasarelas((prev) => [...prev, item].sort((a, b) => a.orden - b.orden || a.id - b.id));
      setNueva({ proveedor: '', nombre_visible: '', ambiente: 'INTEGRACION', orden: 0 });
      setMostrarNueva(false);
      const prov = proveedorDe(item.proveedor);
      setMensaje(
        prov && prov.campos.length > 0
          ? '✅ Pasarela creada. Ahora cargue sus credenciales.'
          : '✅ Pasarela creada.'
      );
      if (prov && prov.campos.length > 0) abrirCredenciales(item);
    });
  };

  // ---------- Render ----------

  const columnasPagos: Columna<PagoOnline>[] = [
    {
      header: 'Pedido',
      className: 'w-[14%]',
      cell: (p) => <span className="font-medium text-white">#{p.numero_pedido ?? p.pedido_id}</span>,
    },
    { header: 'Pasarela', className: 'w-[16%]', cell: (p) => p.pasarela },
    { header: 'Monto', className: 'w-[12%] text-right', cell: (p) => formatoMonto(p.monto) },
    { header: 'Estado', className: 'w-[14%]', cell: (p) => <BadgeEstadoPago estado={p.estado} /> },
    {
      header: 'Iniciado / confirmado',
      className: 'w-[18%]',
      sinTruncar: true,
      cell: (p) => (
        <div className="text-xs">
          <div>{formatoFecha(p.iniciado_en)}</div>
          {p.confirmado_en && <div className="text-green-400">✓ {formatoFecha(p.confirmado_en)}</div>}
        </div>
      ),
    },
    {
      header: 'Detalle',
      className: 'w-[26%]',
      sinTruncar: true,
      cell: (p) => (
        <div className="text-xs break-words">
          {p.estado === 'EN_REVISION' && p.motivo_revision && (
            <div className="text-orange-300 font-medium mb-1">⚠️ {p.motivo_revision}</div>
          )}
          {p.medio && <div className="text-slate-300">Medio: {p.medio}</div>}
          {p.id_transaccion && <div className="text-slate-500 break-all">Tx: {p.id_transaccion}</div>}
        </div>
      ),
    },
  ];

  const enRevision = pagos.filter((p) => p.estado === 'EN_REVISION').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Pasarelas de pago</h1>
        <p className="text-slate-400">
          Configura los medios de pago en línea de la tienda (Mercado Pago, Flow, Khipu).
          {' '}Entorno del servidor:{' '}
          <span className={entorno === 'produccion' ? 'text-green-400 font-semibold' : 'text-amber-400 font-semibold'}>
            {entorno === 'produccion' ? 'producción' : 'desarrollo'}
          </span>
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-600/30 rounded-lg p-4 flex justify-between gap-3">
          <p className="text-red-400 break-words min-w-0">{error}</p>
          <button onClick={() => setError('')} className="text-red-300 hover:text-white shrink-0" aria-label="Cerrar">✕</button>
        </div>
      )}

      {mensaje && (
        <div className="mb-4 bg-green-900/20 border border-green-600/30 rounded-lg p-4 flex justify-between gap-3">
          <p className="text-green-400 break-words min-w-0">{mensaje}</p>
          <button onClick={() => setMensaje('')} className="text-green-300 hover:text-white shrink-0" aria-label="Cerrar">✕</button>
        </div>
      )}

      <div className="space-y-6">
        {/* Sección: Pasarelas configuradas */}
        <div className="bg-slate-800 rounded-lg p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <CreditCardIcon className="w-6 h-6 mr-2 text-teal-400" />
              Pasarelas configuradas
            </h2>
            <button
              type="button"
              onClick={() => setMostrarNueva((v) => !v)}
              className="flex items-center gap-1 bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Nueva pasarela
            </button>
          </div>

          {/* Formulario: nueva pasarela */}
          {mostrarNueva && (
            <form onSubmit={handleCrear} className="mb-6 p-4 bg-slate-700/60 rounded-lg border border-slate-600">
              <h3 className="text-lg font-semibold text-white mb-3">Nueva pasarela</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={labelCls}>Proveedor</label>
                  <select
                    value={nueva.proveedor}
                    onChange={(e) => seleccionarProveedorNuevo(e.target.value)}
                    className={inputCls}
                    required
                  >
                    <option value="">Seleccione…</option>
                    {proveedores.map((p) => (
                      <option key={p.codigo} value={p.codigo}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Nombre visible</label>
                  <input
                    type="text"
                    value={nueva.nombre_visible}
                    onChange={(e) => setNueva((prev) => ({ ...prev, nombre_visible: e.target.value }))}
                    className={inputCls}
                    minLength={2}
                    maxLength={60}
                    required
                    placeholder="Ej: Tarjeta de crédito / débito"
                  />
                </div>
                <div>
                  <label className={labelCls}>Ambiente</label>
                  <select
                    value={nueva.ambiente}
                    onChange={(e) => setNueva((prev) => ({ ...prev, ambiente: e.target.value as Ambiente }))}
                    className={inputCls}
                    disabled={nueva.proveedor === 'SIMULADA'}
                  >
                    <option value="INTEGRACION">Integración (pruebas)</option>
                    <option value="PRODUCCION">Producción</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Orden</label>
                  <input
                    type="number"
                    value={nueva.orden}
                    onChange={(e) => setNueva((prev) => ({ ...prev, orden: parseInt(e.target.value, 10) || 0 }))}
                    className={inputCls}
                  />
                </div>
              </div>
              {nueva.proveedor && proveedorDe(nueva.proveedor) && (
                <p className="text-xs text-slate-400 mt-2">
                  Monto mínimo: {proveedorDe(nueva.proveedor)!.monto_minimo == null
                    ? 'sin mínimo'
                    : formatoMonto(proveedorDe(nueva.proveedor)!.monto_minimo)}
                  {proveedorDe(nueva.proveedor)!.requiere_email && ' · Requiere email del cliente'}
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  disabled={ocupado === -1}
                  className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {ocupado === -1 ? 'Creando…' : 'Crear pasarela'}
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarNueva(false)}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {pasarelas.length === 0 ? (
            <div className="bg-slate-700/40 rounded-lg p-8 text-center text-gray-400">
              No hay pasarelas configuradas. Cree una con “Nueva pasarela”.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pasarelas.map((p) => {
                const prov = proveedorDe(p.proveedor);
                const busy = ocupado === p.id;
                const abierto = panel?.id === p.id ? panel.tipo : null;
                return (
                  <div key={p.id} className="bg-slate-700/50 rounded-lg border border-slate-600 p-4 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-white break-words">{p.nombre_visible}</h3>
                        <p className="text-sm text-slate-400">
                          {p.nombre_proveedor} · Orden {p.orden}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <BadgeAmbiente ambiente={p.ambiente} />
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded-full border ${
                            p.activo
                              ? 'bg-teal-900/30 text-teal-300 border-teal-600/40'
                              : 'bg-slate-700 text-slate-400 border-slate-600'
                          }`}
                        >
                          {p.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                    </div>

                    <dl className="text-sm space-y-1 mb-3">
                      <div className="flex gap-2">
                        <dt className="text-slate-400 shrink-0">Credenciales:</dt>
                        <dd className={p.credenciales_cargadas ? 'text-green-400' : 'text-amber-400'}>
                          {prov && prov.campos.length === 0
                            ? 'No requiere'
                            : p.credenciales_cargadas
                              ? `Cargadas ✓${p.credenciales_actualizadas_en ? ` (${formatoFecha(p.credenciales_actualizadas_en)})` : ''}`
                              : 'Sin cargar'}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-slate-400 shrink-0">Última prueba:</dt>
                        <dd className="min-w-0 break-words">
                          {!p.ultima_prueba_en ? (
                            <span className="text-slate-500">Nunca probada</span>
                          ) : (
                            <>
                              <span className={p.ultima_prueba_ok ? 'text-green-400' : 'text-red-400'}>
                                {p.ultima_prueba_ok ? '✓ OK' : '✗ Falló'}
                              </span>
                              <span className="text-slate-400"> · {formatoFecha(p.ultima_prueba_en)}</span>
                              {p.ultima_prueba_mensaje && (
                                <span className="block text-xs text-slate-400">{p.ultima_prueba_mensaje}</span>
                              )}
                            </>
                          )}
                        </dd>
                      </div>
                    </dl>

                    {/* Aviso de cobro */}
                    {p.activo && !p.puede_cobrar && (
                      <div className="mb-3 p-2 text-xs rounded bg-amber-900/20 border border-amber-600/30 text-amber-300">
                        ⚠️ Está activa pero <strong>no cobra</strong>: en el servidor de producción solo se ofrecen
                        a los clientes pasarelas en ambiente Producción. Las de Integración (pruebas) se ignoran.
                      </div>
                    )}
                    {p.activo && p.puede_cobrar && (
                      <div className="mb-3 p-2 text-xs rounded bg-green-900/20 border border-green-600/30 text-green-300">
                        {p.ambiente === 'PRODUCCION'
                          ? '💳 Ofrecida a los clientes en el checkout; cobra dinero real.'
                          : '🧪 Ofrecida en el checkout de este entorno con cobros de prueba (no es dinero real).'}
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => (abierto === 'editar' ? setPanel(null) : abrirEditar(p))}
                        disabled={busy}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-500 text-white rounded-lg disabled:opacity-50"
                      >
                        <PencilIcon className="w-4 h-4" /> Editar
                      </button>
                      {prov && prov.campos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => (abierto === 'credenciales' ? setPanel(null) : abrirCredenciales(p))}
                          disabled={busy}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-500 text-white rounded-lg disabled:opacity-50"
                        >
                          <KeyIcon className="w-4 h-4" /> Credenciales
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => probar(p)}
                        disabled={busy}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-700 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
                      >
                        <SignalIcon className="w-4 h-4" /> {busy ? 'Procesando…' : 'Probar conexión'}
                      </button>
                      <button
                        type="button"
                        onClick={() => alternarActivo(p)}
                        disabled={busy}
                        className={`px-3 py-1.5 text-sm rounded-lg text-white disabled:opacity-50 ${
                          p.activo ? 'bg-orange-700 hover:bg-orange-600' : 'bg-green-700 hover:bg-green-600'
                        }`}
                      >
                        {p.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminar(p)}
                        disabled={busy}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-800 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
                      >
                        <TrashIcon className="w-4 h-4" /> Eliminar
                      </button>
                    </div>

                    {/* Panel: editar */}
                    {abierto === 'editar' && (
                      <div className="mt-4 p-3 bg-slate-800 rounded-lg border border-slate-600 space-y-3">
                        <div>
                          <label className={labelCls}>Nombre visible</label>
                          <input
                            type="text"
                            value={formEditar.nombre_visible}
                            onChange={(e) => setFormEditar((prev) => ({ ...prev, nombre_visible: e.target.value }))}
                            className={inputCls}
                            minLength={2}
                            maxLength={60}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Orden</label>
                            <input
                              type="number"
                              value={formEditar.orden}
                              onChange={(e) => setFormEditar((prev) => ({ ...prev, orden: parseInt(e.target.value, 10) || 0 }))}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Ambiente</label>
                            <select
                              value={formEditar.ambiente}
                              onChange={(e) => setFormEditar((prev) => ({ ...prev, ambiente: e.target.value as Ambiente }))}
                              className={inputCls}
                              disabled={p.proveedor === 'SIMULADA'}
                            >
                              <option value="INTEGRACION">Integración (pruebas)</option>
                              <option value="PRODUCCION">Producción</option>
                            </select>
                          </div>
                        </div>
                        {formEditar.ambiente !== p.ambiente && (
                          <p className="text-xs text-amber-300">
                            ⚠️ Cambiar el ambiente desactiva la pasarela. Las credenciales de integración y producción
                            son distintas: deberá cargar las nuevas, probar la conexión y activarla de nuevo.
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => guardarEdicion(p)}
                            disabled={busy || formEditar.nombre_visible.trim().length < 2}
                            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setPanel(null)}
                            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Panel: credenciales (solo escritura) */}
                    {abierto === 'credenciales' && prov && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          guardarCredenciales(p);
                        }}
                        className="mt-4 p-3 bg-slate-800 rounded-lg border border-slate-600 space-y-3"
                        autoComplete="off"
                      >
                        <div>
                          <h4 className="text-sm font-semibold text-white">Reemplazar credenciales</h4>
                          <p className="text-xs text-slate-400">
                            Por seguridad las credenciales guardadas nunca se muestran. Ingrese todas para reemplazarlas
                            ({p.ambiente === 'PRODUCCION' ? 'credenciales reales de producción' : 'credenciales de prueba'}).
                          </p>
                        </div>
                        {prov.campos.map((c) => (
                          <div key={c.codigo}>
                            <label className={labelCls}>{c.etiqueta}</label>
                            <input
                              type={c.secreto ? 'password' : 'text'}
                              value={formCredenciales[c.codigo] ?? ''}
                              onChange={(e) => setFormCredenciales((prev) => ({ ...prev, [c.codigo]: e.target.value }))}
                              className={inputCls}
                              autoComplete={c.secreto ? 'new-password' : 'off'}
                              required
                            />
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={busy}
                            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                          >
                            Guardar credenciales
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormCredenciales({});
                              setPanel(null);
                            }}
                            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sección: Ayuda */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 md:p-6">
          <h2 className="text-lg font-bold text-blue-200 mb-3 flex items-center">
            <InformationCircleIcon className="w-6 h-6 mr-2" />
            Cómo pasar a producción
          </h2>
          <ol className="list-decimal list-inside text-sm text-blue-100 space-y-1 mb-4">
            <li>Cree una <strong>nueva pasarela</strong> del mismo proveedor con ambiente <strong>Producción</strong>.</li>
            <li>Cargue las <strong>credenciales reales</strong> (Credenciales → Reemplazar credenciales).</li>
            <li>Presione <strong>Probar conexión</strong> y verifique que el resultado sea ✓ OK.</li>
            <li><strong>Active</strong> la pasarela de producción (exige una prueba exitosa posterior al último cambio de credenciales).</li>
            <li><strong>Desactive</strong> la pasarela de Integración (pruebas).</li>
          </ol>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-800/60 rounded-lg p-3">
              <p className="font-semibold text-white mb-1">Mercado Pago</p>
              <p className="text-slate-300">
                mercadopago.cl/developers → Tus integraciones → Credenciales: copie el <strong>Access token</strong>.
                En Integración use las credenciales del <strong>usuario de prueba vendedor</strong>.
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3">
              <p className="font-semibold text-white mb-1">Flow</p>
              <p className="text-slate-300">
                <strong>API key</strong> y <strong>Secret key</strong> desde su cuenta. sandbox.flow.cl (Integración) y
                www.flow.cl (Producción) son <strong>cuentas distintas</strong>.
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3">
              <p className="font-semibold text-white mb-1">Khipu</p>
              <p className="text-slate-300">
                <strong>API key</strong> de la cuenta de cobro. Para Integración use una cuenta en
                <strong> modo desarrollador</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Sección: Pagos en línea recientes */}
        <div className="bg-slate-800 rounded-lg p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-white">
              Pagos en línea recientes
              {enRevision > 0 && (
                <span className="ml-2 text-sm font-medium text-orange-300">
                  ⚠️ {enRevision} en revisión
                </span>
              )}
            </h2>
            <div className="flex gap-2 items-center">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="p-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              >
                <option value="">Todos los estados</option>
                {ESTADOS_PAGO.map((e) => (
                  <option key={e} value={e}>{ETIQUETA_ESTADO[e]}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => cargarPagos(filtroEstado)}
                disabled={cargandoPagos}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white disabled:opacity-50"
                aria-label="Actualizar"
                title="Actualizar"
              >
                <ArrowPathIcon className={`w-5 h-5 ${cargandoPagos ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          {enRevision > 0 && (
            <p className="mb-3 text-xs text-orange-300">
              Los pagos “En revisión” requieren acción manual: verifique el cobro en el panel del proveedor y
              regularice el pedido.
            </p>
          )}
          <DataList
            items={pagos}
            columns={columnasPagos}
            getKey={(p) => p.id}
            loading={cargandoPagos}
            empty="No hay pagos en línea registrados."
            card={(p) => (
              <div className={`space-y-1 ${p.estado === 'EN_REVISION' ? 'border-l-4 border-orange-500 pl-3' : ''}`}>
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-white">Pedido #{p.numero_pedido ?? p.pedido_id}</span>
                  <span className="text-white">{formatoMonto(p.monto)}</span>
                </div>
                <div className="flex justify-between gap-2 items-center">
                  <span className="text-sm text-slate-400 truncate">{p.pasarela}</span>
                  <BadgeEstadoPago estado={p.estado} />
                </div>
                <div className="text-xs text-slate-400">
                  {formatoFecha(p.iniciado_en)}
                  {p.confirmado_en && <span className="text-green-400"> · ✓ {formatoFecha(p.confirmado_en)}</span>}
                </div>
                {p.estado === 'EN_REVISION' && p.motivo_revision && (
                  <div className="text-xs text-orange-300 font-medium">⚠️ {p.motivo_revision}</div>
                )}
                {p.medio && <div className="text-xs text-slate-300">Medio: {p.medio}</div>}
                {p.id_transaccion && <div className="text-xs text-slate-500 break-all">Tx: {p.id_transaccion}</div>}
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}
