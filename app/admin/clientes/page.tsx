'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getClientes, deleteCliente, type Cliente } from '@/lib/api/clientes';

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const data = await getClientes();
      setClientes(data);
    } catch (err) {
      setError('Error al cargar clientes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar al cliente "${nombre}"?`)) {
      return;
    }

    try {
      await deleteCliente(id);
      setClientes(clientes.filter(c => c.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error al eliminar cliente');
    }
  };

  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.apellido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefono?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-400 mt-4">Cargando clientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Gestión de Clientes</h1>
        <button
          onClick={() => router.push('/admin/clientes/nuevo')}
          className="bg-primary hover:bg-primary-light text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          + Nuevo Cliente
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Buscador */}
      <div className="bg-slate-800 rounded-lg p-4">
        <input
          type="text"
          placeholder="Buscar por nombre, email o teléfono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Total Clientes</p>
          <p className="text-2xl font-bold text-white">{clientes.length}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Con Email</p>
          <p className="text-2xl font-bold text-blue-500">
            {clientes.filter(c => c.email).length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Con Teléfono</p>
          <p className="text-2xl font-bold text-green-500">
            {clientes.filter(c => c.telefono).length}
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        {clientesFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Teléfono</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Comuna</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-300 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-gray-400">#{cliente.id}</td>
                    <td className="px-6 py-4">
                      <div className="text-white font-semibold">
                        {cliente.nombre} {cliente.apellido}
                      </div>
                      {cliente.direccion && (
                        <div className="text-xs text-gray-400">{cliente.direccion}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {cliente.email || <span className="text-gray-500">-</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {cliente.telefono || <span className="text-gray-500">-</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {cliente.comuna || <span className="text-gray-500">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => router.push(`/admin/clientes/${cliente.id}`)}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(cliente.id, `${cliente.nombre} ${cliente.apellido || ''}`)}
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
      </div>
    </div>
  );
}
