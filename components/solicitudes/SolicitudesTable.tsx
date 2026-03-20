// Tabla de solicitudes con filtros, paginación y acciones CRUD

"use client";
import React, { useEffect, useState } from "react";
import {
  getSolicitudes,
  createSolicitud,
  updateSolicitud,
  deleteSolicitud
} from "@/lib/api/solicitudes";
import { SolicitudTransferencia, SolicitudTransferenciaCreate, SolicitudTransferenciaUpdate } from "@/types/solicitud";


import SolicitudForm from "./SolicitudForm";
import SolicitudDetalleModal from "./SolicitudDetalleModal";
import { generarPDFSolicitudHTML, generarPDFSolicitudBlob } from "./generarPDFSolicitudHTML";
import SolicitudPDFResumen from "./SolicitudPDFResumen";
import { useAuth } from "@/lib/AuthProvider";
import { useLocalesMap } from "./useLocalesMap";
import { useEstadosEnrolamientoMap } from "./useEstadosEnrolamientoMap";
import { useProductosMap } from "./useProductosMap";

type EditRecibidas = {
  [solicitudId: number]: {
    [itemId: number]: number;
  };
};

export default function SolicitudesTable() {
  const [solicitudes, setSolicitudes] = useState<SolicitudTransferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SolicitudTransferencia | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>("no_finalizado");
  const [pdfModalUrl, setPdfModalUrl] = useState<string | null>(null);
  const [pdfModalBlob, setPdfModalBlob] = useState<Blob | null>(null);
  const [pdfModalSolicitudId, setPdfModalSolicitudId] = useState<number | null>(null);
  const [shareModalSolicitud, setShareModalSolicitud] = useState<SolicitudTransferencia | null>(null);
  const localesMap = useLocalesMap();
  const estadosMap = useEstadosEnrolamientoMap();
  const productosMap = useProductosMap();
  const { user } = useAuth();

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const canNativeShare = () => {
    try {
      return !!navigator.canShare && navigator.canShare({ files: [new File([''], 'test.pdf', { type: 'application/pdf' })] });
    } catch {
      return false;
    }
  };

  const handleShareClick = (e: React.MouseEvent, s: SolicitudTransferencia) => {
    e.stopPropagation();
    if (canNativeShare()) {
      handleShareTo(s, 'native');
    } else {
      setShareModalSolicitud(s);
    }
  };

  const fetchSolicitudes = async () => {
    setLoading(true);
    try {
      const data = await getSolicitudes();
      setSolicitudes(data);
    } catch (e) {
      setError("Error al cargar solicitudes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: SolicitudTransferenciaCreate) => {
    try {
      await createSolicitud(data);
      setModalOpen(false);
      fetchSolicitudes();
    } catch (e) {
      setError("Error al crear solicitud");
    }
  };

  const handleEdit = (solicitud: SolicitudTransferencia) => {
    setEditing(solicitud);
    setModalOpen(true);
  };
  const handleDetalle = (solicitud: SolicitudTransferencia) => {
    setEditing(solicitud);
    setDetalleOpen(true);
  };

  const handleUpdate = async (id: number, data: SolicitudTransferenciaUpdate) => {
    try {
      await updateSolicitud(id, data);
      setModalOpen(false);
      setEditing(null);
      fetchSolicitudes();
    } catch (e) {
      setError("Error al actualizar solicitud");
    }
  };

  const handleVerPDF = async (s: SolicitudTransferencia) => {
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position:fixed;left:-9999px;top:0;background:#fff;width:700px;padding:32px;z-index:99999';
    document.body.appendChild(tempDiv);
    try {
      const ReactDOM = await import('react-dom');
      ReactDOM.render(
        <SolicitudPDFResumen solicitud={s} localesMap={localesMap} productosMap={productosMap} />,
        tempDiv
      );
      await new Promise(r => setTimeout(r, 200));
      const blob = await generarPDFSolicitudBlob(tempDiv);
      ReactDOM.unmountComponentAtNode(tempDiv);
      const url = URL.createObjectURL(blob);
      setPdfModalBlob(blob);
      setPdfModalUrl(url);
      setPdfModalSolicitudId(s.solicitud_id);
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const handleClosePdfModal = () => {
    if (pdfModalUrl) URL.revokeObjectURL(pdfModalUrl);
    setPdfModalUrl(null);
    setPdfModalBlob(null);
    setPdfModalSolicitudId(null);
  };

  const handleDownloadPDF = () => {
    if (!pdfModalBlob || !pdfModalSolicitudId) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(pdfModalBlob);
    a.download = `solicitud_${pdfModalSolicitudId}.pdf`;
    a.click();
  };

  const handleShareTo = async (s: SolicitudTransferencia, canal: 'whatsapp' | 'telegram' | 'email' | 'native') => {
    setShareModalSolicitud(null);
    const origen = localesMap[s.local_origen_id]?.nombre || s.local_origen_id;
    const destino = localesMap[s.local_destino_id]?.nombre || s.local_destino_id;
    const estado = estadosMap[s.estado_id]?.nombre || '';
    const texto = `📦 Solicitud de Transferencia #${s.solicitud_id}\nOrigen: ${origen} → Destino: ${destino}\nEstado: ${estado}\nFecha: ${new Date(s.fecha_creacion).toLocaleString('es-CL')}\n\n⚠️ Favor gestionar en el sistema.`;
    const textoEnc = encodeURIComponent(texto);

    if (canal === 'native') {
      if (typeof navigator.canShare === 'function' && navigator.canShare({ text: texto })) {
        await navigator.share({ title: `Solicitud #${s.solicitud_id}`, text: texto });
      }
      return;
    }

    if (canal === 'whatsapp') {
      window.open(`whatsapp://send?text=${textoEnc}`, '_blank');
    } else if (canal === 'telegram') {
      window.open(`https://t.me/share/url?url=&text=${textoEnc}`, '_blank');
    } else if (canal === 'email') {
      const asunto = encodeURIComponent(`Solicitud de Transferencia #${s.solicitud_id}`);
      window.open(`mailto:?subject=${asunto}&body=${textoEnc}`, '_blank');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Eliminar esta solicitud?")) return;
    try {
      await deleteSolicitud(id);
      fetchSolicitudes();
    } catch (e) {
      setError("Error al eliminar solicitud");
    }
  };



  const solicitudesFiltradas = solicitudes.filter(s => {
    const codigo = estadosMap[s.estado_id]?.codigo ?? '';
    if (filtroEstado === 'no_finalizado') {
      if (codigo !== 'FINALIZADO') return true;
      // Finalizado pero pendiente de recepción por el destino
      return !s.recibido && s.local_destino_id === user?.local_defecto_id;
    }
    if (filtroEstado === '') return true;
    return codigo === filtroEstado;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Solicitudes</h1>
        <div className="flex gap-3 items-center">
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="bg-slate-700 text-gray-300 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          >
            <option value="no_finalizado">Activas (sin finalizadas)</option>
            <option value="">Todas</option>
            {Object.values(estadosMap).map((e: any) => (
              <option key={e.id} value={e.codigo}>{e.nombre}</option>
            ))}
          </select>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            + Nueva Solicitud
          </button>
        </div>
      </div>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      {loading ? (
        <div className="text-center py-4 text-gray-400">Cargando...</div>
      ) : solicitudesFiltradas.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No hay solicitudes registradas</div>
      ) : (
        <>
          {/* Vista Mobile: Cards */}
          <div className="lg:hidden space-y-4">
            {solicitudesFiltradas.map((s) => (
              <div key={s.solicitud_id} className="bg-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono text-gray-400">#{s.solicitud_id}</span>
                  <span className="text-xs bg-slate-600 text-gray-300 px-2 py-0.5 rounded-full">
                    {estadosMap[s.estado_id]?.nombre || s.estado_id}
                  </span>
                </div>
                <div className="text-sm text-gray-300 space-y-1">
                  <div><span className="text-gray-500">Origen:</span> {localesMap[s.local_origen_id]?.nombre || s.local_origen_id}</div>
                  <div><span className="text-gray-500">Destino:</span> {localesMap[s.local_destino_id]?.nombre || s.local_destino_id}</div>
                  <div><span className="text-gray-500">Fecha:</span> {new Date(s.fecha_creacion).toLocaleString()}</div>
                </div>
                <ul className="text-sm text-gray-300 space-y-0.5">
                  {s.items.map(item => (
                    <li key={item.solicitud_item_id} className="flex gap-1">
                      <span>{productosMap[item.producto_id]?.nombre || item.producto_id}</span>
                      <span className="text-gray-400">x {item.cantidad_solicitada}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    className="bg-slate-600 text-primary px-3 py-1.5 rounded text-sm hover:bg-slate-500"
                    onClick={() => { handleDetalle(s); }}
                  >👁️ Ver</button>
                  <button
                    className="bg-slate-600 text-green-400 px-3 py-1.5 rounded text-sm hover:bg-slate-500"
                    onClick={() => handleVerPDF(s)}
                  >📄 PDF</button>
                  <button
                    className="bg-slate-600 text-blue-400 px-3 py-1.5 rounded text-sm hover:bg-slate-500"
                    onClick={(e) => handleShareClick(e, s)}
                  >📤 Compartir</button>
                  {user?.local_defecto_id === s.local_origen_id && estadosMap[s.estado_id]?.codigo === "PENDIENTE" && (
                    <button
                      className="bg-primary text-slate-900 font-semibold px-3 py-1.5 rounded text-sm hover:bg-primary-dark"
                      onClick={async () => {
                        await handleUpdate(s.solicitud_id, { estado_id: Object.values(estadosMap).find((e: any) => e.codigo === "EN_PROCESO")?.id });
                      }}
                    >Comenzar atención</button>
                  )}
                  {(
                    (user?.local_defecto_id === s.local_destino_id && estadosMap[s.estado_id]?.codigo === "PENDIENTE") ||
                    (user?.local_defecto_id === s.local_origen_id && estadosMap[s.estado_id]?.codigo === "EN_PROCESO")
                  ) && (
                    <button
                      onClick={() => handleEdit(s)}
                      className="text-primary hover:text-primary-dark font-medium text-sm px-3 py-1.5"
                    >Editar</button>
                  )}
                  <button
                    onClick={() => handleDelete(s.solicitud_id)}
                    className="text-red-400 hover:text-red-300 font-medium text-sm px-3 py-1.5"
                  >Eliminar</button>
                </div>
              </div>
            ))}
          </div>

          {/* Vista Desktop: Tabla */}
          <div className="hidden lg:block overflow-x-auto bg-slate-700 rounded-lg">
            <table className="min-w-full divide-y divide-slate-600">
              <thead className="bg-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Local Origen</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Local Destino</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Productos Solicitados</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-600">
                {solicitudesFiltradas.map((s) => (
                  <tr key={s.solicitud_id} className="hover:bg-slate-600/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">{s.solicitud_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {localesMap[s.local_origen_id]?.nombre || s.local_origen_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {localesMap[s.local_destino_id]?.nombre || s.local_destino_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      <ul className="list-disc ml-4">
                        {s.items.map(item => (
                          <li key={item.solicitud_item_id}>
                            {productosMap[item.producto_id]?.nombre || item.producto_id}
                            <span className="text-xs text-gray-400"> x {item.cantidad_solicitada}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {estadosMap[s.estado_id]?.nombre || s.estado_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(s.fecha_creacion).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                      <button
                        className="bg-slate-700 text-primary px-2 py-1 rounded text-xs mr-2 hover:bg-slate-600"
                        title="Ver detalle"
                        onClick={() => { handleDetalle(s); }}
                      >
                        <span role="img" aria-label="ver">👁️</span>
                      </button>
                      <button
                        className="bg-slate-700 text-green-400 px-2 py-1 rounded text-xs mr-2 hover:bg-slate-600"
                        title="Ver PDF"
                        onClick={() => handleVerPDF(s)}
                      >
                        <span role="img" aria-label="pdf">📄</span>
                      </button>
                      <button
                        className="bg-slate-700 text-blue-400 px-2 py-1 rounded text-xs mr-2 hover:bg-slate-600"
                        title="Compartir PDF"
                        onClick={(e) => handleShareClick(e, s)}
                      >
                        <span role="img" aria-label="compartir">📤</span>
                      </button>
                      {user?.local_defecto_id === s.local_origen_id && estadosMap[s.estado_id]?.codigo === "PENDIENTE" && (
                        <button
                          className="bg-primary text-slate-900 font-semibold px-3 py-1 rounded hover:bg-primary-dark mr-2"
                          onClick={async () => {
                            await handleUpdate(s.solicitud_id, { estado_id: Object.values(estadosMap).find((e: any) => e.codigo === "EN_PROCESO")?.id });
                          }}
                        >
                          Comenzar atención
                        </button>
                      )}
                      {(
                        (user?.local_defecto_id === s.local_destino_id && estadosMap[s.estado_id]?.codigo === "PENDIENTE") ||
                        (user?.local_defecto_id === s.local_origen_id && estadosMap[s.estado_id]?.codigo === "EN_PROCESO")
                      ) && (
                        <button
                          onClick={() => handleEdit(s)}
                          className="text-primary hover:text-primary-dark font-medium"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(s.solicitud_id)}
                        className="text-red-400 hover:text-red-300 font-medium"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal de edición */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full shadow-xl border border-slate-700 relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => { setModalOpen(false); setEditing(null); }}>✕</button>
            <h2 className="text-xl font-bold text-white mb-4">
              {editing ? 'Editar Solicitud' : 'Nueva Solicitud'}
            </h2>
            <SolicitudForm
              solicitud={editing}
              onSubmit={editing ? (data) => handleUpdate(editing.solicitud_id, data) : handleCreate}
              onCancel={() => { setModalOpen(false); setEditing(null); }}
            />
          </div>
        </div>
      )}
      {/* Modal de detalle solo lectura */}
      {detalleOpen && editing && (
        <SolicitudDetalleModal
          solicitud={editing}
          localesMap={localesMap}
          productosMap={productosMap}
          estadosMap={estadosMap}
          onClose={() => { setDetalleOpen(false); setEditing(null); fetchSolicitudes(); }}
          onRecibir={() => fetchSolicitudes()}
        />
      )}

      {/* Modal compartir */}
      {shareModalSolicitud && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShareModalSolicitud(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-xs p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-white font-semibold text-lg">Compartir Solicitud #{shareModalSolicitud.solicitud_id}</h3>
              <button className="text-gray-400 hover:text-white text-xl" onClick={() => setShareModalSolicitud(null)}>✕</button>
            </div>
            <p className="text-gray-400 text-sm mb-5">Se enviará un mensaje notificando que hay una solicitud pendiente de gestión.</p>
            <div className="space-y-3">
              <button
                className="flex items-center gap-3 w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-3 rounded-lg transition-colors"
                onClick={() => { setShareModalSolicitud(null); handleShareTo(shareModalSolicitud, 'whatsapp'); }}
              >
                <span className="text-xl">💬</span> WhatsApp
              </button>
              <button
                className="flex items-center gap-3 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-3 rounded-lg transition-colors"
                onClick={() => { setShareModalSolicitud(null); handleShareTo(shareModalSolicitud, 'telegram'); }}
              >
                <span className="text-xl">✈️</span> Telegram
              </button>
              <button
                className="flex items-center gap-3 w-full bg-slate-600 hover:bg-slate-500 text-white font-semibold px-4 py-3 rounded-lg transition-colors"
                onClick={() => { setShareModalSolicitud(null); handleShareTo(shareModalSolicitud, 'email'); }}
              >
                <span className="text-xl">📧</span> Correo electrónico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal preview PDF */}
      {pdfModalUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-700">
              <span className="text-white font-semibold">Solicitud #{pdfModalSolicitudId}</span>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="bg-primary text-slate-900 font-semibold px-4 py-1.5 rounded text-sm hover:bg-primary-dark"
                >
                  Descargar
                </button>
                <button
                  onClick={handleClosePdfModal}
                  className="text-gray-400 hover:text-white text-xl leading-none px-2"
                >
                  ✕
                </button>
              </div>
            </div>
            <iframe src={pdfModalUrl} className="flex-1 w-full rounded-b-lg" />
          </div>
        </div>
      )}
    </div>
  );
}

// Componente auxiliar para mostrar productos solicitados con stock
import { useStockProductosLocal } from "./useStockProductosLocal";

function ProductosSolicitadosConStock({ items, localOrigenId, productosMap }: { items: any[], localOrigenId: number, productosMap: Record<number, { id: number; nombre: string }> }) {
  const stockMap = useStockProductosLocal(items, localOrigenId);
  return (
    <ul className="list-disc ml-4">
      {items?.map((item) => (
        <li key={item.solicitud_item_id}>
          {productosMap[item.producto_id]?.nombre || item.producto_id}
          <span className="text-xs text-gray-400"> x {item.cantidad_solicitada}</span>
          {typeof stockMap[item.producto_id] === 'number' && (
            <span className="ml-2 text-xs text-blue-300">[Stock: {stockMap[item.producto_id]}]</span>
          )}
        </li>
      ))}
    </ul>
  );
}
