
"use client";

import { useState, useEffect } from "react";
import {
  getPaletasColores,
  createPaletaColor,
  updatePaletaColor,
  deletePaletaColor,
  PaletaColor,
} from "@/lib/api/paletas_colores_fetch";

const initialForm: Partial<PaletaColor> = {
  nombre: "",
  descripcion: "",
  primario: "#5ec8f2",
  primario_light: "#aeebfa",
  primario_dark: "#2b7a9b",
  secundario: "#45a29a",
  secundario_light: "#7fe3d6",
  secundario_dark: "#2b5c54",
  acento: "#FFD700",
  fondo_hero_inicio: "#1E293B",
  fondo_hero_fin: "#0F172A",
  fondo_seccion: "#334155",
  es_publica: true
};

export default function PaletasColoresList() {
  const [paletas, setPaletas] = useState<PaletaColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<PaletaColor>>(initialForm);

  useEffect(() => {
    fetchPaletas();
  }, []);

  const fetchPaletas = async () => {
    try {
      const data = await getPaletasColores();
      setPaletas(data);
    } catch (error) {
      console.error("Error cargando paletas:", error);
    } finally {
      setLoading(false);
    }
  };

  function openCreateModal() {
    setEditingId(null);
    setFormData(initialForm);
    setModalOpen(true);
  }

  function openEditModal(paleta: PaletaColor) {
    setEditingId(paleta.id);
    setFormData({
      nombre: paleta.nombre,
      descripcion: paleta.descripcion || "",
      primario: paleta.primario,
      primario_light: paleta.primario_light || "",
      primario_dark: paleta.primario_dark || "",
      secundario: paleta.secundario,
      secundario_light: paleta.secundario_light || "",
      secundario_dark: paleta.secundario_dark || "",
      acento: paleta.acento || "",
      fondo_hero_inicio: paleta.fondo_hero_inicio || "",
      fondo_hero_fin: paleta.fondo_hero_fin || "",
      fondo_seccion: paleta.fondo_seccion || "",
      es_publica: paleta.es_publica
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      // Validar y forzar que los campos requeridos sean string
      const safeFormData = {
        ...formData,
        nombre: formData.nombre ?? "",
        primario: formData.primario ?? "",
        secundario: formData.secundario ?? "",
      };
      if (editingId) {
        await updatePaletaColor(editingId, safeFormData);
      } else {
        await createPaletaColor(safeFormData);
      }
      await fetchPaletas();
      setModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Error al guardar paleta de colores");
    }
  }

  async function handleDelete(id: number, nombre: string) {
    if (!confirm(`¿Está seguro de eliminar la paleta "${nombre}"?`)) {
      return;
    }

    try {
      await deletePaletaColor(id);
      await fetchPaletas();
    } catch (err: any) {
      alert(err.message || "Error al eliminar paleta de colores");
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
          + Nueva Paleta
        </button>
      </div>

      {paletas.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No hay paletas de colores registradas
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-700 rounded-lg">
          <table className="min-w-full divide-y divide-slate-600">
            <thead className="bg-slate-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Primario</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Secundario</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Acento</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600">
              {paletas.map((paleta) => (
                <tr key={paleta.id} className="hover:bg-slate-600/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{paleta.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{paleta.descripcion || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className="inline-block w-6 h-6 rounded border border-slate-500"
                        style={{ background: paleta.primario }}
                        title={`Primario: ${paleta.primario}`}
                      />
                      {paleta.primario_light && (
                        <span
                          className="inline-block w-6 h-6 rounded border border-slate-500"
                          style={{ background: paleta.primario_light }}
                          title={`Light: ${paleta.primario_light}`}
                        />
                      )}
                      {paleta.primario_dark && (
                        <span
                          className="inline-block w-6 h-6 rounded border border-slate-500"
                          style={{ background: paleta.primario_dark }}
                          title={`Dark: ${paleta.primario_dark}`}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className="inline-block w-6 h-6 rounded border border-slate-500"
                        style={{ background: paleta.secundario }}
                        title={`Secundario: ${paleta.secundario}`}
                      />
                      {paleta.secundario_light && (
                        <span
                          className="inline-block w-6 h-6 rounded border border-slate-500"
                          style={{ background: paleta.secundario_light }}
                          title={`Light: ${paleta.secundario_light}`}
                        />
                      )}
                      {paleta.secundario_dark && (
                        <span
                          className="inline-block w-6 h-6 rounded border border-slate-500"
                          style={{ background: paleta.secundario_dark }}
                          title={`Dark: ${paleta.secundario_dark}`}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {paleta.acento && (
                      <span
                        className="inline-block w-6 h-6 rounded border border-slate-500"
                        style={{ background: paleta.acento }}
                        title={`Acento: ${paleta.acento}`}
                      />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    <button
                      onClick={() => openEditModal(paleta)}
                      className="text-primary hover:text-primary-dark font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(paleta.id, paleta.nombre)}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full shadow-xl border border-slate-700 my-8">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingId ? "Editar Paleta de Colores" : "Nueva Paleta de Colores"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <input
                    type="text"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  />
                </div>
              </div>

              {/* Colores Primarios */}
              <div className="border-t border-slate-600 pt-4">
                <h3 className="text-lg font-semibold text-white mb-3">🎨 Colores Primarios</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Primario *</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        className="w-12 h-10 rounded border-2 border-slate-600 cursor-pointer"
                        value={formData.primario}
                        onChange={(e) => setFormData({ ...formData, primario: e.target.value })}
                      />
                      <input
                        type="text"
                        required
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
                        value={formData.primario}
                        onChange={(e) => setFormData({ ...formData, primario: e.target.value })}
                        pattern="^#[0-9A-Fa-f]{6}$"
                        placeholder="#5ec8f2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Primario Light</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        className="w-12 h-10 rounded border-2 border-slate-600 cursor-pointer"
                        value={formData.primario_light || "#aeebfa"}
                        onChange={(e) => setFormData({ ...formData, primario_light: e.target.value })}
                      />
                      <input
                        type="text"
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
                        value={formData.primario_light || ""}
                        onChange={(e) => setFormData({ ...formData, primario_light: e.target.value })}
                        pattern="^#[0-9A-Fa-f]{6}$"
                        placeholder="#aeebfa"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Primario Dark</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        className="w-12 h-10 rounded border-2 border-slate-600 cursor-pointer"
                        value={formData.primario_dark || "#2b7a9b"}
                        onChange={(e) => setFormData({ ...formData, primario_dark: e.target.value })}
                      />
                      <input
                        type="text"
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
                        value={formData.primario_dark || ""}
                        onChange={(e) => setFormData({ ...formData, primario_dark: e.target.value })}
                        pattern="^#[0-9A-Fa-f]{6}$"
                        placeholder="#2b7a9b"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Colores Secundarios */}
              <div className="border-t border-slate-600 pt-4">
                <h3 className="text-lg font-semibold text-white mb-3">🎨 Colores Secundarios</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Secundario *</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        className="w-12 h-10 rounded border-2 border-slate-600 cursor-pointer"
                        value={formData.secundario}
                        onChange={(e) => setFormData({ ...formData, secundario: e.target.value })}
                      />
                      <input
                        type="text"
                        required
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
                        value={formData.secundario}
                        onChange={(e) => setFormData({ ...formData, secundario: e.target.value })}
                        pattern="^#[0-9A-Fa-f]{6}$"
                        placeholder="#45a29a"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Secundario Light</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        className="w-12 h-10 rounded border-2 border-slate-600 cursor-pointer"
                        value={formData.secundario_light || "#7fe3d6"}
                        onChange={(e) => setFormData({ ...formData, secundario_light: e.target.value })}
                      />
                      <input
                        type="text"
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
                        value={formData.secundario_light || ""}
                        onChange={(e) => setFormData({ ...formData, secundario_light: e.target.value })}
                        pattern="^#[0-9A-Fa-f]{6}$"
                        placeholder="#7fe3d6"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Secundario Dark</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        className="w-12 h-10 rounded border-2 border-slate-600 cursor-pointer"
                        value={formData.secundario_dark || "#2b5c54"}
                        onChange={(e) => setFormData({ ...formData, secundario_dark: e.target.value })}
                      />
                      <input
                        type="text"
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
                        value={formData.secundario_dark || ""}
                        onChange={(e) => setFormData({ ...formData, secundario_dark: e.target.value })}
                        pattern="^#[0-9A-Fa-f]{6}$"
                        placeholder="#2b5c54"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Colores de Fondo y Acento */}
              <div className="border-t border-slate-600 pt-4">
                <h3 className="text-lg font-semibold text-white mb-3">🎨 Colores de Fondo y Acento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Acento</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        className="w-12 h-10 rounded border-2 border-slate-600 cursor-pointer"
                        value={formData.acento || "#FFD700"}
                        onChange={(e) => setFormData({ ...formData, acento: e.target.value })}
                      />
                      <input
                        type="text"
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
                        value={formData.acento || ""}
                        onChange={(e) => setFormData({ ...formData, acento: e.target.value })}
                        pattern="^#[0-9A-Fa-f]{6}$"
                        placeholder="#FFD700"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Fondo Sección</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        className="w-12 h-10 rounded border-2 border-slate-600 cursor-pointer"
                        value={formData.fondo_seccion || "#334155"}
                        onChange={(e) => setFormData({ ...formData, fondo_seccion: e.target.value })}
                      />
                      <input
                        type="text"
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
                        value={formData.fondo_seccion || ""}
                        onChange={(e) => setFormData({ ...formData, fondo_seccion: e.target.value })}
                        pattern="^#[0-9A-Fa-f]{6}$"
                        placeholder="#334155"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Fondo Hero Inicio</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        className="w-12 h-10 rounded border-2 border-slate-600 cursor-pointer"
                        value={formData.fondo_hero_inicio || "#1E293B"}
                        onChange={(e) => setFormData({ ...formData, fondo_hero_inicio: e.target.value })}
                      />
                      <input
                        type="text"
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
                        value={formData.fondo_hero_inicio || ""}
                        onChange={(e) => setFormData({ ...formData, fondo_hero_inicio: e.target.value })}
                        pattern="^#[0-9A-Fa-f]{6}$"
                        placeholder="#1E293B"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Fondo Hero Fin</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        className="w-12 h-10 rounded border-2 border-slate-600 cursor-pointer"
                        value={formData.fondo_hero_fin || "#0F172A"}
                        onChange={(e) => setFormData({ ...formData, fondo_hero_fin: e.target.value })}
                      />
                      <input
                        type="text"
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
                        value={formData.fondo_hero_fin || ""}
                        onChange={(e) => setFormData({ ...formData, fondo_hero_fin: e.target.value })}
                        pattern="^#[0-9A-Fa-f]{6}$"
                        placeholder="#0F172A"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-600">
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
