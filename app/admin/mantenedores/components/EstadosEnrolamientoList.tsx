import { useEffect, useState } from "react";
import {
  getEstadosEnrolamiento,
  createEstadoEnrolamiento,
  updateEstadoEnrolamiento,
  deleteEstadoEnrolamiento,
  type EstadoEnrolamiento
} from "@/lib/api/recepcion";

export default function EstadosEnrolamientoList() {
  const [estados, setEstados] = useState<EstadoEnrolamiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<EstadoEnrolamiento>>({
    codigo: "",
    nombre: "",
    descripcion: "",
    activo: true
  });

  useEffect(() => {
    fetchEstados();
  }, []);

  const fetchEstados = async () => {
    try {
      const data = await getEstadosEnrolamiento();
      setEstados(data);
    } catch (error) {
      console.error("Error cargando estados de enrolamiento:", error);
    } finally {
      setLoading(false);
    }
  };

  function openCreateModal() {
    setEditingId(null);
    setFormData({ codigo: "", nombre: "", descripcion: "", activo: true });
    setModalOpen(true);
  }

  function openEditModal(estado: EstadoEnrolamiento) {
    setEditingId(estado.id);
    setFormData({
      codigo: estado.codigo,
      nombre: estado.nombre,
      descripcion: estado.descripcion || "",
      activo: estado.activo
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await updateEstadoEnrolamiento(editingId, formData);
      } else {
        await createEstadoEnrolamiento(formData);
      }
      await fetchEstados();
      setModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Error al guardar estado de enrolamiento");
    }
  }

  async function handleDelete(id: number, nombre: string) {
    if (!confirm(`¿Está seguro de eliminar el estado "${nombre}"?`)) {
      return;
    }
    try {
      await deleteEstadoEnrolamiento(id);
      await fetchEstados();
    } catch (err: any) {
      alert(err.message || "Error al eliminar estado de enrolamiento");
    }
  }

  if (loading) {
    return <div className="text-center py-4 text-gray-400">Cargando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openCreateModal}
          className="bg-primary hover:bg-primary-dark text-slate-900 px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          + Nuevo Estado de Enrolamiento
        </button>
      </div>

      {estados.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No hay estados de enrolamiento registrados
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-700 rounded-lg">
          <table className="min-w-full divide-y divide-slate-600">
            <thead className="bg-slate-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600">
              {estados.map((estado) => (
                <tr key={estado.id} className="hover:bg-slate-600/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{estado.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{estado.descripcion || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${estado.activo ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"}`}>
                      {estado.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    <button
                      onClick={() => openEditModal(estado)}
                      className="text-primary hover:text-primary-dark font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(estado.id, estado.nombre)}
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
          <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingId ? "Editar Estado de Enrolamiento" : "Nuevo Estado de Enrolamiento"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Código *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
                <textarea
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo-estado-enrolamiento"
                  className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded focus:ring-primary focus:ring-2"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                />
                <label htmlFor="activo-estado-enrolamiento" className="text-sm font-medium text-gray-300 cursor-pointer">Activo</label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded text-gray-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-primary hover:bg-primary-dark text-slate-900 font-semibold"
                >
                  {editingId ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
