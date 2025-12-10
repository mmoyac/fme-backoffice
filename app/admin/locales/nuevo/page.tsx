'use client';

import { useState, FormEvent } from 'react';
import { createLocal, type LocalCreate } from '@/lib/api/locales';
import { useRouter } from 'next/navigation';

export default function NuevoLocalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LocalCreate>({
    nombre: '',
    direccion: '',
    activo: true
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await createLocal(formData);
      alert('Local creado exitosamente');
      router.push('/admin/locales');
    } catch (err) {
      alert('Error al crear local');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-white mb-6">Nuevo Local</h1>

      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nombre *
          </label>
          <input
            type="text"
            required
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
            placeholder="Ej: Estación Central"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Dirección
          </label>
          <input
            type="text"
            value={formData.direccion || ''}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
            placeholder="Ej: Av. Libertador Bernardo O'Higgins 3322"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="activo"
            checked={formData.activo}
            onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
            className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded focus:ring-primary"
          />
          <label htmlFor="activo" className="text-sm text-gray-300">
            Local activo
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Crear Local'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
