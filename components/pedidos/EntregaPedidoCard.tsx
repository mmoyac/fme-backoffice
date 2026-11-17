'use client';

// Modalidad y registro de entrega del pedido (change OpenSpec fme-backend: add-modalidad-entrega-pedido)
import { useState } from 'react';
import { marcarPedidoRetirado, Pedido } from '@/lib/api/pedidos';

const fmt = (f?: string | null) =>
  f ? new Date(f).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export function EntregaPedidoCard({ pedido, onActualizado }: { pedido: Pedido; onActualizado: () => void }) {
  const [modal, setModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const esRetiro = pedido.modalidad_entrega !== 'DESPACHO';
  const entregado = !!pedido.fecha_entrega || pedido.estado === 'ENTREGADO';
  const puedeRetirar = esRetiro && !entregado && ['CONFIRMADO', 'EN_PREPARACION'].includes(pedido.estado);

  const confirmar = async () => {
    try {
      setGuardando(true);
      setError('');
      await marcarPedidoRetirado(pedido.id, {
        retirado_por_nombre: nombre || undefined,
        retirado_por_rut: rut || undefined,
        nota_entrega: nota || undefined,
      });
      setModal(false);
      onActualizado();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4">Entrega</h2>
      <div className="space-y-2 text-sm text-gray-300">
        <div className="flex justify-between">
          <span className="text-gray-400">Modalidad</span>
          <span className="text-white font-medium">{esRetiro ? '🏪 Retiro en local' : '🚚 Despacho'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Estado de entrega</span>
          {entregado ? (
            <span className="text-green-400 font-medium">Entregado</span>
          ) : pedido.estado === 'CANCELADO' ? (
            <span className="text-gray-400">Cancelado</span>
          ) : (
            <span className="text-amber-400 font-medium">Pendiente</span>
          )}
        </div>
        {entregado && (
          <>
            <div className="flex justify-between"><span className="text-gray-400">Fecha</span><span>{fmt(pedido.fecha_entrega)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Entregado por</span><span>{pedido.entregado_por_nombre || '—'}</span></div>
            {esRetiro && (
              <div className="flex justify-between">
                <span className="text-gray-400">Retiró</span>
                <span>{[pedido.retirado_por_nombre, pedido.retirado_por_rut].filter(Boolean).join(' · ') || '—'}</span>
              </div>
            )}
            {pedido.nota_entrega && <p className="text-xs text-gray-400 pt-1">Nota: {pedido.nota_entrega}</p>}
          </>
        )}
        {!entregado && esRetiro && pedido.estado === 'PENDIENTE' && (
          <p className="text-xs text-gray-400 pt-1">Se podrá marcar como retirado cuando el pedido esté confirmado (por ejemplo, al terminar su producción).</p>
        )}
        {!entregado && !esRetiro && pedido.estado !== 'CANCELADO' && (
          <p className="text-xs text-gray-400 pt-1">Se marca entregado desde la hoja de ruta / despacho.</p>
        )}
      </div>

      {puedeRetirar && (
        <button
          onClick={() => { setModal(true); setError(''); }}
          className="mt-4 w-full px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold"
        >
          ✓ Marcar retirado
        </button>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md space-y-3">
            <h3 className="text-lg font-bold text-white">Registrar retiro del pedido</h3>
            <p className="text-sm text-gray-400">El pedido quedará ENTREGADO a tu nombre, con la fecha y hora actual.</p>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre de quien retira (opcional)"
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2" />
            <input value={rut} onChange={e => setRut(e.target.value)} placeholder="RUT de quien retira (opcional)"
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2" />
            <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota (opcional)" rows={2}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2" />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModal(false)} className="px-4 py-2 rounded-lg bg-slate-600 text-white">Cancelar</button>
              <button onClick={confirmar} disabled={guardando}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Confirmar retiro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
