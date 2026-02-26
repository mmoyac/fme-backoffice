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
import { useLocalesMap } from "./useLocalesMap";
import { useEstadosEnrolamientoMap } from "./useEstadosEnrolamientoMap";
import { useProductosMap } from "./useProductosMap";

export default function SolicitudesTable() {
  const [solicitudes, setSolicitudes] = useState<SolicitudTransferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SolicitudTransferencia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const localesMap = useLocalesMap();
  const estadosMap = useEstadosEnrolamientoMap();
  const productosMap = useProductosMap();

  useEffect(() => {
    fetchSolicitudes();
  }, []);

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

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Eliminar esta solicitud?")) return;
    try {
      await deleteSolicitud(id);
      fetchSolicitudes();
    } catch (e) {
      setError("Error al eliminar solicitud");
    }
  };

  return (
    <div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Solicitudes</h1>
        <div className="flex gap-3">
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
      ) : solicitudes.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No hay solicitudes registradas</div>
      ) : (
        <div className="overflow-x-auto bg-slate-700 rounded-lg">
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
              {solicitudes.map((s) => (
                <tr key={s.solicitud_id} className="hover:bg-slate-600/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">{s.solicitud_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {localesMap[s.local_origen_id]?.nombre || s.local_origen_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {localesMap[s.local_destino_id]?.nombre || s.local_destino_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <ProductosSolicitadosConStock items={s.items} localOrigenId={s.local_origen_id} productosMap={productosMap} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {estadosMap[s.estado_id]?.nombre || s.estado_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(s.fecha_creacion).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(s)}
                      className="text-primary hover:text-primary-dark font-medium"
                    >
                      Editar
                    </button>
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
      )}

      {/* Modal */}
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
