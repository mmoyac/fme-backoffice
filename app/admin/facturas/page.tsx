'use client';

import { useState, useEffect, useCallback } from 'react';
import { listarFacturas, registrarFolio, descargarFactura, registrarPago, RegistrarPagoResponse } from '@/lib/api/facturas';
import { obtenerPedidoConCheques, crearCheque, actualizarCheque, eliminarCheque, type PedidoConCheques, type Cheque, type EstadoCheque } from '@/lib/api/cheques';
import type { Pedido } from '@/lib/api/pedidos';

const ESTADOS_SII = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente', color: 'bg-yellow-500' },
  { value: 'REGISTRADO', label: 'Registrado', color: 'bg-blue-500' },
  { value: 'ENVIADO', label: 'Enviado', color: 'bg-indigo-500' },
  { value: 'APROBADO', label: 'Aprobado', color: 'bg-green-500' },
  { value: 'RECHAZADO', label: 'Rechazado', color: 'bg-red-500' },
];

function EstadoSiiBadge({ estado }: { estado?: string }) {
  const e = ESTADOS_SII.find(s => s.value === estado);
  return (
    <span className={`${e?.color ?? 'bg-gray-500'} text-white px-2 py-0.5 rounded-full text-xs font-semibold`}>
      {e?.label ?? (estado || 'Sin estado')}
    </span>
  );
}

function formatFecha(fecha?: string) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatMonto(monto?: number) {
  if (monto === undefined || monto === null) return '—';
  return `$${Math.round(monto).toLocaleString('es-CL')}`;
}

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroEstadoSii, setFiltroEstadoSii] = useState('');
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Modal registrar folio
  const [modalFolio, setModalFolio] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<Pedido | null>(null);
  const [folioInput, setFolioInput] = useState('');
  const [numeroDteInput, setNumeroDteInput] = useState('');
  const [obsInput, setObsInput] = useState('');
  const [guardandoFolio, setGuardandoFolio] = useState(false);
  const [errorFolio, setErrorFolio] = useState('');

  // Descargar PDF
  const [descargandoId, setDescargandoId] = useState<number | null>(null);

  // Filtros extra
  const [soloPorCobrar, setSoloPorCobrar] = useState(false);

  // Modal registrar pago
  const [modalPago, setModalPago] = useState(false);
  const [facturaPago, setFacturaPago] = useState<Pedido | null>(null);
  const [medioPagoSeleccionado, setMedioPagoSeleccionado] = useState<number>(0);
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [errorPago, setErrorPago] = useState('');

  // Modal gestionar cheques
  const [modalCheques, setModalCheques] = useState(false);
  const [facturaCheques, setFacturaCheques] = useState<Pedido | null>(null);
  const [pedidoConCheques, setPedidoConCheques] = useState<PedidoConCheques | null>(null);
  const [cargandoCheques, setCargandoCheques] = useState(false);
  const [estadosCheque, setEstadosCheque] = useState<EstadoCheque[]>([
    { id: 1, codigo: 'PENDIENTE',   nombre: 'Pendiente',   activo: true },
    { id: 2, codigo: 'DEPOSITADO',  nombre: 'Depositado',  activo: true },
    { id: 3, codigo: 'COBRADO',     nombre: 'Cobrado',     activo: true },
    { id: 4, codigo: 'RECHAZADO',   nombre: 'Rechazado',   activo: true },
    { id: 5, codigo: 'VENCIDO',     nombre: 'Vencido',     activo: true },
    { id: 6, codigo: 'ANULADO',     nombre: 'Anulado',     activo: true },
  ]);
  const BANCOS = [
    { id: 4, nombre: 'BCI' }, { id: 10, nombre: 'BICE' }, { id: 2, nombre: 'Banco Estado' },
    { id: 7, nombre: 'Falabella' }, { id: 1, nombre: 'Genérico' }, { id: 5, nombre: 'Itaú' },
    { id: 8, nombre: 'Ripley' }, { id: 3, nombre: 'Santander' }, { id: 6, nombre: 'Scotiabank' }, { id: 9, nombre: 'Security' },
  ];
  // Formulario nuevo cheque
  const [nuevoCheque, setNuevoCheque] = useState({ numero_cheque: '', banco_id: 0, monto: '', fecha_emision: '', fecha_vencimiento: '', librador_nombre: '', librador_rut: '', observaciones: '' });
  const [guardandoCheque, setGuardandoCheque] = useState(false);
  const [errorCheque, setErrorCheque] = useState('');
  const [actualizandoChequeId, setActualizandoChequeId] = useState<number | null>(null);

  const MEDIOS_PAGO = [
    { id: 1, codigo: 'EFECTIVO',       nombre: 'Efectivo',              permite_cheque: false },
    { id: 2, codigo: 'TARJETA_DEBITO', nombre: 'Tarjeta de Débito',     permite_cheque: false },
    { id: 3, codigo: 'TARJETA_CREDITO',nombre: 'Tarjeta de Crédito',    permite_cheque: false },
    { id: 4, codigo: 'TRANSFERENCIA',  nombre: 'Transferencia Bancaria', permite_cheque: false },
    { id: 5, codigo: 'CHEQUE',         nombre: 'Cheque',                permite_cheque: true  },
  ];

  const abrirModalPago = (factura: Pedido) => {
    setFacturaPago(factura);
    setMedioPagoSeleccionado(0);
    setErrorPago('');
    setModalPago(true);
  };

  const cerrarModalPago = () => {
    setModalPago(false);
    setFacturaPago(null);
    setErrorPago('');
  };

  const handleRegistrarPago = async () => {
    if (!facturaPago) return;
    if (medioPagoSeleccionado === 0) { setErrorPago('Debes seleccionar un medio de pago.'); return; }
    try {
      setGuardandoPago(true);
      setErrorPago('');
      await registrarPago(facturaPago.id, medioPagoSeleccionado);
      cerrarModalPago();
      await cargarFacturas();
    } catch (err: any) {
      setErrorPago(err.message || 'Error al registrar el pago');
    } finally {
      setGuardandoPago(false);
    }
  };

  // ── Cheques ──────────────────────────────────────────────────
  const abrirModalCheques = async (factura: Pedido) => {
    setFacturaCheques(factura);
    setPedidoConCheques(null);
    setNuevoCheque({ numero_cheque: '', banco_id: 0, monto: '', fecha_emision: '', fecha_vencimiento: '', librador_nombre: factura.cliente?.nombre || '', librador_rut: factura.cliente?.rut || '', observaciones: '' });
    setErrorCheque('');
    setModalCheques(true);
    setCargandoCheques(true);
    try {
      const data = await obtenerPedidoConCheques(factura.id);
      setPedidoConCheques(data);
    } catch (err: any) {
      setErrorCheque(err.message || 'Error al cargar cheques');
    } finally {
      setCargandoCheques(false);
    }
  };

  const cerrarModalCheques = () => {
    setModalCheques(false);
    setFacturaCheques(null);
    setPedidoConCheques(null);
    setErrorCheque('');
  };

  const handleAgregarCheque = async () => {
    if (!facturaCheques) return;
    if (!nuevoCheque.numero_cheque.trim()) { setErrorCheque('Ingrese el número de cheque.'); return; }
    if (!nuevoCheque.banco_id) { setErrorCheque('Seleccione un banco.'); return; }
    if (!nuevoCheque.monto || parseFloat(nuevoCheque.monto) <= 0) { setErrorCheque('Ingrese un monto válido.'); return; }
    if (!nuevoCheque.fecha_vencimiento) { setErrorCheque('Ingrese la fecha de vencimiento.'); return; }
    if (!nuevoCheque.librador_nombre.trim()) { setErrorCheque('Ingrese el nombre del librador.'); return; }
    try {
      setGuardandoCheque(true);
      setErrorCheque('');
      const fechaEmision = nuevoCheque.fecha_emision ? new Date(nuevoCheque.fecha_emision).toISOString() : new Date().toISOString();
      const fechaVenc = new Date(nuevoCheque.fecha_vencimiento).toISOString();
      await crearCheque({
        pedido_id: facturaCheques.id,
        numero_cheque: nuevoCheque.numero_cheque.trim(),
        banco_id: nuevoCheque.banco_id,
        monto: parseFloat(nuevoCheque.monto),
        fecha_emision: fechaEmision,
        fecha_vencimiento: fechaVenc,
        librador_nombre: nuevoCheque.librador_nombre.trim(),
        librador_rut: nuevoCheque.librador_rut.trim() || undefined,
        observaciones: nuevoCheque.observaciones.trim() || undefined,
      });
      const data = await obtenerPedidoConCheques(facturaCheques.id);
      setPedidoConCheques(data);
      setNuevoCheque({ numero_cheque: '', banco_id: nuevoCheque.banco_id, monto: '', fecha_emision: '', fecha_vencimiento: '', librador_nombre: nuevoCheque.librador_nombre, librador_rut: nuevoCheque.librador_rut, observaciones: '' });
      await cargarFacturas();
    } catch (err: any) {
      setErrorCheque(err.message || 'Error al agregar cheque');
    } finally {
      setGuardandoCheque(false);
    }
  };

  const handleCambiarEstadoCheque = async (chequeId: number, estadoId: number) => {
    if (!facturaCheques) return;
    try {
      setActualizandoChequeId(chequeId);
      await actualizarCheque(chequeId, { estado_id: estadoId });
      const data = await obtenerPedidoConCheques(facturaCheques.id);
      setPedidoConCheques(data);
      await cargarFacturas();
    } catch (err: any) {
      setErrorCheque(err.message || 'Error al actualizar cheque');
    } finally {
      setActualizandoChequeId(null);
    }
  };

  const handleEliminarCheque = async (chequeId: number) => {
    if (!facturaCheques || !confirm('\u00bfEliminar este cheque?')) return;
    try {
      await eliminarCheque(chequeId);
      const data = await obtenerPedidoConCheques(facturaCheques.id);
      setPedidoConCheques(data);
      await cargarFacturas();
    } catch (err: any) {
      setErrorCheque(err.message || 'Error al eliminar cheque');
    }
  };

  const cargarFacturas = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listarFacturas();
      setFacturas(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las facturas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarFacturas();
  }, [cargarFacturas]);

  const facturasFiltradas = facturas.filter(f => {
    if (!mostrarCancelados && f.estado === 'CANCELADO') return false;
    if (filtroEstadoSii && f.estado_sii !== filtroEstadoSii) return false;
    if (soloPorCobrar) {
      // Mostrar solo facturas no pagadas (con o sin cheques pendientes)
      if (f.pagado) return false;
      if (f.estado === 'CANCELADO') return false;
    }
    if (busqueda) {
      const term = busqueda.toLowerCase();
      return (
        f.numero_pedido?.toLowerCase().includes(term) ||
        f.cliente?.nombre?.toLowerCase().includes(term) ||
        f.cliente?.rut?.toLowerCase().includes(term) ||
        f.cliente?.razon_social?.toLowerCase().includes(term) ||
        f.folio_sii?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Métricas financieras
  const facturasActivas = facturas.filter(f => f.estado !== 'CANCELADO' && (f.total ?? 0) > 0);
  const totalFacturado = facturasActivas.reduce((s, f) => s + (f.total ?? 0), 0);
  const totalCobrado = facturasActivas.filter(f => f.pagado).reduce((s, f) => s + (f.total ?? 0), 0);
  const totalPorCobrar = facturasActivas.filter(f => !f.pagado).reduce((s, f) => s + (f.total ?? 0), 0);
  const cantPorCobrar = facturasActivas.filter(f => !f.pagado).length;

  const abrirModalFolio = (factura: Pedido) => {
    setFacturaSeleccionada(factura);
    setFolioInput(factura.folio_sii || '');
    setNumeroDteInput(factura.numero_dte || '');
    setObsInput(factura.observaciones_sii || '');
    setErrorFolio('');
    setModalFolio(true);
  };

  const cerrarModalFolio = () => {
    setModalFolio(false);
    setFacturaSeleccionada(null);
    setFolioInput('');
    setNumeroDteInput('');
    setObsInput('');
    setErrorFolio('');
  };

  const handleRegistrarFolio = async () => {
    if (!facturaSeleccionada) return;
    if (!folioInput.trim()) {
      setErrorFolio('Debes ingresar el folio SII.');
      return;
    }
    try {
      setGuardandoFolio(true);
      setErrorFolio('');
      await registrarFolio(facturaSeleccionada.id, {
        folio_sii: folioInput.trim(),
        numero_dte: numeroDteInput.trim() || undefined,
        observaciones: obsInput.trim() || undefined,
      });
      cerrarModalFolio();
      await cargarFacturas();
    } catch (err: any) {
      setErrorFolio(err.message || 'Error al registrar el folio');
    } finally {
      setGuardandoFolio(false);
    }
  };

  const handleDescargarPDF = async (factura: Pedido) => {
    try {
      setDescargandoId(factura.id);
      await descargarFactura(factura.id, factura.numero_pedido);
    } catch (err: any) {
      alert(err.message || 'Error al descargar la factura');
    } finally {
      setDescargandoId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📄 Facturas</h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestión de facturas electrónicas y registro de folios SII
          </p>
        </div>
        <button
          onClick={cargarFacturas}
          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por N° pedido, cliente, RUT, razón social o folio..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <select
          value={filtroEstadoSii}
          onChange={e => setFiltroEstadoSii(e.target.value)}
          className="bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          {ESTADOS_SII.map(e => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-slate-400 text-sm cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={soloPorCobrar}
            onChange={e => setSoloPorCobrar(e.target.checked)}
            className="accent-yellow-500"
          />
          Solo por cobrar
        </label>
        <label className="flex items-center gap-2 text-slate-400 text-sm cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={mostrarCancelados}
            onChange={e => setMostrarCancelados(e.target.checked)}
            className="accent-red-500"
          />
          Cancelados
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 rounded-lg p-4 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Stats — financiero + SII */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Financieras */}
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total facturado</p>
          <p className="text-xl font-bold text-white">${Math.round(totalFacturado).toLocaleString('es-CL')}</p>
          <p className="text-slate-500 text-xs mt-0.5">{facturasActivas.length} facturas</p>
        </div>
        <div
          className={`bg-slate-800 border rounded-lg p-4 cursor-pointer transition-colors ${soloPorCobrar ? 'border-yellow-400 bg-yellow-900/20' : 'border-yellow-600 hover:border-yellow-400'}`}
          onClick={() => setSoloPorCobrar(v => !v)}
          title="Clic para filtrar solo por cobrar"
        >
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Por cobrar</p>
          <p className="text-xl font-bold text-yellow-400">${Math.round(totalPorCobrar).toLocaleString('es-CL')}</p>
          <p className="text-slate-500 text-xs mt-0.5">{cantPorCobrar} facturas</p>
        </div>
        <div className="bg-slate-800 border border-green-700 rounded-lg p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Cobrado</p>
          <p className="text-xl font-bold text-green-400">${Math.round(totalCobrado).toLocaleString('es-CL')}</p>
          <p className="text-slate-500 text-xs mt-0.5">{facturasActivas.filter(f => f.pagado).length} facturas</p>
        </div>
        {/* SII */}
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Estado SII</p>
          <div className="flex flex-col gap-0.5 mt-1">
            <span className="text-xs"><span className="text-yellow-400 font-semibold">{facturas.filter(f => f.estado !== 'CANCELADO' && (!f.estado_sii || f.estado_sii === 'PENDIENTE')).length}</span> <span className="text-slate-400">Pendientes</span></span>
            <span className="text-xs"><span className="text-blue-400 font-semibold">{facturas.filter(f => f.estado !== 'CANCELADO' && f.estado_sii === 'REGISTRADO').length}</span> <span className="text-slate-400">Registradas</span></span>
            <span className="text-xs"><span className="text-green-400 font-semibold">{facturas.filter(f => f.estado !== 'CANCELADO' && f.estado_sii === 'APROBADO').length}</span> <span className="text-slate-400">Aprobadas</span></span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Cargando facturas...</div>
        ) : facturasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            {busqueda || filtroEstadoSii ? 'No hay facturas que coincidan con el filtro.' : 'No hay facturas registradas aún.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="text-left text-slate-400 text-xs font-semibold px-4 py-3 uppercase tracking-wider">N° Pedido</th>
                  <th className="text-left text-slate-400 text-xs font-semibold px-4 py-3 uppercase tracking-wider">Cliente / RUT</th>
                  <th className="text-left text-slate-400 text-xs font-semibold px-4 py-3 uppercase tracking-wider">Vendedor</th>
                  <th className="text-left text-slate-400 text-xs font-semibold px-4 py-3 uppercase tracking-wider">Fecha</th>
                  <th className="text-left text-slate-400 text-xs font-semibold px-4 py-3 uppercase tracking-wider">Monto</th>
                  <th className="text-left text-slate-400 text-xs font-semibold px-4 py-3 uppercase tracking-wider">Estado Pago</th>
                  <th className="text-left text-slate-400 text-xs font-semibold px-4 py-3 uppercase tracking-wider">Estado SII</th>
                  <th className="text-left text-slate-400 text-xs font-semibold px-4 py-3 uppercase tracking-wider">Folio SII</th>
                  <th className="text-left text-slate-400 text-xs font-semibold px-4 py-3 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {facturasFiltradas.map(factura => {
                  const pendientePicking = !factura.total || factura.total === 0;
                  const esCancelado = factura.estado === 'CANCELADO';
                  return (
                  <tr key={factura.id} className={`hover:bg-slate-700/30 transition-colors ${pendientePicking || esCancelado ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="text-white font-mono text-sm">{factura.numero_pedido}</span>
                      <div className="text-slate-500 text-xs mt-0.5">#{factura.id}</div>
                      {esCancelado && (
                        <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded text-xs font-medium mt-0.5 inline-block">Cancelado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{factura.cliente?.razon_social || factura.cliente?.nombre}</p>
                      {factura.cliente?.rut && (
                        <p className="text-slate-400 text-xs mt-0.5">RUT: {factura.cliente.rut}</p>
                      )}
                      {factura.cliente?.giro && (
                        <p className="text-slate-500 text-xs truncate max-w-[180px]">{factura.cliente.giro}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {factura.usuario_nombre ? (
                        <p className="text-white text-sm">{factura.usuario_nombre}</p>
                      ) : (
                        <span className="text-slate-500 text-xs italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-sm whitespace-nowrap">
                      {formatFecha(factura.fecha_pedido)}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {pendientePicking ? (
                        <div>
                          <span className="text-slate-500 line-through text-xs">{formatMonto(factura.total)}</span>
                          <div className="mt-0.5">
                            <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded text-xs font-medium">
                              ⏳ Picking pendiente
                            </span>
                          </div>
                        </div>
                      ) : (() => {
                        const total = factura.total ?? 0;
                        const cobrado = factura.monto_cobrado_cheques ?? 0;
                        const pendiente = total - cobrado;
                        const tieneCheques = factura.permite_cheque && cobrado > 0;
                        return (
                          <div>
                            <span className="text-white font-semibold">{formatMonto(total)}</span>
                            {tieneCheques && (
                              <div className="mt-1 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block flex-shrink-0"></span>
                                  <span className="text-green-400 text-xs">Cobrado: {formatMonto(cobrado)}</span>
                                </div>
                                {pendiente > 0.5 && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block flex-shrink-0"></span>
                                    <span className="text-yellow-400 text-xs font-medium">Pendiente: {formatMonto(pendiente)}</span>
                                  </div>
                                )}
                                {pendiente <= 0.5 && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-green-500 text-xs">✓ Totalmente cobrado</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {factura.permite_cheque && cobrado === 0 && (
                              <div className="mt-0.5">
                                <span className="text-yellow-500 text-xs">⏳ Sin cobros aún</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {esCancelado ? (
                        <span className="bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full text-xs font-semibold">Anulada</span>
                      ) : factura.pagado ? (
                        <span className="bg-green-500/20 text-green-400 border border-green-500/40 px-2 py-0.5 rounded-full text-xs font-semibold">✓ Pagada</span>
                      ) : factura.medio_pago_id ? (
                        factura.permite_cheque ? (
                          <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 px-2 py-0.5 rounded-full text-xs font-semibold">⏳ Cheque pdte.</span>
                        ) : (
                          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded-full text-xs font-semibold">{factura.medio_pago_nombre}</span>
                        )
                      ) : (
                        <span className="bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full text-xs font-semibold">Sin registrar</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoSiiBadge estado={factura.estado_sii} />
                    </td>
                    <td className="px-4 py-3">
                      {factura.folio_sii ? (
                        <span className="text-cyan-400 font-mono text-sm">{factura.folio_sii}</span>
                      ) : (
                        <span className="text-slate-600 text-sm italic">Sin folio</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {esCancelado ? (
                        <span className="text-red-400 text-xs italic">Pedido cancelado</span>
                      ) : pendientePicking ? (
                        <span className="text-slate-500 text-xs italic">
                          Confirmar pedido primero
                        </span>
                      ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => abrirModalFolio(factura)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap"
                          title="Registrar o actualizar folio SII"
                        >
                          🔢 {factura.folio_sii ? 'Editar folio' : 'Registrar folio'}
                        </button>
                        <button
                          onClick={() => handleDescargarPDF(factura)}
                          disabled={descargandoId === factura.id}
                          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap"
                          title="Descargar PDF de la factura"
                        >
                          {descargandoId === factura.id ? '⏳' : '📄'} PDF
                        </button>
                        <button
                          onClick={() => abrirModalCheques(factura)}
                          disabled={!factura.folio_sii}
                          className="bg-orange-700 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap"
                          title={factura.folio_sii ? 'Gestionar cheques' : 'Primero debe registrar el folio SII'}
                        >
                          📝 Cheques
                        </button>
                        <button
                          onClick={() => abrirModalPago(factura)}
                          disabled={!factura.folio_sii}
                          className="bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap"
                          title={factura.folio_sii ? 'Registrar medio de pago' : 'Primero debe registrar el folio SII'}
                        >
                          💳 Pago
                        </button>
                      </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal gestionar cheques */}
      {modalCheques && facturaCheques && (() => {
        const resumen = pedidoConCheques?.resumen_cheques;
        const cheques = pedidoConCheques?.cheques ?? [];
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-600 w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-700 flex-shrink-0">
                <div>
                  <h2 className="text-white font-bold text-lg">📝 Gestión de Cheques</h2>
                  <p className="text-slate-400 text-sm mt-0.5">{facturaCheques.numero_pedido} — {facturaCheques.cliente?.razon_social || facturaCheques.cliente?.nombre}</p>
                </div>
                <button onClick={cerrarModalCheques} className="text-slate-400 hover:text-white text-xl">✕</button>
              </div>

              <div className="overflow-y-auto flex-1 p-5 space-y-5">
                {/* Resumen */}
                {resumen && (
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Total cheques', value: resumen.total_cheques, cls: 'text-white' },
                      { label: 'Monto total', value: '$' + Math.round(resumen.monto_total_cheques).toLocaleString('es-CL'), cls: 'text-white' },
                      { label: 'Pendientes', value: resumen.cheques_pendientes, cls: 'text-yellow-400' },
                      { label: 'Cobrados', value: resumen.cheques_cobrados, cls: 'text-green-400' },
                    ].map(s => (
                      <div key={s.label} className="bg-slate-700/60 rounded-lg p-3 text-center">
                        <p className={s.cls + ' font-bold text-lg'}>{s.value}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
                {resumen?.todos_cobrados && (
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 text-center">
                    <p className="text-green-400 font-semibold">✅ Todos los cheques están cobrados — Factura pagada</p>
                  </div>
                )}

                {/* Lista de cheques existentes */}
                {cargandoCheques ? (
                  <div className="text-center py-6 text-slate-400">Cargando cheques...</div>
                ) : cheques.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">No hay cheques registrados aún.</p>
                ) : (
                  <div className="space-y-3">
                    {cheques.map(cheque => {
                      const estadoObj = estadosCheque.find(e => e.id === cheque.estado_id);
                      const esCobrado = estadoObj?.codigo === 'COBRADO';
                      const esRechazado = estadoObj?.codigo === 'RECHAZADO';
                      return (
                        <div key={cheque.id} className="bg-slate-700 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-white font-semibold">Cheque #{cheque.numero_cheque}</p>
                              <p className="text-slate-400 text-sm">{cheque.banco?.nombre || 'Banco genérico'}</p>
                              <p className="text-white font-bold text-lg">${Math.round(cheque.monto).toLocaleString('es-CL')}</p>
                              {cheque.librador_nombre && <p className="text-slate-400 text-xs">Librador: {cheque.librador_nombre}{cheque.librador_rut ? ' — ' + cheque.librador_rut : ''}</p>}
                            </div>
                            <div className="text-right">
                              <p className="text-slate-400 text-xs">Vencimiento</p>
                              <p className="text-sm text-white">{new Date(cheque.fecha_vencimiento).toLocaleDateString('es-CL')}</p>
                              {cheque.fecha_cobro && <p className="text-green-400 text-xs mt-1">Cobrado: {new Date(cheque.fecha_cobro).toLocaleDateString('es-CL')}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <select
                              value={cheque.estado_id}
                              onChange={e => handleCambiarEstadoCheque(cheque.id, parseInt(e.target.value))}
                              disabled={actualizandoChequeId === cheque.id}
                              className={`bg-slate-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                esCobrado ? 'border border-green-500/50' : esRechazado ? 'border border-red-500/50' : 'border border-slate-500'
                              }`}
                            >
                              {estadosCheque.map(e => (
                                <option key={e.id} value={e.id}>{e.nombre}</option>
                              ))}
                            </select>
                            {actualizandoChequeId === cheque.id && <span className="text-slate-400 text-xs">Guardando...</span>}
                            <button
                              onClick={() => handleEliminarCheque(cheque.id)}
                              className="ml-auto text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-900/30 transition-colors"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Formulario nuevo cheque */}
                <div className="border-t border-slate-700 pt-4">
                  <h3 className="text-white font-semibold mb-3">+ Agregar nuevo cheque</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">N° Cheque *</label>
                      <input type="text" value={nuevoCheque.numero_cheque} onChange={e => setNuevoCheque(p => ({...p, numero_cheque: e.target.value}))} placeholder="Ej: 0012345" className="w-full bg-slate-700 border border-slate-500 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Banco *</label>
                      <select value={nuevoCheque.banco_id} onChange={e => setNuevoCheque(p => ({...p, banco_id: parseInt(e.target.value)}))} className="w-full bg-slate-700 border border-slate-500 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                        <option value={0}>Seleccionar banco...</option>
                        {BANCOS.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Monto ($) *</label>
                      <input type="number" value={nuevoCheque.monto} onChange={e => setNuevoCheque(p => ({...p, monto: e.target.value}))} placeholder="Ej: 500000" className="w-full bg-slate-700 border border-slate-500 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Fecha Vencimiento *</label>
                      <input type="date" value={nuevoCheque.fecha_vencimiento} onChange={e => setNuevoCheque(p => ({...p, fecha_vencimiento: e.target.value}))} className="w-full bg-slate-700 border border-slate-500 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Fecha Emisión</label>
                      <input type="date" value={nuevoCheque.fecha_emision} onChange={e => setNuevoCheque(p => ({...p, fecha_emision: e.target.value}))} className="w-full bg-slate-700 border border-slate-500 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">RUT Librador</label>
                      <input type="text" value={nuevoCheque.librador_rut} onChange={e => setNuevoCheque(p => ({...p, librador_rut: e.target.value}))} placeholder="Ej: 12.345.678-9" className="w-full bg-slate-700 border border-slate-500 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-slate-400 text-xs mb-1">Nombre Librador *</label>
                      <input type="text" value={nuevoCheque.librador_nombre} onChange={e => setNuevoCheque(p => ({...p, librador_nombre: e.target.value}))} placeholder="Nombre completo" className="w-full bg-slate-700 border border-slate-500 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-slate-400 text-xs mb-1">Observaciones</label>
                      <input type="text" value={nuevoCheque.observaciones} onChange={e => setNuevoCheque(p => ({...p, observaciones: e.target.value}))} placeholder="Opcional..." className="w-full bg-slate-700 border border-slate-500 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  {errorCheque && <p className="text-red-400 text-sm mt-3 bg-red-900/30 rounded p-2">⚠️ {errorCheque}</p>}
                  <button
                    onClick={handleAgregarCheque}
                    disabled={guardandoCheque}
                    className="mt-3 w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {guardandoCheque ? '⏳ Guardando...' : '➕ Agregar Cheque'}
                  </button>
                </div>
              </div>

              <div className="flex-shrink-0 px-5 pb-5 border-t border-slate-700 pt-4">
                <button onClick={cerrarModalCheques} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal registrar pago */}
      {modalPago && facturaPago && (() => {
        const medioSeleccionado = MEDIOS_PAGO.find(m => m.id === medioPagoSeleccionado);
        const esCheque = medioSeleccionado?.permite_cheque ?? false;
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-600 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between p-5 border-b border-slate-700">
                <div>
                  <h2 className="text-white font-bold text-lg">💳 Registrar Pago</h2>
                  <p className="text-slate-400 text-sm mt-0.5">{facturaPago.numero_pedido}</p>
                </div>
                <button onClick={cerrarModalPago} className="text-slate-400 hover:text-white text-xl">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-slate-700/50 rounded-lg p-3 text-sm space-y-1">
                  <p className="text-white font-medium">{facturaPago.cliente?.razon_social || facturaPago.cliente?.nombre}</p>
                  {facturaPago.cliente?.rut && <p className="text-slate-400">RUT: {facturaPago.cliente.rut}</p>}
                  <p className="text-slate-400">Monto: <span className="text-white font-semibold">{formatMonto(facturaPago.total)}</span></p>
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Medio de pago <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {MEDIOS_PAGO.map(medio => (
                      <button
                        key={medio.id}
                        onClick={() => setMedioPagoSeleccionado(medio.id)}
                        className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                          medioPagoSeleccionado === medio.id
                            ? medio.permite_cheque
                              ? 'bg-orange-600/30 border-orange-500 text-orange-300'
                              : 'bg-green-600/30 border-green-500 text-green-300'
                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <span>{medio.nombre}</span>
                        {medio.permite_cheque && (
                          <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded">Pago diferido</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {esCheque && (
                  <div className="bg-orange-900/30 border border-orange-500/50 rounded-lg p-3 text-sm">
                    <p className="text-orange-300 font-semibold">⚠️ Cheque — Pago diferido</p>
                    <p className="text-orange-400 mt-1">
                      El cheque queda registrado como <strong>pendiente de acreditación</strong>. El sistema marcará la factura como pagada solo cuando el cheque sea cobrado.
                    </p>
                  </div>
                )}

                {medioPagoSeleccionado > 0 && !esCheque && (
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 text-sm">
                    <p className="text-green-300">✅ La factura quedará marcada como <strong>pagada</strong>.</p>
                  </div>
                )}

                {errorPago && (
                  <p className="text-red-400 text-sm bg-red-900/30 rounded p-2">⚠️ {errorPago}</p>
                )}
              </div>
              <div className="flex gap-3 px-5 pb-5">
                <button
                  onClick={cerrarModalPago}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRegistrarPago}
                  disabled={guardandoPago || medioPagoSeleccionado === 0}
                  className={`flex-1 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors ${
                    esCheque ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {guardandoPago ? '⏳ Guardando...' : esCheque ? '📋 Registrar cheque' : '✅ Confirmar pago'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal registrar folio */}
      {modalFolio && facturaSeleccionada && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-600 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <div>
                <h2 className="text-white font-bold text-lg">Registrar Folio SII</h2>
                <p className="text-slate-400 text-sm mt-0.5">{facturaSeleccionada.numero_pedido}</p>
              </div>
              <button
                onClick={cerrarModalFolio}
                className="text-slate-400 hover:text-white text-xl"
              >✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Client info */}
              <div className="bg-slate-700/50 rounded-lg p-3 text-sm space-y-1">
                <p className="text-white font-medium">
                  {facturaSeleccionada.cliente?.razon_social || facturaSeleccionada.cliente?.nombre}
                </p>
                {facturaSeleccionada.cliente?.rut && (
                  <p className="text-slate-400">RUT: {facturaSeleccionada.cliente.rut}</p>
                )}
                <p className="text-slate-400">Monto: {formatMonto(facturaSeleccionada.total)}</p>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">
                  Folio SII <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={folioInput}
                  onChange={e => setFolioInput(e.target.value)}
                  placeholder="Ej: 123456"
                  className="w-full bg-slate-700 border border-slate-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">
                  N° DTE (opcional)
                </label>
                <input
                  type="text"
                  value={numeroDteInput}
                  onChange={e => setNumeroDteInput(e.target.value)}
                  placeholder="Número de DTE del SII"
                  className="w-full bg-slate-700 border border-slate-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={obsInput}
                  onChange={e => setObsInput(e.target.value)}
                  placeholder="Notas adicionales sobre la factura..."
                  rows={2}
                  className="w-full bg-slate-700 border border-slate-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {errorFolio && (
                <p className="text-red-400 text-sm bg-red-900/30 rounded p-2">⚠️ {errorFolio}</p>
              )}
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={cerrarModalFolio}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarFolio}
                disabled={guardandoFolio || !folioInput.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {guardandoFolio ? '⏳ Guardando...' : '✅ Registrar folio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
