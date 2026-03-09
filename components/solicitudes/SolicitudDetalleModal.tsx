import React, { useState } from "react";
import { useUsuariosMap } from "./useUsuariosMap";
import type { SolicitudTransferencia } from "../../types/solicitud";

interface Props {
  solicitud: SolicitudTransferencia;
  localesMap: Record<number, any>;
  productosMap: Record<number, any>;
  onClose: () => void;
  onRecibir?: () => void;
}

import { generarPDFSolicitudHTML } from "./generarPDFSolicitudHTML";

import { useAuth } from "@/lib/AuthProvider";
import { updateSolicitud } from "@/lib/api/solicitudes";

const SolicitudDetalleModal: React.FC<Props> = ({ solicitud, localesMap, productosMap, onClose, onRecibir }) => {
  const { user } = useAuth();
  const [recepcionOpen, setRecepcionOpen] = useState(true);
  const [cantidades, setCantidades] = useState<{ [producto_id: number]: number }>({});
  const [loadingRecibir, setLoadingRecibir] = useState(false);
  const [errorRecibir, setErrorRecibir] = useState<string | null>(null);
    // Condición para mostrar botón Recibir
    const puedeRecibir = solicitud.estado_id === 3 && !solicitud.recibido && user?.local_defecto_id === solicitud.local_destino_id;
    // Inicializar cantidades al abrir el modal
    React.useEffect(() => {
      const inicial: { [producto_id: number]: number } = {};
      solicitud.items.forEach(item => {
        inicial[item.producto_id] = item.cantidad_recibida ?? item.cantidad_aprobada ?? item.cantidad_solicitada;
      });
      setCantidades(inicial);
      setRecepcionOpen(true);
    }, [solicitud]);

    const handleCantidadChange = (producto_id: number, value: number) => {
      setCantidades(prev => ({ ...prev, [producto_id]: value }));
    };

    const handleConfirmarRecepcion = async () => {
      setLoadingRecibir(true);
      setErrorRecibir(null);
      try {
        await updateSolicitud(solicitud.solicitud_id, {
          recibido: true,
          items: solicitud.items.map(item => ({
            producto_id: item.producto_id,
            cantidad_solicitada: item.cantidad_solicitada,
            cantidad_aprobada: item.cantidad_aprobada,
            cantidad_recibida: cantidades[item.producto_id]
          }))
        });
        setRecepcionOpen(false);
        if (onRecibir) onRecibir();
        onClose();
      } catch (e: any) {
        setErrorRecibir(e?.message || "Error al registrar la recepción");
      } finally {
        setLoadingRecibir(false);
      }
    };
  const usuariosHook = useUsuariosMap();
  const usuariosMap = (usuariosHook as any).usuariosMap || {};
  const error = (usuariosHook as any).error || null;
  const loadingUsuarios = Object.keys(usuariosMap).length === 0 && !error;
  const errorUsuarios = loadingUsuarios && typeof window !== 'undefined' && window.console && window.console.error && window.console.error.toString().includes('Unauthorized');
  const handleImprimir = async () => {
    // Crear un div temporal oculto
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.background = '#fff';
    tempDiv.style.zIndex = '99999';
    tempDiv.style.width = '700px';
    tempDiv.style.padding = '32px';
    document.body.appendChild(tempDiv);
    const ReactDOM = await import('react-dom');
    ReactDOM.render(
      <div style={{ width: 600, padding: 24, fontFamily: 'Arial, sans-serif', background: '#fff', color: '#222' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 16 }}>Solicitud de Transferencia #{solicitud.solicitud_id}</h2>
        <div style={{ marginBottom: 12 }}>
          <strong>Local Origen:</strong> {localesMap[solicitud.local_origen_id]?.nombre || solicitud.local_origen_id}<br />
          <strong>Local Destino:</strong> {localesMap[solicitud.local_destino_id]?.nombre || solicitud.local_destino_id}<br />
          <strong>Usuario que solicitó:</strong> {usuariosMap[solicitud.usuario_solicitante_id]?.nombre_completo || solicitud.usuario_solicitante_id}<br />
          <strong>Usuario que finalizó:</strong> {solicitud.usuario_finalizador_id ? (usuariosMap[solicitud.usuario_finalizador_id]?.nombre_completo || solicitud.usuario_finalizador_id) : '—'}<br />
          <strong>Fecha de Solicitud:</strong> {new Date(solicitud.fecha_creacion).toLocaleString('es-CL')}<br />
          {"usuario_finalizador_id" in solicitud && solicitud.usuario_finalizador_id && solicitud.estado_id === 3 && (
            <div><strong>Fecha de Respuesta:</strong> {new Date(solicitud.fecha_actualizacion).toLocaleString('es-CL')}</div>
          )}
          <strong>Estado:</strong> {solicitud.estado_id === 3 ? 'Finalizado' : 'Pendiente'}<br />
        </div>
        {solicitud.nota && (
          <div style={{ marginBottom: 12 }}>
            <strong>Nota:</strong> {solicitud.nota}
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: 6, background: '#f5f5f5' }}>Producto</th>
              <th style={{ border: '1px solid #ccc', padding: 6, background: '#f5f5f5' }}>Solicitado</th>
              <th style={{ border: '1px solid #ccc', padding: 6, background: '#f5f5f5' }}>Aprobado</th>
            </tr>
          </thead>
          <tbody>
            {solicitud.items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>{productosMap[item.producto_id]?.nombre || item.producto_id}</td>
                <td style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center' }}>{item.cantidad_solicitada}</td>
                <td style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center' }}>{item.cantidad_aprobada ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 12, color: '#888', textAlign: 'right' }}>
          Generado: {new Date().toLocaleString('es-CL')}
        </div>
      </div>, tempDiv);
    await generarPDFSolicitudHTML(tempDiv, solicitud.solicitud_id);
    ReactDOM.unmountComponentAtNode(tempDiv);
    document.body.removeChild(tempDiv);
  };
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full shadow-xl border border-slate-700 relative text-white flex flex-col items-center">
          <span className="text-red-500 text-lg mb-2">{error}. No tienes permisos o sesión expirada.</span>
        </div>
      </div>
    );
  }
  if (loadingUsuarios) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full shadow-xl border border-slate-700 relative text-white flex flex-col items-center">
          <span className="text-primary text-lg mb-2">Cargando usuarios...</span>
          <div className="loader border-t-4 border-primary border-solid rounded-full w-8 h-8 animate-spin"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full shadow-xl border border-slate-700 relative text-white">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-primary" onClick={onClose}>✕</button>
        <h2 className="text-xl font-bold mb-4">Solicitud de Transferencia #{solicitud.solicitud_id}</h2>
        <div className="mb-2 text-sm">
          <strong>Local Origen:</strong> {localesMap[solicitud.local_origen_id]?.nombre || solicitud.local_origen_id}<br />
          <strong>Local Destino:</strong> {localesMap[solicitud.local_destino_id]?.nombre || solicitud.local_destino_id}<br />
          <strong>Usuario que solicitó:</strong> {usuariosMap[solicitud.usuario_solicitante_id]?.nombre_completo || solicitud.usuario_solicitante_id}<br />
          <strong>Usuario que finalizó:</strong> {"usuario_finalizador_id" in solicitud && solicitud.usuario_finalizador_id ? (usuariosMap[solicitud.usuario_finalizador_id]?.nombre_completo || solicitud.usuario_finalizador_id) : '—'}<br />
          <strong>Fecha de Solicitud:</strong> {new Date(solicitud.fecha_creacion).toLocaleString('es-CL')}<br />
          {"usuario_finalizador_id" in solicitud && solicitud.usuario_finalizador_id && solicitud.estado_id === 3 && (
            <div><strong>Fecha de Respuesta:</strong> {new Date(solicitud.fecha_actualizacion).toLocaleString('es-CL')}</div>
          )}
          <strong>Estado:</strong> {solicitud.estado_id === 3 ? 'Finalizado' : 'Pendiente'}
        </div>
        {solicitud.nota && (
          <div className="mb-2 text-sm"><strong>Nota:</strong> {solicitud.nota}</div>
        )}
        <table className="w-full border border-slate-700 mb-4">
          <thead>
            <tr className="bg-slate-700">
              <th className="py-2 px-3 text-xs text-primary border-b border-slate-700">Producto</th>
              <th className="py-2 px-3 text-xs text-primary border-b border-slate-700">Solicitado</th>
              <th className="py-2 px-3 text-xs text-primary border-b border-slate-700">Aprobado</th>
              <th className="py-2 px-3 text-xs text-primary border-b border-slate-700">Recibido</th>
            </tr>
          </thead>
          <tbody>
            {solicitud.items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-2 px-3 border-b border-slate-700">{productosMap[item.producto_id]?.nombre || item.producto_id}</td>
                <td className="py-2 px-3 border-b border-slate-700 text-center">{item.cantidad_solicitada}</td>
                <td className="py-2 px-3 border-b border-slate-700 text-center">{item.cantidad_aprobada ?? '-'}</td>
                <td className="py-2 px-3 border-b border-slate-700 text-center">
                  {recepcionOpen ? (
                    <input
                      type="number"
                      min={0}
                      max={item.cantidad_aprobada ?? item.cantidad_solicitada}
                      value={cantidades[item.producto_id] ?? ''}
                      onChange={e => handleCantidadChange(item.producto_id, Number(e.target.value))}
                      className="w-20 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-white text-center"
                    />
                  ) : (
                    item.cantidad_recibida ?? '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-col gap-2 mt-4">
          <div className="flex gap-2 justify-end">
            <button
              className="px-4 py-2 rounded bg-primary text-slate-900 font-semibold hover:bg-primary-dark transition-colors"
              onClick={handleImprimir}
            >
              Imprimir PDF
            </button>
            <button
              className="px-4 py-2 rounded bg-slate-600 text-gray-200 hover:bg-slate-500 transition-colors"
              onClick={onClose}
            >
              Cerrar
            </button>
            {/* El botón Recibir ya no es necesario porque la edición está siempre activa */}
          </div>
          {recepcionOpen && (
            <div className="flex gap-2 justify-end mt-4">
              {errorRecibir && <div className="text-red-400 mt-2">{errorRecibir}</div>}
              <button
                className="px-4 py-2 rounded bg-green-500 text-slate-900 font-semibold hover:bg-green-600 transition-colors"
                onClick={handleConfirmarRecepcion}
                disabled={loadingRecibir}
              >
                {solicitud.recibido ? 'Actualizar recepción' : 'Guardar recepción'}
              </button>
              <button
                className="px-4 py-2 rounded bg-slate-600 text-gray-200 hover:bg-slate-500 transition-colors"
                onClick={onClose}
                disabled={loadingRecibir}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
        <div className="text-xs text-right text-slate-400 mt-2">Visualizado: {new Date().toLocaleString('es-CL')}</div>
      </div>
    </div>
  );
};

export default SolicitudDetalleModal;
