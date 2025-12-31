'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCliente, type ClienteCreate } from '@/lib/api/clientes';

export default function NuevoClientePage() {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<ClienteCreate>({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    direccion: '',
    comuna: '',
    limite_credito: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    try {
      setGuardando(true);
      await createCliente(formData);
      router.push('/admin/clientes');
    } catch (err: any) {
      setError(err.message || 'Error al crear el cliente');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => router.push('/admin/clientes')}
          className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Clientes
        </button>
        <h1 className="text-3xl font-bold text-white">Nuevo Cliente</h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-6 space-y-4">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nombre *
          </label>
          <input
            type="text"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        {/* Apellido */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Apellido
          </label>
          <input
            type="text"
            value={formData.apellido}
            onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
            className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Teléfono
          </label>
          <input
            type="tel"
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
            placeholder="+56 9 1234 5678"
          />
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Dirección
          </label>
          <input
            type="text"
            value={formData.direccion}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Comuna */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Comuna
          </label>
          <input
            type="text"
            value={formData.comuna}
            onChange={(e) => setFormData({ ...formData, comuna: e.target.value })}
            className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Límite de Crédito */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-lg font-medium text-white mb-3">Información de Crédito</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Límite de Crédito (CLP)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.limite_credito || ''}
              onChange={(e) => setFormData({ ...formData, limite_credito: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
              placeholder="0"
            />
            <div className="mt-1 text-xs text-gray-400">
              Deja en 0 si no deseas otorgar crédito a este cliente
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {guardando ? 'Creando...' : 'Crear Cliente'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/clientes')}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
