'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthService } from '@/lib/auth';
import {
  escanearCaja,
  asignarCajaAPedido,
  desasignarCaja,
  type ScanResultOut,
  type LoteCandidato,
  type AsignacionResult,
} from '@/lib/api/preventa';

interface HistorialItem {
  id: number;
  qr: string;
  pedido: string;
  cliente: string;
  producto: string;
  peso: number;
  monto: number;
}

export default function PickingPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [inputQR, setInputQR] = useState('');
  const [scanResult, setScanResult] = useState<ScanResultOut | null>(null);
  const [lotesCandidatos, setLotesCandidatos] = useState<LoteCandidato[] | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [asignando, setAsignando] = useState(false);
  const [ultimaAsignacion, setUltimaAsignacion] = useState<AsignacionResult | null>(null);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [error, setError] = useState('');
  const [loadingScan, setLoadingScan] = useState(false);

  useEffect(() => {
    if (!AuthService.isAuthenticated()) { router.push('/login'); return; }
    inputRef.current?.focus();
  }, [router]);

  const handleScan = useCallback(async () => {
    const qr = inputQR.trim();
    if (!qr) return;
    setLoadingScan(true);
    setError('');
    setScanResult(null);
    setSelectedItemId(null);
    setUltimaAsignacion(null);
    try {
      const result = await escanearCaja(qr);
      if (result.multiples_lotes && result.lotes_candidatos.length > 0) {
        setLotesCandidatos(result.lotes_candidatos);
      } else {
        setScanResult(result);
        if (result.sugerencias.length === 1) {
          setSelectedItemId(result.sugerencias[0].item_pedido_id);
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingScan(false);
    }
  }, [inputQR]);

  const handleSeleccionarLote = async (loteId: number) => {
    setLotesCandidatos(null);
    setLoadingScan(true);
    setError('');
    try {
      const result = await escanearCaja(inputQR.trim(), loteId);
      setScanResult(result);
      if (result.sugerencias && result.sugerencias.length === 1) {
        setSelectedItemId(result.sugerencias[0].item_pedido_id);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingScan(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleScan();
  };

  const handleAsignar = async () => {
    if (!scanResult || scanResult.lote_id === undefined || selectedItemId === null || selectedItemId === undefined) return;
    setAsignando(true);
    setError('');
    try {
      const sug = scanResult.sugerencias.find(s => s.item_pedido_id === selectedItemId);
      const result = await asignarCajaAPedido(scanResult.lote_id, selectedItemId);
      setUltimaAsignacion(result);
      setHistorial((prev) => [
        {
          id: result.asignacion_id,
          qr: inputQR.trim(),
          pedido: sug?.numero_pedido ?? '?',
          cliente: sug?.cliente ?? '?',
          producto: scanResult.producto_nombre ?? '',
          peso: scanResult.peso_actual ?? 0,
          monto: result.monto_real,
        },
        ...prev.slice(0, 19),
      ]);
      setInputQR('');
      setScanResult(null);
      setSelectedItemId(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAsignando(false);
    }
  };

  const handleDesasignar = async (asignacionId: number) => {
    if (!confirm('Desasignar esta caja?')) return;
    try {
      await desasignarCaja(asignacionId);
      setHistorial((prev) => prev.filter((h) => h.id !== asignacionId));
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/pedidos/cajas" className="text-slate-400 hover:text-white text-sm">
          &larr; Pre-Ventas
        </Link>
        <h1 className="text-2xl font-bold text-white">Centro de Picking</h1>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
        <label className="block text-slate-300 text-sm font-medium mb-2">
          Escanear caja (QR / código de barra)
        </label>
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputQR}
            onChange={(e) => setInputQR(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escanear o ingresar código..."
            className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
            autoComplete="off"
          />
          <button
            onClick={handleScan}
            disabled={loadingScan || !inputQR.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg"
          >
            {loadingScan ? '...' : 'Buscar'}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      {ultimaAsignacion && !scanResult && !lotesCandidatos && (
        <div className="bg-emerald-900/40 border border-emerald-700 rounded-xl p-4 mb-6 flex items-center gap-4">
          <span className="text-3xl">✅</span>
          <div>
            <div className="text-emerald-300 font-semibold">
              Caja asignada a pedido {historial[0]?.pedido ?? ''}
            </div>
            <div className="text-slate-400 text-sm">
              {historial[0]?.cliente} — Monto: $
              {ultimaAsignacion.monto_real.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      )}

      {lotesCandidatos && (
        <div className="bg-slate-800 border border-yellow-600 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-yellow-300 font-bold text-base">
                ⚠️ Múltiples cajas con este código
              </div>
              <div className="text-slate-400 text-sm mt-0.5">
                El código <span className="font-mono text-white">{inputQR}</span> pertenece a {lotesCandidatos.length} lotes distintos. Seleccioná cuál es la caja física que estás sosteniendo.
              </div>
            </div>
            <button
              onClick={() => { setLotesCandidatos(null); setError(''); }}
              className="text-slate-500 hover:text-white text-xl ml-4"
            >
              &times;
            </button>
          </div>
          <div className="space-y-2">
            {lotesCandidatos.map((lote) => (
              <button
                key={lote.id}
                onClick={() => handleSeleccionarLote(lote.id)}
                className="w-full text-left p-3 rounded-lg border border-slate-600 bg-slate-700/50 hover:border-yellow-500 hover:bg-yellow-900/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-semibold">{lote.producto_nombre}</span>
                    <span className="text-slate-400 text-sm ml-2">— {lote.proveedor_nombre}</span>
                  </div>
                  <span className="text-cyan-300 text-sm font-mono">{lote.peso_actual.toFixed(2)} kg</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-slate-500 text-xs font-mono">{lote.codigo_lote}</span>
                  {lote.fecha_vencimiento && (
                    <span className="text-slate-400 text-xs">Vence: {lote.fecha_vencimiento}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {scanResult && (
        <div className="bg-slate-800 border border-cyan-700 rounded-xl p-5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-white font-bold text-lg">{scanResult.producto_nombre}</div>
              <div className="text-slate-400 text-sm">
                Proveedor: {scanResult.proveedor_nombre} &bull;
                Peso: <span className="text-cyan-300 font-semibold">{(scanResult.peso_actual ?? 0).toFixed(2)} kg</span> &bull;
                Lote: {scanResult.codigo_lote}
              </div>
            </div>
            <button onClick={() => setScanResult(null)} className="text-slate-500 hover:text-white text-xl">&times;</button>
          </div>

          {scanResult.sugerencias.length === 0 ? (
            <div className="text-yellow-400 text-sm">No hay pre-ventas pendientes para este corte/proveedor</div>
          ) : (
            <div>
              <p className="text-slate-400 text-sm mb-2">Seleccionar pedido destino:</p>
              <div className="space-y-2">
                {scanResult.sugerencias.map((sug) => {
                  const isSelected = selectedItemId === sug.item_pedido_id;
                  return (
                    <button
                      key={sug.item_pedido_id}
                      onClick={() => setSelectedItemId(sug.item_pedido_id)}
                      className={[
                        'w-full text-left p-3 rounded-lg border transition-colors',
                        isSelected
                          ? 'border-cyan-500 bg-cyan-900/30'
                          : 'border-slate-600 bg-slate-700/50 hover:border-slate-500',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-mono font-bold">{sug.numero_pedido}</span>
                          <span className="text-slate-300 text-sm ml-2">{sug.cliente}</span>
                        </div>
                        <div className="text-right text-sm">
                          <span className="text-slate-400">
                            {sug.cajas_asignadas}/{sug.cajas_pedidas}
                          </span>
                          {sug.cajas_asignadas >= sug.cajas_pedidas && (
                            <span className="ml-2 text-xs text-yellow-400">COMPLETO</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleAsignar}
                disabled={selectedItemId === null || asignando}
                className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
              >
                {asignando ? 'Asignando...' : 'Confirmar Asignación'}
              </button>
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>
          )}
        </div>
      )}

      {historial.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-white font-semibold">Últimas asignaciones ({historial.length})</h2>
          </div>
          <div className="divide-y divide-slate-700">
            {historial.map((h) => (
              <div key={h.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                <div className="font-mono text-slate-400 w-28 truncate">{h.qr}</div>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-mono">{h.pedido}</span>
                  <span className="text-slate-400 ml-2">{h.cliente}</span>
                  <span className="text-slate-500 ml-2">{h.producto}</span>
                </div>
                <div className="text-cyan-300">{h.peso.toFixed(2)} kg</div>
                <div className="text-emerald-400">${h.monto.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</div>
                <button
                  onClick={() => handleDesasignar(h.id)}
                  className="text-red-500 hover:text-red-400 text-xs"
                >
                  deshacer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
