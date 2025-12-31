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

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  const calcularCreditoDisponible = (limite?: number, usado?: number) => {
    return (limite || 0) - (usado || 0);
  };

  const calcularPorcentajeUso = (limite?: number, usado?: number) => {
    if (!limite || limite <= 0) return 0;
    return ((usado || 0) / limite) * 100;
  };

  const calcularEstadisticasPuntos = () => {
    const totalPuntosDisponibles = clientes.reduce((sum, c) => sum + (c.puntos_disponibles || 0), 0);
    const totalPuntosGanados = clientes.reduce((sum, c) => sum + (c.puntos_totales_ganados || 0), 0);
    const clientesConPuntos = clientes.filter(c => c.puntos_disponibles && c.puntos_disponibles > 0).length;
    
    return {
      totalPuntosDisponibles,
      totalPuntosGanados,
      clientesConPuntos,
      valorTotalDisponible: totalPuntosDisponibles // $1 por punto
    };
  };

  const estadisticasPuntos = calcularEstadisticasPuntos();

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
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/clientes/credito/reportes')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Reportes de Crédito
          </button>
          <button
            onClick={() => router.push('/admin/clientes/nuevo')}
            className="bg-primary hover:bg-primary-light text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            + Nuevo Cliente
          </button>
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Con Crédito</p>
          <p className="text-2xl font-bold text-blue-500">
            {clientes.filter(c => c.limite_credito && c.limite_credito > 0).length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Con Puntos</p>
          <p className="text-2xl font-bold text-yellow-500">
            {estadisticasPuntos.clientesConPuntos}
          </p>
          <p className="text-xs text-gray-400">
            {estadisticasPuntos.totalPuntosDisponibles} pts total
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Valor Puntos</p>
          <p className="text-2xl font-bold text-yellow-400">
            ${estadisticasPuntos.valorTotalDisponible.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">
            disponibles
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 md:col-span-2">
          <p className="text-sm text-gray-400">Cerca del Límite</p>
          <p className="text-2xl font-bold text-red-500">
            {clientes.filter(c => {
              const porcentaje = calcularPorcentajeUso(c.limite_credito, c.credito_usado);
              return porcentaje > 80;
            }).length}
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Crédito</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Puntos</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-300 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {clientesFiltrados.map((cliente) => {
                  const creditoDisponible = calcularCreditoDisponible(cliente.limite_credito, cliente.credito_usado);
                  const porcentajeUso = calcularPorcentajeUso(cliente.limite_credito, cliente.credito_usado);
                  const alertaCerca = porcentajeUso > 80;

                  return (
                    <tr key={cliente.id} className={`hover:bg-slate-700/50 transition-colors ${alertaCerca ? 'bg-red-900/20' : ''}`}>
                      <td className="px-6 py-4 text-gray-400">#{cliente.id}</td>
                      <td className="px-6 py-4">
                        <div className="text-white font-semibold">
                          {cliente.nombre} {cliente.apellido}
                          {alertaCerca && (
                            <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                              ⚠️ Cerca del límite
                            </span>
                          )}
                        </div>
                        {cliente.direccion && (
                          <div className="text-xs text-gray-400">{cliente.direccion}</div>
                        )}
                        {cliente.comuna && (
                          <div className="text-xs text-gray-500">{cliente.comuna}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {cliente.email || <span className="text-gray-500">-</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {cliente.telefono || <span className="text-gray-500">-</span>}
                      </td>
                      <td className="px-6 py-4">
                        {cliente.limite_credito && cliente.limite_credito > 0 ? (
                          <div className="space-y-1">
                            <div className="text-sm text-white">
                              Límite: {formatCurrency(cliente.limite_credito)}
                            </div>
                            <div className="text-xs text-gray-400">
                              Usado: {formatCurrency(cliente.credito_usado)} ({porcentajeUso.toFixed(1)}%)
                            </div>
                            <div className="text-xs text-green-400">
                              Disponible: {formatCurrency(creditoDisponible)}
                            </div>
                            {/* Barra de progreso */}
                            <div className="w-20 bg-gray-600 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${alertaCerca ? 'bg-red-500' : porcentajeUso > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(100, porcentajeUso)}%` }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">Sin crédito</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {cliente.puntos_disponibles !== undefined && cliente.puntos_disponibles > 0 ? (
                          <div className="space-y-1">
                            <div className="text-sm text-yellow-400 font-semibold">
                              💰 {cliente.puntos_disponibles} pts
                            </div>
                            <div className="text-xs text-gray-400">
                              Valor: ${cliente.puntos_disponibles || 0}
                            </div>
                            <div className="text-xs text-green-400">
                              Total ganados: {cliente.puntos_totales_ganados || 0}
                            </div>
                            {cliente.puntos_totales_usados && cliente.puntos_totales_usados > 0 && (
                              <div className="text-xs text-gray-500">
                                Usados: {cliente.puntos_totales_usados}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">Sin puntos</span>
                        )}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
