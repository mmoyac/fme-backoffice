'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/auth';
import {
  listarVehiculos,
  listarTiposVehiculo,
  crearVehiculo,
  actualizarVehiculo,
  desactivarVehiculo,
  type Vehiculo,
  type TipoVehiculo,
} from '@/lib/api/vehiculos';

const EMPTY_FORM = {
  patente: '',
  marca: '',
  modelo: '',
  anio: '',
  capacidad_kg: '',
  tipo_vehiculo_id: '',
};

export default function VehiculosPage() {
  const router = useRouter();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [soloActivos, setSoloActivos] = useState(true);

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Vehiculo | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [v, t] = await Promise.all([listarVehiculos(soloActivos), listarTiposVehiculo()]);
      setVehiculos(v);
      setTipos(t);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [soloActivos]);

  useEffect(() => {
    if (!AuthService.isAuthenticated()) { router.push('/login'); return; }
    cargar();
  }, [cargar]);

  const abrirCrear = () => {
    setEditando(null);
    setForm({ ...EMPTY_FORM });
    setErrorModal('');
    setModalAbierto(true);
  };

  const abrirEditar = (v: Vehiculo) => {
    setEditando(v);
    setForm({
      patente: v.patente,
      marca: v.marca ?? '',
      modelo: v.modelo ?? '',
      anio: v.anio?.toString() ?? '',
      capacidad_kg: v.capacidad_kg?.toString() ?? '',
      tipo_vehiculo_id: v.tipo_vehiculo_id?.toString() ?? '',
    });
    setErrorModal('');
    setModalAbierto(true);
  };

  const handleGuardar = async () => {
    if (!form.patente.trim()) { setErrorModal('La patente es requerida'); return; }
    if (!form.capacidad_kg || Number(form.capacidad_kg) <= 0) { setErrorModal('La capacidad en kg es requerida'); return; }
    setGuardando(true);
    setErrorModal('');
    const payload = {
      patente: form.patente.trim(),
      marca: form.marca || undefined,
      modelo: form.modelo || undefined,
      anio: form.anio ? Number(form.anio) : undefined,
      capacidad_kg: Number(form.capacidad_kg),
      tipo_vehiculo_id: form.tipo_vehiculo_id ? Number(form.tipo_vehiculo_id) : undefined,
    };
    try {
      if (editando) {
        await actualizarVehiculo(editando.id, payload);
      } else {
        await crearVehiculo(payload);
      }
      setModalAbierto(false);
      cargar();
    } catch (e: any) {
      setErrorModal(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleDesactivar = async (v: Vehiculo) => {
    if (!confirm(`¿Desactivar el vehículo ${v.patente}?`)) return;
    try {
      await desactivarVehiculo(v.id);
      cargar();
    } catch (e: any) { alert(e.message); }
  };

  const handleReactivar = async (v: Vehiculo) => {
    try {
      await actualizarVehiculo(v.id, { activo: true });
      cargar();
    } catch (e: any) { alert(e.message); }
  };

  const setField = (key: keyof typeof EMPTY_FORM, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Vehículos</h1>
          <p className="text-slate-400 text-sm">Flota disponible para hojas de ruta</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-slate-400 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={(e) => setSoloActivos(e.target.checked)}
              className="accent-cyan-500"
            />
            Solo activos
          </label>
          <button
            onClick={abrirCrear}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 rounded-lg text-sm"
          >
            + Nuevo Vehículo
          </button>
        </div>
      </div>

      {error && <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4">{error}</div>}

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400" />
        </div>
      ) : vehiculos.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <div className="text-5xl mb-3">🚚</div>
          <div className="text-lg">No hay vehículos registrados</div>
          <p className="text-sm mt-1">Agrega la flota para usarla en las hojas de ruta</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-400">
                <th className="py-3 px-3">Patente</th>
                <th className="py-3 px-3">Marca / Modelo</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Capacidad</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {vehiculos.map((v) => (
                <tr key={v.id} className={`hover:bg-slate-800/40 ${!v.activo ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-3 font-mono font-semibold text-white">{v.patente}</td>
                  <td className="py-3 px-3 text-slate-300">
                    {[v.marca, v.modelo, v.anio].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="py-3 px-3 text-slate-400">{v.tipo_vehiculo?.nombre ?? '—'}</td>
                  <td className="py-3 px-3">
                    {v.capacidad_kg
                      ? <span className="text-cyan-400 font-semibold">{v.capacidad_kg.toLocaleString('es-CL')} kg</span>
                      : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-xs border px-2 py-0.5 rounded-full ${
                      v.activo
                        ? 'bg-emerald-900/50 text-emerald-400 border-emerald-800'
                        : 'bg-slate-700 text-slate-500 border-slate-600'
                    }`}>
                      {v.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => abrirEditar(v)}
                        className="text-slate-400 hover:text-white text-xs border border-slate-600 px-2 py-1 rounded"
                      >
                        Editar
                      </button>
                      {v.activo ? (
                        <button
                          onClick={() => handleDesactivar(v)}
                          className="text-red-400 hover:text-red-300 text-xs border border-red-900 px-2 py-1 rounded"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivar(v)}
                          className="text-emerald-400 hover:text-emerald-300 text-xs border border-emerald-900 px-2 py-1 rounded"
                        >
                          Reactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal crear / editar ── */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-white font-bold text-lg">
                {editando ? `Editar: ${editando.patente}` : 'Nuevo Vehículo'}
              </h2>
              <button onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Patente *</label>
                  <input
                    value={form.patente}
                    onChange={(e) => setField('patente', e.target.value.toUpperCase())}
                    placeholder="AA-BB-00"
                    className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Tipo de vehículo</label>
                  <select
                    value={form.tipo_vehiculo_id}
                    onChange={(e) => setField('tipo_vehiculo_id', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— Sin tipo —</option>
                    {tipos.map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Marca</label>
                  <input
                    value={form.marca}
                    onChange={(e) => setField('marca', e.target.value)}
                    placeholder="Ej: Mercedes-Benz"
                    className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Modelo</label>
                  <input
                    value={form.modelo}
                    onChange={(e) => setField('modelo', e.target.value)}
                    placeholder="Ej: Sprinter"
                    className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Año</label>
                  <input
                    type="number"
                    value={form.anio}
                    onChange={(e) => setField('anio', e.target.value)}
                    placeholder="2020"
                    className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Capacidad (kg brutos) *</label>
                  <input
                    type="number"
                    value={form.capacidad_kg}
                    onChange={(e) => setField('capacidad_kg', e.target.value)}
                    placeholder="Ej: 3500"
                    className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {errorModal && (
                <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-2 text-sm">{errorModal}</div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700">
              <button
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-white px-4 py-2 rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando || !form.patente.trim() || !form.capacidad_kg || Number(form.capacidad_kg) <= 0}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm"
              >
                {guardando ? 'Guardando...' : (editando ? 'Guardar cambios' : 'Crear vehículo')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
