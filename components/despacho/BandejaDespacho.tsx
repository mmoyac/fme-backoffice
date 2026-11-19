'use client';

// Bandeja de la portada de Despacho: contadores, pendientes por comuna y armado de hoja de ruta.
// Change OpenSpec fme-backend: improve-despacho-bandeja.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DataList, { type Columna } from '@/components/ui/DataList';
import { obtenerBandejaDespacho, type BandejaDespacho as Bandeja, type PedidoResumen } from '@/lib/api/hojas_ruta';

const SIN_COMUNA = '__sin__';
type Vista = 'pendientes' | 'pagados';

const pesos = (n: number) => `$${Math.round(n || 0).toLocaleString('es-CL')}`;
const fecha = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('es-CL') : '—');
const clave = (p: PedidoResumen) => `${p.tipo === 'solicitud' ? 's' : 'p'}-${p.id}`;

function Contador({ titulo, valor, icono, activo, tono, onClick, href }: {
  titulo: string; valor: number; icono: string; activo?: boolean; tono: string;
  onClick?: () => void; href?: string;
}) {
  const cls = `block w-full text-left rounded-lg p-4 border transition-colors ${
    activo ? 'border-teal-500 bg-slate-700' : 'border-slate-700 bg-slate-800 hover:border-slate-500'}`;
  const contenido = (
    <>
      <div className="text-sm text-slate-400">{icono} {titulo}</div>
      <div className={`text-3xl font-bold mt-1 ${tono}`}>{valor}</div>
    </>
  );
  return href
    ? <Link href={href} className={cls}>{contenido}</Link>
    : <button type="button" onClick={onClick} className={cls}>{contenido}</button>;
}

export default function BandejaDespacho() {
  const router = useRouter();
  const [bandeja, setBandeja] = useState<Bandeja | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [vista, setVista] = useState<Vista>('pendientes');
  const [comuna, setComuna] = useState<string | null>(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagado, setPagado] = useState<'' | 'si' | 'no'>('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setBandeja(await obtenerBandejaDespacho());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar la bandeja de despacho');
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  // Filtros de fecha y pagado (los chips de comuna cuentan sobre este conjunto)
  const filtradosBase = useMemo(() => (bandeja?.pendientes ?? []).filter(p => {
    const f = (p.fecha_pedido || '').slice(0, 10);
    if (desde && f < desde) return false;
    if (hasta && f > hasta) return false;
    if (pagado === 'si' && !p.es_pagado) return false;
    if (pagado === 'no' && p.es_pagado) return false;
    return true;
  }), [bandeja, desde, hasta, pagado]);

  const chips = useMemo(() => {
    const conteo = new Map<string, number>();
    filtradosBase.forEach(p => {
      const c = p.comuna?.trim() || SIN_COMUNA;
      conteo.set(c, (conteo.get(c) || 0) + 1);
    });
    return Array.from(conteo.entries()).sort((a, b) =>
      a[0] === SIN_COMUNA ? 1 : b[0] === SIN_COMUNA ? -1 : a[0].localeCompare(b[0], 'es'));
  }, [filtradosBase]);

  const visibles = useMemo(() => filtradosBase.filter(p =>
    !comuna || (comuna === SIN_COMUNA ? !p.comuna?.trim() : p.comuna?.trim() === comuna)), [filtradosBase, comuna]);

  const toggle = (p: PedidoResumen) => setSeleccion(prev => {
    const n = new Set(prev);
    const k = clave(p);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });
  const todosVisiblesMarcados = visibles.length > 0 && visibles.every(p => seleccion.has(clave(p)));
  const marcarVisibles = () => setSeleccion(prev => {
    const n = new Set(prev);
    visibles.forEach(p => (todosVisiblesMarcados ? n.delete(clave(p)) : n.add(clave(p))));
    return n;
  });

  const seleccionados = (bandeja?.pendientes ?? []).filter(p => seleccion.has(clave(p)));
  const kgSeleccionados = seleccionados.reduce((s, p) => s + (p.kg_brutos || 0), 0);

  const crearHoja = () => {
    const pedidos = seleccionados.filter(p => p.tipo !== 'solicitud').map(p => p.id);
    const solicitudes = seleccionados.filter(p => p.tipo === 'solicitud').map(p => p.id);
    const q = new URLSearchParams({ nueva: '1' });
    if (pedidos.length) q.set('pedidos', pedidos.join(','));
    if (solicitudes.length) q.set('solicitudes', solicitudes.join(','));
    router.push(`/admin/despacho/rutas?${q.toString()}`);
  };

  const enlace = (p: PedidoResumen) => p.tipo === 'solicitud'
    ? <span className="text-white">{p.numero_pedido}</span>
    : <Link href={`/admin/pedidos/${p.id}`} className="text-teal-400 hover:underline">{p.numero_pedido}</Link>;
  const destinatario = (p: PedidoResumen) => p.tipo === 'solicitud'
    ? `${p.local_origen_nombre ?? ''} → ${p.local_destino_nombre ?? ''}`
    : (p.cliente_nombre || '—');
  const badgePagado = (p: PedidoResumen) => p.tipo === 'solicitud' ? <span className="text-slate-500 text-xs">Solicitud</span>
    : p.es_pagado
      ? <span className="px-2 py-0.5 rounded text-xs bg-green-900 text-green-300">Pagado</span>
      : <span className="px-2 py-0.5 rounded text-xs bg-amber-900 text-amber-300">Por cobrar</span>;
  const check = (p: PedidoResumen) => (
    <input type="checkbox" checked={seleccion.has(clave(p))} onChange={() => toggle(p)}
      className="w-4 h-4 accent-teal-500" aria-label={`Seleccionar ${p.numero_pedido}`} />
  );

  const columnas: Columna<PedidoResumen>[] = [
    { header: <input type="checkbox" checked={todosVisiblesMarcados} onChange={marcarVisibles} className="w-4 h-4 accent-teal-500" aria-label="Seleccionar todos" />,
      className: 'w-[4%]', sinTruncar: true, cell: check },
    { header: 'Número', className: 'w-[25%]', sinTruncar: true, cell: p => <span className="whitespace-nowrap text-xs">{enlace(p)}</span> },
    { header: 'Cliente / Local', className: 'w-[13%]', cell: p => <span className="text-white">{destinatario(p)}</span> },
    { header: 'Dirección', className: 'w-[17%]', cell: p => <span className="text-slate-300" title={p.direccion || undefined}>{p.direccion || '—'}</span> },
    { header: 'Comuna', className: 'w-[10%]', cell: p => <span className="text-slate-300">{p.comuna || '—'}</span> },
    { header: 'Fecha', className: 'w-[10%]', sinTruncar: true, cell: p => <span className="text-slate-400 whitespace-nowrap">{fecha(p.fecha_pedido)}</span> },
    { header: 'Total', className: 'w-[9%] text-right', sinTruncar: true, cell: p => <span className="text-white">{pesos(p.monto_total)}</span> },
    { header: 'Pago', className: 'w-[12%]', sinTruncar: true, cell: p => <span className="whitespace-nowrap">{badgePagado(p)}</span> },
  ];

  const c = bandeja?.contadores;
  const inputCls = 'px-3 py-2 rounded bg-slate-800 border border-slate-600 text-white text-sm';

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-200 px-4 py-3 rounded flex justify-between gap-3">
          <span>{error}</span>
          <button onClick={cargar} className="underline shrink-0">Reintentar</button>
        </div>
      )}

      {/* ── Contadores ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Contador titulo="Por despachar" icono="📦" valor={c?.por_despachar ?? 0} tono="text-white"
          activo={vista === 'pendientes'} onClick={() => setVista('pendientes')} />
        <Contador titulo="Pagados sin confirmar" icono="⚠️" valor={c?.pagados_sin_confirmar ?? 0}
          tono={(c?.pagados_sin_confirmar ?? 0) > 0 ? 'text-amber-400' : 'text-white'}
          activo={vista === 'pagados'} onClick={() => setVista('pagados')} />
        <Contador titulo="En ruta" icono="🚚" valor={c?.en_ruta ?? 0} tono="text-blue-400" href="/admin/despacho/rutas" />
        <Contador titulo="Entregados hoy" icono="✅" valor={c?.entregados_hoy ?? 0} tono="text-green-400" href="/admin/despacho/rutas" />
      </div>

      {vista === 'pagados' ? (
        <div className="bg-slate-800 rounded-lg p-4">
          <h2 className="text-white font-semibold mb-1">Pagados en línea sin confirmar</h2>
          <p className="text-sm text-slate-400 mb-3">
            Se pagaron en la tienda pero no se pudieron confirmar solos (por ejemplo, el tipo de pedido no tiene local de despacho por defecto).
            Confírmalos en Pedidos para que pasen a despacho.
          </p>
          {cargando ? <p className="text-slate-400">Cargando…</p>
            : (bandeja?.pagados_sin_confirmar.length ?? 0) === 0 ? <p className="text-slate-400">No hay pedidos pagados sin confirmar.</p>
            : (
              <ul className="divide-y divide-slate-700">
                {bandeja!.pagados_sin_confirmar.map(p => (
                  <li key={p.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/admin/pedidos/${p.id}`} className="text-teal-400 hover:underline">{p.numero_pedido}</Link>
                      <span className="text-slate-300"> · {p.cliente_nombre || '—'}</span>
                      {p.comuna && <span className="text-slate-400"> · {p.comuna}</span>}
                      <span className="text-slate-500 text-sm"> · {fecha(p.fecha_pedido)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white">{pesos(p.monto_total)}</span>
                      <Link href={`/admin/pedidos/${p.id}`} className="px-3 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-sm">Confirmar</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-white font-semibold">Pendientes por despachar</h2>
              <p className="text-sm text-slate-400">Pedidos confirmados con delivery y solicitudes entre locales, sin hoja de ruta.</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-slate-400">Desde<input type="date" value={desde} onChange={e => setDesde(e.target.value)} className={`${inputCls} block mt-1`} /></label>
              <label className="text-xs text-slate-400">Hasta<input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className={`${inputCls} block mt-1`} /></label>
              <label className="text-xs text-slate-400">Pago
                <select value={pagado} onChange={e => setPagado(e.target.value as '' | 'si' | 'no')} className={`${inputCls} block mt-1`}>
                  <option value="">Todos</option>
                  <option value="si">Pagados</option>
                  <option value="no">Por cobrar</option>
                </select>
              </label>
            </div>
          </div>

          {/* Chips por comuna */}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setComuna(null)}
              className={`px-3 py-1 rounded-full text-sm border ${!comuna ? 'bg-teal-600 border-teal-500 text-white' : 'border-slate-600 text-slate-300 hover:border-slate-400'}`}>
              Todas ({filtradosBase.length})
            </button>
            {chips.map(([k, n]) => (
              <button key={k} type="button" onClick={() => setComuna(k)}
                className={`px-3 py-1 rounded-full text-sm border ${comuna === k ? 'bg-teal-600 border-teal-500 text-white' : 'border-slate-600 text-slate-300 hover:border-slate-400'}`}>
                {k === SIN_COMUNA ? 'Sin comuna' : k} ({n})
              </button>
            ))}
          </div>

          {/* Acciones de selección */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-slate-400">
              {seleccionados.length > 0
                ? `${seleccionados.length} seleccionado${seleccionados.length === 1 ? '' : 's'} · ${kgSeleccionados.toFixed(1)} kg`
                : 'Marca los pendientes que irán en la misma ruta'}
            </span>
            <div className="flex gap-2">
              {seleccionados.length > 0 && (
                <button type="button" onClick={() => setSeleccion(new Set())} className="px-3 py-2 rounded bg-slate-600 hover:bg-slate-500 text-white">Limpiar</button>
              )}
              <button type="button" onClick={crearHoja} disabled={seleccionados.length === 0}
                className="px-4 py-2 rounded bg-teal-600 hover:bg-teal-500 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                🚚 Crear hoja de ruta con seleccionados
              </button>
            </div>
          </div>

          <DataList
            items={visibles}
            getKey={clave}
            columns={columnas}
            loading={cargando}
            empty={(bandeja?.pendientes.length ?? 0) === 0 ? 'No hay pendientes por despachar.' : 'No hay pendientes con estos filtros.'}
            card={p => (
              <div className="flex gap-3">
                <div className="pt-1">{check(p)}</div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold break-all">{enlace(p)}</div>
                    <div className="shrink-0">{badgePagado(p)}</div>
                  </div>
                  <div className="text-white text-sm">{destinatario(p)}</div>
                  <div className="text-slate-300 text-sm break-words">{p.direccion || '—'}{p.comuna ? ` · ${p.comuna}` : ''}</div>
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>{fecha(p.fecha_pedido)}</span>
                    <span className="text-white">{pesos(p.monto_total)}</span>
                  </div>
                </div>
              </div>
            )}
          />
        </div>
      )}
    </div>
  );
}
