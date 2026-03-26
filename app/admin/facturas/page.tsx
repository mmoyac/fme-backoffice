'use client';

import { useState, useEffect, useCallback } from 'react';
import { listarFacturas, registrarFolio, descargarFactura } from '@/lib/api/facturas';
import type { Pedido } from '@/lib/api/pedidos';

const ESTADOS_SII = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente', color: 'bg-yellow-500' },
  { value: 'REGISTRADO', label: 'Registrado', color: 'bg-blue-500' },
  { value: 'ENVIADO', label: 'Enviado', color: 'bg-indigo-500' },
  { value: 'APROBADO', label: 'Aprobado', color: 'bg-green-500' },
  { value: 'RECHAZADO', label: 'Rechazado', color: 'bg-red-500' },
  { value: 'ANULADO', label: 'Anulado', color: 'bg-gray-500' },
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
          <h1 className="text-2xl font-bold text-white">Facturas</h1>
          <p className="text-slate-400 text-sm mt-1">
            Registro de folios SII y descarga de documentos tributarios
          </p>
        </div>
        <button
          onClick={cargarFacturas}
          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por N° pedido, cliente, RUT, razon social o folio..."
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
          {error}
        </div>
      )}

      {/* Stats SII */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total facturas</p>
          <p className="text-xl font-bold text-white">{facturas.filter(f => f.estado !== 'CANCELADO').length}</p>
          <p className="text-slate-500 text-xs mt-0.5">activas</p>
        </div>
        <div className="bg-slate-800 border border-yellow-700 rounded-lg p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Sin folio</p>
          <p className="text-xl font-bold text-yellow-400">
            {facturas.filter(f => f.estado !== 'CANCELADO' && !f.folio_sii && (f.total ?? 0) > 0).length}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">pendientes SII</p>
        </div>
        <div className="bg-slate-800 border border-blue-700 rounded-lg p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Registradas</p>
          <p className="text-xl font-bold text-blue-400">
            {facturas.filter(f => f.estado !== 'CANCELADO' && f.estado_sii === 'REGISTRADO').length}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">en SII</p>
        </div>
        <div className="bg-slate-800 border border-green-700 rounded-lg p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Aprobadas</p>
          <p className="text-xl font-bold text-green-400">
            {facturas.filter(f => f.estado !== 'CANCELADO' && f.estado_sii === 'APROBADO').length}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">por SII</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Cargando facturas...</div>
        ) : facturasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            {busqueda || filtroEstadoSii ? 'No hay facturas que coincidan con el filtro.' : 'No hay facturas registradas aun.'}
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
                          <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded text-xs font-medium">
                            Picking pendiente
                          </span>
                        ) : (
                          <span className="text-white font-semibold">{formatMonto(factura.total)}</span>
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
                          <span className="text-slate-500 text-xs italic">Confirmar pedido primero</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => abrirModalFolio(factura)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              {factura.folio_sii ? 'Editar folio' : 'Registrar folio'}
                            </button>
                            <button
                              onClick={() => handleDescargarPDF(factura)}
                              disabled={descargandoId === factura.id}
                              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              {descargandoId === factura.id ? 'Descargando...' : 'PDF'}
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

      {/* Modal registrar folio */}
      {modalFolio && facturaSeleccionada && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-600 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <div>
                <h2 className="text-white font-bold text-lg">Registrar Folio SII</h2>
                <p className="text-slate-400 text-sm mt-0.5">{facturaSeleccionada.numero_pedido}</p>
              </div>
              <button onClick={cerrarModalFolio} className="text-slate-400 hover:text-white text-xl">X</button>
            </div>

            <div className="p-5 space-y-4">
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
                  placeholder="Numero de DTE del SII"
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
                  placeholder="Notas adicionales..."
                  rows={2}
                  className="w-full bg-slate-700 border border-slate-500 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {errorFolio && (
                <p className="text-red-400 text-sm bg-red-900/30 rounded p-2">{errorFolio}</p>
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
                {guardandoFolio ? 'Guardando...' : 'Registrar folio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
