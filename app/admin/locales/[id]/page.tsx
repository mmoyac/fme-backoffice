'use client';

import { useState, useEffect, FormEvent } from 'react';
import { getLocal, updateLocal, type Local, type LocalUpdate } from '@/lib/api/locales';
import { useRouter } from 'next/navigation';

export default function EditarLocalPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState<Local | null>(null);
  const [formData, setFormData] = useState<LocalUpdate>({});

  useEffect(() => {
    loadLocal();
  }, [params.id]);

  async function loadLocal() {
    try {
      const data = await getLocal(Number(params.id));
      setLocal(data);
      setFormData({
        nombre: data.nombre,
        direccion: data.direccion,
        activo: data.activo
      });
    } catch (err) {
      alert('Error al cargar local');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      await updateLocal(Number(params.id), formData);
      alert('Local actualizado exitosamente');
      router.push('/admin/locales');
    } catch (err) {
      alert('Error al actualizar local');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-gray-400">Cargando...</div>;
  }

  if (!local) {
    return <div className="bg-red-900/20 border border-red-500 text-red-200 px-4 py-3 rounded">Local no encontrado</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-white mb-6">Editar Local</h1>

      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Código</label>
          <input
            type="text"
            value={local.codigo}
            disabled
            className="w-full bg-slate-600 text-gray-400 px-4 py-2 rounded-lg cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Nombre *</label>
          <input
            type="text"
            required
            value={formData.nombre || ''}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Dirección</label>
          <input
            type="text"
            value={formData.direccion || ''}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="activo"
            checked={formData.activo ?? true}
            onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
            className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded"
          />
          <label htmlFor="activo" className="text-sm text-gray-300">Local activo</label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button type="button" onClick={() => router.back()} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
