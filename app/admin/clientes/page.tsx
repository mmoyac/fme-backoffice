'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getClientes, deleteCliente, type Cliente } from '@/lib/api/clientes';
import type { LocalCliente } from '@/lib/api/localesCliente';
import { getLocalesCliente, createLocalCliente, updateLocalCliente, deleteLocalCliente, type LocalClienteCreate, type LocalClienteUpdate } from '@/lib/api/localesCliente';

function calcularCreditoDisponible(limite?: number, usado?: number): number {
  if (!limite) return 0;
  return Math.max(0, limite - (usado || 0));
}

function calcularPorcentajeUso(limite?: number, usado?: number): number {
  if (!limite || limite === 0) return 0;
  return ((usado || 0) / limite) * 100;
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '$0';
  return `$${value.toLocaleString('es-CL')}`;
}

export default function ClientesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [modalLocalesOpen, setModalLocalesOpen] = useState(false);
  const [clienteLocales, setClienteLocales] = useState<Cliente | null>(null);
  const [locales, setLocales] = useState<LocalCliente[]>([]);
  const [loadingLocales, setLoadingLocales] = useState(false);
  const [errorLocales, setErrorLocales] = useState('');
  const [editandoLocal, setEditandoLocal] = useState<LocalCliente | null>(null);
  const [formLocal, setFormLocal] = useState<Partial<LocalClienteCreate>>({});
  const [savingLocal, setSavingLocal] = useState(false);
  const [errorFormLocal, setErrorFormLocal] = useState('');

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const data = await getClientes();
      setClientes(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const clientesFiltrados = clientes.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.nombre?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.telefono?.toLowerCase().includes(term)
    );
  });

  const calcularEstadisticasPuntos = () => {
    const clientesConPuntos = clientes.filter(c => c.puntos_disponibles && c.puntos_disponibles > 0).length;
    const totalPuntosDisponibles = clientes.reduce((sum, c) => sum + (c.puntos_disponibles || 0), 0);
    return { clientesConPuntos, totalPuntosDisponibles, valorTotalDisponible: totalPuntosDisponibles };
  };

  const handleEliminar = async (id: number, nombre: string) => {
    if (!confirm(`Eliminar cliente "${nombre}"?`)) return;
    try {
      await deleteCliente(id);
      setClientes(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error al eliminar cliente');
    }
  };

  const recargarLocales = async (clienteId: number) => {
    setLoadingLocales(true);
    setErrorLocales('');
    try {
      const data = await getLocalesCliente(clienteId);
      setLocales(data);
    } catch (err: any) {
      setErrorLocales(err.message || 'Error al cargar locales');
    } finally {
      setLoadingLocales(false);
    }
  };

  const handleAbrirLocales = async (cliente: Cliente) => {
    setClienteLocales(cliente);
    setModalLocalesOpen(true);
    setFormLocal({});
    setEditandoLocal(null);
    setLoadingLocales(true);
    setErrorLocales('');
    try {
      const data = await getLocalesCliente(cliente.id);
      setLocales(data);
    } catch (err: any) {
      setErrorLocales(err.message || 'Error al cargar locales');
    } finally {
      setLoadingLocales(false);
    }
  };

  const handleCerrarLocales = () => {
    setModalLocalesOpen(false);
    setClienteLocales(null);
    setLocales([]);
    setFormLocal({});
    setEditandoLocal(null);
  };

  const handleNuevoLocal = () => {
    setEditandoLocal(null);
    setFormLocal({ nombre: '', direccion: '', telefono: '', email: '', activo: true });
  };

  const handleEditarLocal = (local: LocalCliente) => {
    setEditandoLocal(local);
    setFormLocal({
      nombre: local.nombre,
      direccion: local.direccion,
      telefono: local.telefono,
      email: local.email,
      activo: local.activo,
    });
  };

  const handleGuardarLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLocal.nombre || !formLocal.direccion) {
      setErrorFormLocal('Nombre y direccion son obligatorios');
      return;
    }
    setSavingLocal(true);
    setErrorFormLocal('');
    try {
      if (editandoLocal) {
        await updateLocalCliente(editandoLocal.id, formLocal as LocalClienteUpdate);
      } else if (clienteLocales) {
        await createLocalCliente(clienteLocales.id, formLocal as LocalClienteCreate);
      }
      setFormLocal({});
      setEditandoLocal(null);
      await recargarLocales(clienteLocales!.id);
    } catch (err: any) {
      setErrorFormLocal(err.message || 'Error al guardar local');
    } finally {
      setSavingLocal(false);
    }
  };

  const handleEliminarLocal = async (localId: number) => {
    if (!clienteLocales) return;
    if (!confirm('Eliminar este local?')) return;
    setSavingLocal(true);
    try {
      await deleteLocalCliente(localId);
      await recargarLocales(clienteLocales.id);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar local');
    } finally {
      setSavingLocal(false);
    }
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
        <h1 className="text-3xl font-bold text-white">Gestion de Clientes</h1>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/clientes/credito/reportes')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            Reportes de Credito
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

      <div className="bg-slate-800 rounded-lg p-4">
        <input
          type="text"
          placeholder="Buscar por nombre, email o telefono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Total Clientes</p>
          <p className="text-2xl font-bold text-white">{clientes.length}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Con Email</p>
          <p className="text-2xl font-bold text-blue-500">{clientes.filter(c => c.email).length}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Con Telefono</p>
          <p className="text-2xl font-bold text-green-500">{clientes.filter(c => c.telefono).length}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Con Credito</p>
          <p className="text-2xl font-bold text-blue-500">
            {clientes.filter(c => c.limite_credito && c.limite_credito > 0).length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Con Puntos</p>
          <p className="text-2xl font-bold text-yellow-500">{estadisticasPuntos.clientesConPuntos}</p>
          <p className="text-xs text-gray-400">{estadisticasPuntos.totalPuntosDisponibles} pts total</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">Valor Puntos</p>
          <p className="text-2xl font-bold text-yellow-400">
            ${estadisticasPuntos.valorTotalDisponible.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">disponibles</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 md:col-span-2">
          <p className="text-sm text-gray-400">Cerca del Limite</p>
          <p className="text-2xl font-bold text-red-500">
            {clientes.filter(c => calcularPorcentajeUso(c.limite_credito, c.credito_usado) > 80).length}
          </p>
        </div>
      </div>

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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Telefono</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Credito</th>
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
                              Cerca del limite
                            </span>
                          )}
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
                      <td className="px-6 py-4">
                        {cliente.limite_credito && cliente.limite_credito > 0 ? (
                          <div className="space-y-1">
                            <div className="text-sm text-white">
                              Limite: {formatCurrency(cliente.limite_credito)}
                            </div>
                            <div className="text-xs text-gray-400">
                              Usado: {formatCurrency(cliente.credito_usado)} ({porcentajeUso.toFixed(1)}%)
                            </div>
                            <div className="text-xs text-green-400">
                              Disponible: {formatCurrency(creditoDisponible)}
                            </div>
                            <div className="w-20 bg-gray-600 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${alertaCerca ? 'bg-red-500' : porcentajeUso > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(100, porcentajeUso)}%` }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">Sin credito</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {cliente.puntos_disponibles !== undefined && cliente.puntos_disponibles > 0 ? (
                          <div className="space-y-1">
                            <div className="text-sm text-yellow-400 font-semibold">
                              {cliente.puntos_disponibles} pts
                            </div>
                            <div className="text-xs text-green-400">
                              Total: {cliente.puntos_totales_ganados || 0}
                            </div>
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
                        <button
                          onClick={() => handleAbrirLocales(cliente)}
                          className="text-teal-400 hover:text-teal-300 font-medium"
                        >
                          Locales
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

      {modalLocalesOpen && clienteLocales && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-slate-900 rounded-lg shadow-lg p-8 w-full max-w-2xl relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl"
              onClick={handleCerrarLocales}
              title="Cerrar"
            >
              x
            </button>
            <h2 className="text-2xl font-bold text-white mb-4">Locales de {clienteLocales.nombre}</h2>
            {loadingLocales ? (
              <div className="text-center text-gray-400 py-8">Cargando locales...</div>
            ) : errorLocales ? (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-4">{errorLocales}</div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-white">Locales registrados</span>
                  <button
                    className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg font-medium"
                    onClick={handleNuevoLocal}
                  >
                    + Nuevo Local
                  </button>
                </div>

                {(editandoLocal !== null || formLocal.nombre !== undefined) && (
                  <form onSubmit={handleGuardarLocal} className="bg-slate-800 rounded-lg p-4 mb-4 space-y-3">
                    {errorFormLocal && (
                      <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg">{errorFormLocal}</div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-300 mb-1">Nombre *</label>
                        <input
                          type="text"
                          className="w-full bg-slate-700 text-white rounded-lg px-3 py-2"
                          value={formLocal.nombre || ''}
                          onChange={e => setFormLocal(f => ({ ...f, nombre: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1">Direccion *</label>
                        <input
                          type="text"
                          className="w-full bg-slate-700 text-white rounded-lg px-3 py-2"
                          value={formLocal.direccion || ''}
                          onChange={e => setFormLocal(f => ({ ...f, direccion: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1">Telefono</label>
                        <input
                          type="text"
                          className="w-full bg-slate-700 text-white rounded-lg px-3 py-2"
                          value={formLocal.telefono || ''}
                          onChange={e => setFormLocal(f => ({ ...f, telefono: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1">Email</label>
                        <input
                          type="email"
                          className="w-full bg-slate-700 text-white rounded-lg px-3 py-2"
                          value={formLocal.email || ''}
                          onChange={e => setFormLocal(f => ({ ...f, email: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          checked={formLocal.activo ?? true}
                          onChange={e => setFormLocal(f => ({ ...f, activo: e.target.checked }))}
                        />
                        <label className="text-gray-300">Activo</label>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="submit"
                        className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg font-medium"
                        disabled={savingLocal}
                      >
                        {editandoLocal ? 'Guardar cambios' : 'Crear local'}
                      </button>
                      <button
                        type="button"
                        className="bg-slate-700 hover:bg-slate-600 text-gray-300 px-4 py-2 rounded-lg font-medium"
                        onClick={() => { setEditandoLocal(null); setFormLocal({}); }}
                        disabled={savingLocal}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                {locales.length === 0 ? (
                  <div className="text-gray-400">No hay locales registrados para este cliente.</div>
                ) : (
                  <table className="w-full text-sm mt-2">
                    <thead>
                      <tr className="text-gray-400">
                        <th className="py-2 text-left">Nombre</th>
                        <th className="py-2 text-left">Direccion</th>
                        <th className="py-2 text-left">Telefono</th>
                        <th className="py-2 text-left">Email</th>
                        <th className="py-2 text-left">Activo</th>
                        <th className="py-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locales.map((local) => (
                        <tr key={local.id} className="border-b border-slate-800">
                          <td className="py-2 text-white font-semibold">{local.nombre}</td>
                          <td className="py-2 text-gray-300">{local.direccion}</td>
                          <td className="py-2 text-gray-300">{local.telefono || '-'}</td>
                          <td className="py-2 text-gray-300">{local.email || '-'}</td>
                          <td className="py-2 text-gray-300">{local.activo ? 'Si' : 'No'}</td>
                          <td className="py-2 text-right space-x-2">
                            <button
                              className="text-blue-400 hover:text-blue-300 font-medium"
                              onClick={() => handleEditarLocal(local)}
                              disabled={savingLocal}
                            >
                              Editar
                            </button>
                            <button
                              className="text-red-400 hover:text-red-300 font-medium"
                              onClick={() => handleEliminarLocal(local.id)}
                              disabled={savingLocal}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}