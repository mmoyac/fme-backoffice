'use client';

// Tarifas de delivery por comuna de la tienda online (change add-delivery-por-comuna).
import { useState, useEffect, useCallback } from 'react';
import {
  listarTarifas,
  crearTarifa,
  editarTarifa,
  eliminarTarifa,
  type TarifaDelivery,
} from '@/lib/api/tarifas-delivery';
import { TruckIcon, PlusIcon, PencilIcon, TrashIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const inputCls = 'w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white';
const labelCls = 'block text-sm font-medium text-slate-300 mb-1';

function formatoMonto(monto: number): string {
  return `$${monto.toLocaleString('es-CL')}`;
}

interface Form {
  comuna: string;
  costo: string;
  activo: boolean;
}

const FORM_VACIO: Form = { comuna: '', costo: '', activo: true };

export default function TarifasDeliveryPage() {
  const [tarifas, setTarifas] = useState<TarifaDelivery[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [editandoId, setEditandoId] = useState<number | 'nueva' | null>(null);
  const [form, setForm] = useState<Form>(FORM_VACIO);

  const cargar = useCallback(async () => {
    try {
      setTarifas(await listarTarifas());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirNueva = () => {
    setEditandoId('nueva');
    setForm(FORM_VACIO);
  };

  const abrirEditar = (t: TarifaDelivery) => {
    setEditandoId(t.id);
    setForm({ comuna: t.comuna, costo: String(t.costo), activo: t.activo });
  };

  const cerrar = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
  };

  const costoValido = /^\d+$/.test(form.costo.trim());
  const formValido = form.comuna.trim().length >= 2 && costoValido;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValido) return;
    setBusy(true);
    setError('');
    setMensaje('');
    const datos = { comuna: form.comuna.trim(), costo: parseInt(form.costo, 10), activo: form.activo };
    try {
      if (editandoId === 'nueva') {
        await crearTarifa(datos);
        setMensaje(`Tarifa de ${datos.comuna} creada.`);
      } else if (editandoId !== null) {
        await editarTarifa(editandoId, datos);
        setMensaje(`Tarifa de ${datos.comuna} actualizada.`);
      }
      cerrar();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setBusy(false);
    }
  };

  const alternarActivo = async (t: TarifaDelivery) => {
    setBusy(true);
    setError('');
    try {
      await editarTarifa(t.id, { comuna: t.comuna, costo: t.costo, activo: !t.activo });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setBusy(false);
    }
  };

  const eliminar = async (t: TarifaDelivery) => {
    if (!confirm(`¿Eliminar la tarifa de ${t.comuna}? Los clientes ya no podrán pedir delivery a esa comuna.`)) return;
    setBusy(true);
    setError('');
    try {
      await eliminarTarifa(t.id);
      setMensaje(`Tarifa de ${t.comuna} eliminada.`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setBusy(false);
    }
  };

  const formulario = (
    <form onSubmit={guardar} className="p-4 bg-slate-700/60 rounded-lg border border-slate-600 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className={labelCls}>Comuna</label>
          <input
            type="text"
            value={form.comuna}
            onChange={(e) => setForm((f) => ({ ...f, comuna: e.target.value }))}
            className={inputCls}
            placeholder="Ej: Colina"
            maxLength={100}
            required
            autoFocus
          />
        </div>
        <div>
          <label className={labelCls}>Costo ($)</label>
          <input
            type="text"
            inputMode="numeric"
            value={form.costo}
            onChange={(e) => setForm((f) => ({ ...f, costo: e.target.value.replace(/[^\d]/g, '') }))}
            className={inputCls}
            placeholder="Ej: 3000"
            required
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-slate-300 text-sm">
        <input
          type="checkbox"
          checked={form.activo}
          onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
        />
        Activa (se ofrece en la tienda)
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !formValido}
          className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
        >
          Guardar
        </button>
        <button type="button" onClick={cerrar} className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white">
          Cancelar
        </button>
      </div>
    </form>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Tarifas de delivery</h1>
        <p className="text-slate-400">
          Comunas a las que la tienda online hace delivery y cuánto cuesta. El cliente elige su comuna en el checkout y
          el costo se suma al pago.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-600/30 rounded-lg p-4 flex justify-between gap-3">
          <p className="text-red-400 break-words min-w-0">{error}</p>
          <button onClick={() => setError('')} className="text-red-300 hover:text-white shrink-0" aria-label="Cerrar">✕</button>
        </div>
      )}
      {mensaje && (
        <div className="mb-4 bg-green-900/20 border border-green-600/30 rounded-lg p-4 flex justify-between gap-3">
          <p className="text-green-400 break-words min-w-0">{mensaje}</p>
          <button onClick={() => setMensaje('')} className="text-green-300 hover:text-white shrink-0" aria-label="Cerrar">✕</button>
        </div>
      )}

      <div className="mb-4 bg-slate-800 border border-slate-700 rounded-lg p-4 flex gap-3 text-sm text-slate-300">
        <InformationCircleIcon className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
        <div>
          <p>Sin tarifas activas, la tienda ofrece solo <strong>Retiro en casa central</strong>.</p>
          <p className="mt-1">
            La dirección de retiro y el monto mínimo para envío gratis se configuran en{' '}
            <a href="/admin/configuracion/landing" className="text-teal-400 hover:underline">Config. Landing</a>.
          </p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            <TruckIcon className="w-6 h-6 mr-2 text-teal-400" />
            Comunas con delivery
          </h2>
          <button
            type="button"
            onClick={abrirNueva}
            disabled={editandoId === 'nueva'}
            className="flex items-center gap-1 bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <PlusIcon className="w-5 h-5" />
            Nueva tarifa
          </button>
        </div>

        {editandoId === 'nueva' && <div className="mb-4">{formulario}</div>}

        {cargando ? (
          <p className="text-slate-400">Cargando…</p>
        ) : tarifas.length === 0 ? (
          <p className="text-slate-400">Aún no hay tarifas. Agrega la primera comuna con “Nueva tarifa”.</p>
        ) : (
          <ul className="divide-y divide-slate-700">
            {tarifas.map((t) =>
              editandoId === t.id ? (
                <li key={t.id} className="py-3">{formulario}</li>
              ) : (
                <li key={t.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`font-semibold ${t.activo ? 'text-white' : 'text-slate-500 line-through'}`}>{t.comuna}</p>
                    <p className="text-sm text-slate-400">
                      {formatoMonto(t.costo)}
                      {!t.activo && <span className="ml-2 text-xs text-slate-500">(inactiva)</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => abrirEditar(t)}
                      disabled={busy}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-500 text-white rounded-lg disabled:opacity-50"
                    >
                      <PencilIcon className="w-4 h-4" /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => alternarActivo(t)}
                      disabled={busy}
                      className={`px-3 py-1.5 text-sm text-white rounded-lg disabled:opacity-50 ${t.activo ? 'bg-orange-700 hover:bg-orange-600' : 'bg-green-700 hover:bg-green-600'}`}
                    >
                      {t.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(t)}
                      disabled={busy}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-800 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
                    >
                      <TrashIcon className="w-4 h-4" /> Eliminar
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
