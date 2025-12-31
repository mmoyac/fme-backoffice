'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createCliente, updateCliente, getCliente, type ClienteCreate, type Cliente } from '@/lib/api/clientes';

export default function ClienteFormPage({ params }: { params?: { id?: string } }) {
  const router = useRouter();
  const isEdit = !!params?.id;
  const [loading, setLoading] = useState(isEdit);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [clienteOriginal, setClienteOriginal] = useState<Cliente | null>(null);

  const [formData, setFormData] = useState<ClienteCreate>({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    direccion: '',
    comuna: '',
    limite_credito: 0
  });

  useEffect(() => {
    if (isEdit && params?.id) {
      cargarCliente(Number(params.id));
    }
  }, [isEdit, params?.id]);

  const cargarCliente = async (id: number) => {
    try {
      setLoading(true);
      const data = await getCliente(id);
      setClienteOriginal(data);
      setFormData({
        nombre: data.nombre,
        apellido: data.apellido || '',
        email: data.email || '',
        telefono: data.telefono || '',
        direccion: data.direccion || '',
        comuna: data.comuna || '',
        limite_credito: data.limite_credito || 0
      });
    } catch (err) {
      setError('Error al cargar el cliente');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    try {
      setGuardando(true);
      if (isEdit && params?.id) {
        await updateCliente(Number(params.id), formData);
      } else {
        await createCliente(formData);
      }
      router.push('/admin/clientes');
    } catch (err: any) {
      setError(err.message || `Error al ${isEdit ? 'actualizar' : 'crear'} el cliente`);
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-400 mt-4">Cargando...</p>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-white">
          {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h1>
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

        {/* Información de Crédito */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-lg font-medium text-white mb-3">Información de Crédito</h3>
          
          {isEdit && clienteOriginal && (
            <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Estado Actual</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Límite Actual</p>
                  <p className="text-white font-semibold">
                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })
                      .format(clienteOriginal.limite_credito || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Crédito Usado</p>
                  <p className="text-orange-400 font-semibold">
                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })
                      .format(clienteOriginal.credito_usado || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Disponible</p>
                  <p className="text-green-400 font-semibold">
                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })
                      .format((clienteOriginal.limite_credito || 0) - (clienteOriginal.credito_usado || 0))}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {isEdit ? 'Nuevo ' : ''}Límite de Crédito (CLP)
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
              {isEdit 
                ? 'Modificar el límite de crédito afectará los pedidos futuros' 
                : 'Deja en 0 si no deseas otorgar crédito a este cliente'
              }
            </div>
          </div>
        </div>

        {/* Información de Puntos */}
        {isEdit && clienteOriginal && (
          <div className="border-t border-slate-700 pt-4">
            <h3 className="text-lg font-medium text-white mb-3">Sistema de Puntos</h3>
            
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Puntos Acumulados</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Puntos Disponibles</p>
                  <p className="text-yellow-400 font-bold text-lg">
                    💰 {clienteOriginal.puntos_disponibles || 0}
                  </p>
                  <p className="text-xs text-gray-500">
                    Valor: ${clienteOriginal.puntos_disponibles || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Total Ganados</p>
                  <p className="text-green-400 font-semibold">
                    {clienteOriginal.puntos_totales_ganados || 0} pts
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Total Usados</p>
                  <p className="text-red-400 font-semibold">
                    {clienteOriginal.puntos_totales_usados || 0} pts
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Porcentaje Uso</p>
                  <p className="text-blue-400 font-semibold">
                    {clienteOriginal.puntos_totales_ganados && clienteOriginal.puntos_totales_ganados > 0 
                      ? Math.round(((clienteOriginal.puntos_totales_usados || 0) / clienteOriginal.puntos_totales_ganados) * 100)
                      : 0
                    }%
                  </p>
                </div>
              </div>
              
              {(!clienteOriginal.puntos_disponibles || clienteOriginal.puntos_disponibles === 0) && (
                <div className="mt-3 p-3 bg-slate-600/50 rounded-lg">
                  <p className="text-gray-400 text-sm">
                    📝 Este cliente aún no ha acumulado puntos. Los puntos se ganan automáticamente con cada pedido confirmado.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : (isEdit ? 'Actualizar Cliente' : 'Crear Cliente')}
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
