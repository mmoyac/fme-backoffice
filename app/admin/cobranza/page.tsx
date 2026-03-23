'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    getCobranza,
    confirmarCobro,
    anularCobro,
    type ItemCobranza,
} from '@/lib/api/cobranza';
import {
    obtenerPedidoConCheques,
    crearCheque,
    actualizarCheque,
    eliminarCheque,
    type PedidoConCheques,
    type EstadoCheque,
} from '@/lib/api/cheques';
import { getMediosPago, type MedioPago } from '@/lib/api/maestras';
import { registrarPago } from '@/lib/api/facturas';

const FILTROS_TIPO = [
    { value: '', label: 'Todos' },
    { value: 'CHEQUE', label: 'Cheques' },
    { value: 'TRANSFERENCIA', label: 'Transferencias' },
];

const ESTADOS_CHEQUE: EstadoCheque[] = [
    { id: 1, codigo: 'PENDIENTE',  nombre: 'Pendiente',  activo: true },
    { id: 2, codigo: 'DEPOSITADO', nombre: 'Depositado', activo: true },
    { id: 3, codigo: 'COBRADO',    nombre: 'Cobrado',    activo: true },
    { id: 4, codigo: 'RECHAZADO',  nombre: 'Rechazado',  activo: true },
    { id: 5, codigo: 'VENCIDO',    nombre: 'Vencido',    activo: true },
    { id: 6, codigo: 'ANULADO',    nombre: 'Anulado',    activo: true },
];

const BANCOS = [
    { id: 4, nombre: 'BCI' }, { id: 10, nombre: 'BICE' }, { id: 2, nombre: 'Banco Estado' },
    { id: 7, nombre: 'Falabella' }, { id: 1, nombre: 'Generico' }, { id: 5, nombre: 'Itau' },
    { id: 8, nombre: 'Ripley' }, { id: 3, nombre: 'Santander' }, { id: 6, nombre: 'Scotiabank' }, { id: 9, nombre: 'Security' },
];

function formatMonto(n: number) {
    return `$${Math.round(n).toLocaleString('es-CL')}`;
}

function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function BadgeVencimiento({ dias, sinCheques }: { dias: number; sinCheques?: boolean }) {
    if (sinCheques)
        return <span className="bg-orange-900 text-orange-300 text-xs font-semibold px-2 py-0.5 rounded-full">Sin cheques</span>;
    if (dias < 0)
        return <span className="bg-red-900 text-red-300 text-xs font-semibold px-2 py-0.5 rounded-full">Vencido {Math.abs(dias)}d</span>;
    if (dias === 0)
        return <span className="bg-orange-900 text-orange-300 text-xs font-semibold px-2 py-0.5 rounded-full">Vence hoy</span>;
    if (dias <= 7)
        return <span className="bg-yellow-900 text-yellow-300 text-xs font-semibold px-2 py-0.5 rounded-full">Vence en {dias}d</span>;
    return <span className="bg-slate-700 text-gray-300 text-xs font-semibold px-2 py-0.5 rounded-full">{dias}d restantes</span>;
}

function BadgeEstadoPedido({ nombre, color }: { nombre?: string | null; color?: string | null }) {
    if (!nombre) return <span className="text-gray-500 text-xs">—</span>;
    // color viene como "yellow-500", "green-500", etc. — lo mapeamos a clases seguras
    const colorMap: Record<string, string> = {
        'gray-500':   'bg-gray-700 text-gray-300',
        'yellow-500': 'bg-yellow-900 text-yellow-300',
        'blue-500':   'bg-blue-900 text-blue-300',
        'green-500':  'bg-green-900 text-green-300',
        'red-500':    'bg-red-900 text-red-300',
        'orange-500': 'bg-orange-900 text-orange-300',
        'purple-500': 'bg-purple-900 text-purple-300',
    };
    const cls = colorMap[color ?? ''] ?? 'bg-slate-700 text-gray-300';
    return <span className={`${cls} text-xs font-semibold px-2 py-0.5 rounded-full`}>{nombre}</span>;
}

function BadgeTipo({ tipo }: { tipo: string }) {
    if (tipo === 'CHEQUE')
        return <span className="bg-indigo-900 text-indigo-300 text-xs font-semibold px-2 py-0.5 rounded-full">Cheque</span>;
    return <span className="bg-teal-900 text-teal-300 text-xs font-semibold px-2 py-0.5 rounded-full">Transferencia</span>;
}

const NUEVO_CHEQUE_INICIAL = {
    numero_cheque: '', banco_id: 0, monto: '', fecha_emision: '',
    fecha_vencimiento: '', librador_nombre: '', librador_rut: '', observaciones: '',
};

export default function CobranzaPage() {
    const [items, setItems] = useState<ItemCobranza[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [busqueda, setBusqueda] = useState('');

    // Modal confirmar transferencia
    const [modalConfirmar, setModalConfirmar] = useState(false);
    const [itemSeleccionado, setItemSeleccionado] = useState<ItemCobranza | null>(null);
    const [obsConfirmar, setObsConfirmar] = useState('');
    const [procesando, setProcesando] = useState(false);
    const [errorModal, setErrorModal] = useState('');

    // Modal anular
    const [modalAnular, setModalAnular] = useState(false);
    const [obsAnular, setObsAnular] = useState('');

    // Modal cambiar medio de pago (cheque → otro)
    const [modalCambiarPago, setModalCambiarPago] = useState(false);
    const [itemCambiarPago, setItemCambiarPago] = useState<ItemCobranza | null>(null);
    const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
    const [medioPagoNuevo, setMedioPagoNuevo] = useState<number>(0);
    const [guardandoPago, setGuardandoPago] = useState(false);
    const [errorPago, setErrorPago] = useState('');

    // Modal gestionar cheques
    const [modalCheques, setModalCheques] = useState(false);
    const [itemCheques, setItemCheques] = useState<ItemCobranza | null>(null);
    const [pedidoConCheques, setPedidoConCheques] = useState<PedidoConCheques | null>(null);
    const [cargandoCheques, setCargandoCheques] = useState(false);
    const [nuevoCheque, setNuevoCheque] = useState(NUEVO_CHEQUE_INICIAL);
    const [guardandoCheque, setGuardandoCheque] = useState(false);
    const [errorCheque, setErrorCheque] = useState('');
    const [actualizandoChequeId, setActualizandoChequeId] = useState<number | null>(null);

    const cargar = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const data = await getCobranza({ tipo: filtroTipo || undefined });
            setItems(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar cobranza');
        } finally {
            setLoading(false);
        }
    }, [filtroTipo]);

    useEffect(() => { cargar(); }, [cargar]);

    useEffect(() => {
        getMediosPago().then(data => setMediosPago(data.filter(m => m.activo))).catch(() => {});
    }, []);

    const itemsFiltrados = items.filter(item => {
        if (!busqueda) return true;
        const q = busqueda.toLowerCase();
        return (
            item.cliente_nombre?.toLowerCase().includes(q) ||
            item.numero_pedido?.toLowerCase().includes(q) ||
            item.local_nombre?.toLowerCase().includes(q)
        );
    });

    // ── Confirmar transferencia ────────────────────────────────
    const abrirConfirmar = (item: ItemCobranza) => {
        setItemSeleccionado(item);
        setObsConfirmar('');
        setErrorModal('');
        setModalConfirmar(true);
    };

    const handleConfirmar = async () => {
        if (!itemSeleccionado) return;
        try {
            setProcesando(true);
            setErrorModal('');
            await confirmarCobro(itemSeleccionado.referencia_id, obsConfirmar || undefined);
            setModalConfirmar(false);
            await cargar();
        } catch (err: any) {
            setErrorModal(err.message || 'Error al confirmar cobro');
        } finally {
            setProcesando(false);
        }
    };

    // ── Anular ─────────────────────────────────────────────────
    const abrirAnular = (item: ItemCobranza) => {
        setItemSeleccionado(item);
        setObsAnular('');
        setErrorModal('');
        setModalAnular(true);
    };

    const handleAnular = async () => {
        if (!itemSeleccionado) return;
        try {
            setProcesando(true);
            setErrorModal('');
            await anularCobro(itemSeleccionado.referencia_id, obsAnular || undefined);
            setModalAnular(false);
            await cargar();
        } catch (err: any) {
            setErrorModal(err.message || 'Error al anular cobro');
        } finally {
            setProcesando(false);
        }
    };

    // ── Cambiar medio de pago ─────────────────────────────────
    const abrirModalCambiarPago = (item: ItemCobranza) => {
        setItemCambiarPago(item);
        setMedioPagoNuevo(0);
        setErrorPago('');
        setModalCambiarPago(true);
    };

    const handleCambiarPago = async () => {
        if (!itemCambiarPago || !medioPagoNuevo) return;
        try {
            setGuardandoPago(true);
            setErrorPago('');
            await registrarPago(itemCambiarPago.pedido_id, medioPagoNuevo);
            setModalCambiarPago(false);
            await cargar();
        } catch (err: any) {
            setErrorPago(err.message || 'Error al registrar el pago');
        } finally {
            setGuardandoPago(false);
        }
    };

    // ── Gestionar cheques ──────────────────────────────────────
    const abrirModalCheques = async (item: ItemCobranza) => {
        setItemCheques(item);
        setPedidoConCheques(null);
        setNuevoCheque({ ...NUEVO_CHEQUE_INICIAL, librador_nombre: item.cliente_nombre || '' });
        setErrorCheque('');
        setModalCheques(true);
        setCargandoCheques(true);
        try {
            const data = await obtenerPedidoConCheques(item.pedido_id);
            setPedidoConCheques(data);
        } catch (err: any) {
            setErrorCheque(err.message || 'Error al cargar cheques');
        } finally {
            setCargandoCheques(false);
        }
    };

    const cerrarModalCheques = () => {
        setModalCheques(false);
        setItemCheques(null);
        setPedidoConCheques(null);
        setErrorCheque('');
    };

    const handleAgregarCheque = async () => {
        if (!itemCheques) return;
        if (!nuevoCheque.numero_cheque.trim()) { setErrorCheque('Ingrese el numero de cheque.'); return; }
        if (!nuevoCheque.banco_id) { setErrorCheque('Seleccione un banco.'); return; }
        if (!nuevoCheque.monto || parseFloat(nuevoCheque.monto) <= 0) { setErrorCheque('Ingrese un monto valido.'); return; }
        if (!nuevoCheque.fecha_vencimiento) { setErrorCheque('Ingrese la fecha de vencimiento.'); return; }
        if (!nuevoCheque.librador_nombre.trim()) { setErrorCheque('Ingrese el nombre del librador.'); return; }
        try {
            setGuardandoCheque(true);
            setErrorCheque('');
            await crearCheque({
                pedido_id: itemCheques.pedido_id,
                numero_cheque: nuevoCheque.numero_cheque.trim(),
                banco_id: nuevoCheque.banco_id,
                monto: parseFloat(nuevoCheque.monto),
                fecha_emision: nuevoCheque.fecha_emision
                    ? new Date(nuevoCheque.fecha_emision).toISOString()
                    : new Date().toISOString(),
                fecha_vencimiento: new Date(nuevoCheque.fecha_vencimiento).toISOString(),
                librador_nombre: nuevoCheque.librador_nombre.trim(),
                librador_rut: nuevoCheque.librador_rut.trim() || undefined,
                observaciones: nuevoCheque.observaciones.trim() || undefined,
            });
            const data = await obtenerPedidoConCheques(itemCheques.pedido_id);
            setPedidoConCheques(data);
            setNuevoCheque({
                ...NUEVO_CHEQUE_INICIAL,
                banco_id: nuevoCheque.banco_id,
                librador_nombre: nuevoCheque.librador_nombre,
                librador_rut: nuevoCheque.librador_rut,
            });
            await cargar();
        } catch (err: any) {
            setErrorCheque(err.message || 'Error al agregar cheque');
        } finally {
            setGuardandoCheque(false);
        }
    };

    const handleCambiarEstadoCheque = async (chequeId: number, estadoId: number) => {
        if (!itemCheques) return;
        try {
            setActualizandoChequeId(chequeId);
            await actualizarCheque(chequeId, { estado_id: estadoId });
            const data = await obtenerPedidoConCheques(itemCheques.pedido_id);
            setPedidoConCheques(data);
            await cargar();
        } catch (err: any) {
            setErrorCheque(err.message || 'Error al actualizar cheque');
        } finally {
            setActualizandoChequeId(null);
        }
    };

    const handleEliminarCheque = async (chequeId: number) => {
        if (!itemCheques || !confirm('Eliminar este cheque?')) return;
        try {
            await eliminarCheque(chequeId);
            const data = await obtenerPedidoConCheques(itemCheques.pedido_id);
            setPedidoConCheques(data);
            await cargar();
        } catch (err: any) {
            setErrorCheque(err.message || 'Error al eliminar cheque');
        }
    };

    const totalPendiente = itemsFiltrados.reduce((s, i) => s + i.monto_pendiente, 0);
    const cantVencidos = itemsFiltrados.filter(i => i.dias_vencimiento < 0).length;

    return (
        <div className="space-y-6">
            {/* Cabecera */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Cobranza</h1>
                    <p className="text-gray-400 text-sm mt-1">Gestion de cobros pendientes — cheques y transferencias diferidas</p>
                </div>
                <button
                    onClick={cargar}
                    className="text-gray-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                    Actualizar
                </button>
            </div>

            {/* Totales rapidos */}
            {!loading && items.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Total por cobrar</p>
                        <p className="text-2xl font-bold text-white mt-1">{formatMonto(totalPendiente)}</p>
                        <p className="text-xs text-gray-500 mt-1">{itemsFiltrados.length} cobro{itemsFiltrados.length !== 1 ? 's' : ''} pendiente{itemsFiltrados.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className={`bg-slate-800 border rounded-xl p-4 ${cantVencidos > 0 ? 'border-red-700' : 'border-slate-700'}`}>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Vencidos</p>
                        <p className={`text-2xl font-bold mt-1 ${cantVencidos > 0 ? 'text-red-400' : 'text-gray-500'}`}>{cantVencidos}</p>
                        <p className="text-xs text-gray-500 mt-1">{cantVencidos > 0 ? 'Requieren atencion' : 'Sin vencidos'}</p>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 col-span-2 lg:col-span-1">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Distribucion</p>
                        <p className="text-sm text-white mt-1">
                            {items.filter(i => i.tipo === 'CHEQUE').length} cheques · {items.filter(i => i.tipo === 'TRANSFERENCIA').length} transferencias
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Total sin filtrar</p>
                    </div>
                </div>
            )}

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    placeholder="Buscar por cliente, pedido o local..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:border-primary"
                />
                <div className="flex gap-2">
                    {FILTROS_TIPO.map(f => (
                        <button
                            key={f.value}
                            onClick={() => setFiltroTipo(f.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filtroTipo === f.value
                                    ? 'bg-primary text-slate-900'
                                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-4">{error}</div>
            )}

            {/* Loading */}
            {loading && (
                <div className="text-center py-12 text-gray-400">Cargando cobranza...</div>
            )}

            {/* Sin resultados */}
            {!loading && !error && itemsFiltrados.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    {items.length === 0
                        ? 'No hay cobros pendientes'
                        : 'No hay resultados para el filtro aplicado'}
                </div>
            )}

            {/* TARJETAS MOBILE */}
            {!loading && itemsFiltrados.length > 0 && (
                <div className="lg:hidden space-y-3">
                    {itemsFiltrados.map((item, idx) => (
                        <div key={idx} className={`bg-slate-800 border rounded-xl p-4 space-y-3 ${item.dias_vencimiento < 0 ? 'border-red-700' : 'border-slate-700'}`}>
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="font-semibold text-white text-sm">{item.cliente_nombre || '—'}</p>
                                    <p className="text-xs text-gray-400">Pedido #{item.numero_pedido} · {item.tipo_documento || '—'} · {item.local_nombre || '—'}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <BadgeTipo tipo={item.tipo} />
                                    <BadgeVencimiento dias={item.dias_vencimiento} sinCheques={item.sin_cheques} />
                                    <BadgeEstadoPedido nombre={item.estado_pedido_nombre} color={item.estado_pedido_color} />
                                </div>
                            </div>
                            <div className="flex justify-between text-sm">
                                <div>
                                    <p className="text-gray-400 text-xs">Monto pendiente</p>
                                    <p className="text-white font-semibold">{formatMonto(item.monto_pendiente)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-400 text-xs">Vence</p>
                                    <p className="text-white">{formatFecha(item.fecha_vencimiento)}</p>
                                </div>
                                {item.tipo === 'CHEQUE' && item.cantidad_cheques && (
                                    <div className="text-right">
                                        <p className="text-gray-400 text-xs">Cheques</p>
                                        <p className="text-white">{item.cantidad_cheques}</p>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-400">{item.medio_pago_nombre}</p>
                            {item.sin_cheques && (
                                <div className="bg-orange-900/30 border border-orange-700 rounded-lg px-3 py-2 text-xs text-orange-300">
                                    Sin cheques registrados — usa "Gestionar cheques" para agregarlos
                                </div>
                            )}
                            <div className="flex gap-2 pt-1">
                                {item.tipo === 'CHEQUE' ? (
                                    <>
                                        <button
                                            onClick={() => abrirModalCheques(item)}
                                            className="flex-1 bg-indigo-700 hover:bg-indigo-600 text-white font-semibold text-sm py-2 rounded-lg transition-colors"
                                        >
                                            Gestionar cheques
                                        </button>
                                        <button
                                            onClick={() => abrirModalCambiarPago(item)}
                                            className="px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 text-sm transition-colors"
                                            title="Cobrar con otro medio de pago"
                                        >
                                            Cambiar pago
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => abrirConfirmar(item)}
                                        className="flex-1 bg-primary hover:bg-primary-dark text-slate-900 font-semibold text-sm py-2 rounded-lg transition-colors"
                                    >
                                        Confirmar recibo
                                    </button>
                                )}
                                {item.tipo === 'TRANSFERENCIA' && !item.entregado && (
                                    <button
                                        onClick={() => abrirAnular(item)}
                                        className="px-3 py-2 rounded-lg text-red-400 hover:bg-red-900/30 text-sm transition-colors"
                                    >
                                        Anular
                                    </button>
                                )}
                                <Link
                                    href={`/admin/pedidos/${item.pedido_id}`}
                                    className="px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 text-sm transition-colors"
                                >
                                    Pedido
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TABLA DESKTOP */}
            {!loading && itemsFiltrados.length > 0 && (
                <div className="hidden lg:block overflow-x-auto bg-slate-800 rounded-xl border border-slate-700">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tipo</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Documento</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Pedido</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Local</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Medio de Pago</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado Pedido</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Monto Pendiente</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Vencimiento</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {itemsFiltrados.map((item, idx) => (
                                <tr key={idx} className={`hover:bg-slate-700/40 ${item.dias_vencimiento < 0 ? 'bg-red-900/10' : ''}`}>
                                    <td className="px-4 py-3"><BadgeTipo tipo={item.tipo} /></td>
                                    <td className="px-4 py-3 text-sm text-gray-300">{item.tipo_documento || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-white font-medium">{item.cliente_nombre || '—'}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <Link href={`/admin/pedidos/${item.pedido_id}`} className="text-primary hover:underline">
                                            #{item.numero_pedido}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-300">{item.local_nombre || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-300">
                                        <div>{item.medio_pago_nombre || '—'}
                                            {item.tipo === 'CHEQUE' && item.cantidad_cheques != null && item.cantidad_cheques > 0 && (
                                                <span className="ml-2 text-xs text-gray-500">({item.cantidad_cheques} cheque{item.cantidad_cheques !== 1 ? 's' : ''})</span>
                                            )}
                                        </div>
                                        {item.sin_cheques && (
                                            <span className="text-xs text-orange-400">Sin cheques registrados</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <BadgeEstadoPedido nombre={item.estado_pedido_nombre} color={item.estado_pedido_color} />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right font-semibold text-white">
                                        {formatMonto(item.monto_pendiente)}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-gray-300">{formatFecha(item.fecha_vencimiento)}</span>
                                            <BadgeVencimiento dias={item.dias_vencimiento} sinCheques={item.sin_cheques} />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {item.tipo === 'CHEQUE' ? (
                                                <>
                                                    <button
                                                        onClick={() => abrirModalCheques(item)}
                                                        className="bg-indigo-700 hover:bg-indigo-600 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Gestionar cheques
                                                    </button>
                                                    <button
                                                        onClick={() => abrirModalCambiarPago(item)}
                                                        className="text-gray-400 hover:text-white text-xs font-medium"
                                                        title="Cobrar con otro medio de pago"
                                                    >
                                                        Cambiar pago
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => abrirConfirmar(item)}
                                                        className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Confirmar
                                                    </button>
                                                    {!item.entregado && (
                                                        <button
                                                            onClick={() => abrirAnular(item)}
                                                            className="text-red-400 hover:text-red-300 text-xs font-medium"
                                                        >
                                                            Anular
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-700/30 border-t border-slate-600">
                            <tr>
                                <td colSpan={7} className="px-4 py-3 text-sm text-gray-400 font-medium">
                                    {itemsFiltrados.length} cobro{itemsFiltrados.length !== 1 ? 's' : ''}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-bold text-white">
                                    {formatMonto(totalPendiente)}
                                </td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* MODAL CONFIRMAR TRANSFERENCIA */}
            {modalConfirmar && itemSeleccionado && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-xl">
                        <h2 className="text-lg font-bold text-white mb-1">Confirmar recibo de transferencia</h2>
                        <p className="text-gray-400 text-sm mb-4">
                            {itemSeleccionado.cliente_nombre} · Pedido #{itemSeleccionado.numero_pedido}
                        </p>
                        <div className="bg-slate-700 rounded-lg p-4 mb-4 space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Monto</span>
                                <span className="text-white font-semibold">{formatMonto(itemSeleccionado.monto_pendiente)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Vencimiento</span>
                                <span className="text-white">{formatFecha(itemSeleccionado.fecha_vencimiento)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Medio de pago</span>
                                <span className="text-white">{itemSeleccionado.medio_pago_nombre}</span>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm text-gray-300 mb-1">Observaciones (opcional)</label>
                            <input
                                type="text"
                                placeholder="N° transferencia, banco, etc."
                                value={obsConfirmar}
                                onChange={e => setObsConfirmar(e.target.value)}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                            />
                        </div>
                        {errorModal && <p className="text-red-400 text-sm mb-3">{errorModal}</p>}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setModalConfirmar(false)}
                                className="flex-1 py-2 rounded-lg text-gray-300 hover:bg-slate-700 text-sm transition-colors"
                                disabled={procesando}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmar}
                                disabled={procesando}
                                className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary-dark text-slate-900 font-semibold text-sm transition-colors disabled:opacity-50"
                            >
                                {procesando ? 'Confirmando...' : 'Confirmar recibo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ANULAR */}
            {modalAnular && itemSeleccionado && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 border border-red-800 rounded-xl p-6 max-w-md w-full shadow-xl">
                        <h2 className="text-lg font-bold text-white mb-1">Anular cobro pendiente</h2>
                        <p className="text-gray-400 text-sm mb-4">
                            {itemSeleccionado.cliente_nombre} · Pedido #{itemSeleccionado.numero_pedido}
                        </p>
                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
                            <p className="text-red-300 text-sm">
                                Al anular este cobro se liberará el crédito del cliente ({formatMonto(itemSeleccionado.monto_pendiente)}).
                                El pedido seguirá impago.
                            </p>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm text-gray-300 mb-1">Motivo (opcional)</label>
                            <input
                                type="text"
                                placeholder="Ej: Pedido cancelado, error de registro..."
                                value={obsAnular}
                                onChange={e => setObsAnular(e.target.value)}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                            />
                        </div>
                        {errorModal && <p className="text-red-400 text-sm mb-3">{errorModal}</p>}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setModalAnular(false)}
                                className="flex-1 py-2 rounded-lg text-gray-300 hover:bg-slate-700 text-sm transition-colors"
                                disabled={procesando}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAnular}
                                disabled={procesando}
                                className="flex-1 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                            >
                                {procesando ? 'Anulando...' : 'Anular cobro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CAMBIAR MEDIO DE PAGO */}
            {modalCambiarPago && itemCambiarPago && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between p-5 border-b border-slate-700">
                            <div>
                                <h2 className="text-white font-bold text-lg">Registrar cobro con otro medio</h2>
                                <p className="text-slate-400 text-sm mt-0.5">
                                    #{itemCambiarPago.numero_pedido} — {itemCambiarPago.cliente_nombre}
                                </p>
                            </div>
                            <button onClick={() => setModalCambiarPago(false)} className="text-slate-400 hover:text-white text-xl">X</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="bg-slate-700/50 rounded-lg p-3 text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Monto pendiente</span>
                                    <span className="text-white font-semibold">{formatMonto(itemCambiarPago.monto_pendiente)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Medio actual</span>
                                    <span className="text-indigo-300">{itemCambiarPago.medio_pago_nombre}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-300 text-sm font-medium mb-2">Nuevo medio de pago</label>
                                <div className="space-y-2">
                                    {mediosPago
                                        .filter(m => !m.permite_cheque)
                                        .map(medio => (
                                            <button
                                                key={medio.id}
                                                onClick={() => setMedioPagoNuevo(medio.id)}
                                                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                                                    medioPagoNuevo === medio.id
                                                        ? 'bg-primary/20 border-primary text-primary'
                                                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400'
                                                }`}
                                            >
                                                <span>{medio.nombre}</span>
                                                {(medio.plazo_dias ?? 0) > 0 && (
                                                    <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                                                        {medio.plazo_dias}d plazo
                                                    </span>
                                                )}
                                            </button>
                                        ))
                                    }
                                </div>
                            </div>

                            {medioPagoNuevo > 0 && (() => {
                                const m = mediosPago.find(x => x.id === medioPagoNuevo);
                                const diferido = (m?.plazo_dias ?? 0) > 0;
                                return diferido ? (
                                    <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 text-sm text-amber-300">
                                        El pedido seguira impago y aparecera como transferencia en cobranza. Vence en {m?.plazo_dias} dias.
                                    </div>
                                ) : (
                                    <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 text-sm text-green-300">
                                        El pedido quedara marcado como pagado y saldra de cobranza.
                                    </div>
                                );
                            })()}

                            {errorPago && <p className="text-red-400 text-sm bg-red-900/30 rounded p-2">{errorPago}</p>}
                        </div>
                        <div className="flex gap-3 px-5 pb-5">
                            <button
                                onClick={() => setModalCambiarPago(false)}
                                disabled={guardandoPago}
                                className="flex-1 py-2 rounded-lg text-gray-300 hover:bg-slate-700 text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCambiarPago}
                                disabled={guardandoPago || medioPagoNuevo === 0}
                                className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary-dark text-slate-900 font-semibold text-sm transition-colors disabled:opacity-50"
                            >
                                {guardandoPago ? 'Registrando...' : 'Confirmar cobro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL GESTIONAR CHEQUES */}
            {modalCheques && itemCheques && (() => {
                const resumen = pedidoConCheques?.resumen_cheques;
                const cheques = pedidoConCheques?.cheques ?? [];
                return (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 rounded-xl border border-slate-600 w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
                            <div className="flex items-center justify-between p-5 border-b border-slate-700 flex-shrink-0">
                                <div>
                                    <h2 className="text-white font-bold text-lg">Gestion de Cheques</h2>
                                    <p className="text-slate-400 text-sm mt-0.5">
                                        #{itemCheques.numero_pedido} — {itemCheques.cliente_nombre}
                                    </p>
                                </div>
                                <button onClick={cerrarModalCheques} className="text-slate-400 hover:text-white text-xl">X</button>
                            </div>

                            <div className="overflow-y-auto flex-1 p-5 space-y-5">
                                {resumen && (
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { label: 'Total cheques', value: resumen.total_cheques, cls: 'text-white' },
                                            { label: 'Monto total', value: '$' + Math.round(resumen.monto_total_cheques).toLocaleString('es-CL'), cls: 'text-white' },
                                            { label: 'Pendientes', value: resumen.cheques_pendientes, cls: 'text-yellow-400' },
                                            { label: 'Cobrados', value: resumen.cheques_cobrados, cls: 'text-green-400' },
                                        ].map(s => (
                                            <div key={s.label} className="bg-slate-700/60 rounded-lg p-3 text-center">
                                                <p className={s.cls + ' font-bold text-lg'}>{s.value}</p>
                                                <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {resumen?.todos_cobrados && (
                                    <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 text-center">
                                        <p className="text-green-400 font-semibold">Todos los cheques estan cobrados</p>
                                    </div>
                                )}

                                {cargandoCheques ? (
                                    <div className="text-center py-6 text-slate-400">Cargando cheques...</div>
                                ) : cheques.length === 0 ? (
                                    <p className="text-slate-500 text-sm text-center py-4">No hay cheques registrados aun.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {cheques.map(cheque => {
                                            const estadoObj = ESTADOS_CHEQUE.find(e => e.id === cheque.estado_id);
                                            const esCobrado = estadoObj?.codigo === 'COBRADO';
                                            const esRechazado = estadoObj?.codigo === 'RECHAZADO';
                                            return (
                                                <div key={cheque.id} className="bg-slate-700 rounded-lg p-4">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <p className="text-white font-semibold">Cheque #{cheque.numero_cheque}</p>
                                                            <p className="text-slate-400 text-sm">{cheque.banco?.nombre || 'Banco generico'}</p>
                                                            <p className="text-white font-bold text-lg">${Math.round(cheque.monto).toLocaleString('es-CL')}</p>
                                                            {cheque.librador_nombre && (
                                                                <p className="text-slate-400 text-xs">
                                                                    Librador: {cheque.librador_nombre}{cheque.librador_rut ? ' — ' + cheque.librador_rut : ''}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-slate-400 text-xs">Vencimiento</p>
                                                            <p className="text-sm text-white">{new Date(cheque.fecha_vencimiento).toLocaleDateString('es-CL')}</p>
                                                            {cheque.fecha_cobro && (
                                                                <p className="text-green-400 text-xs mt-1">Cobrado: {new Date(cheque.fecha_cobro).toLocaleDateString('es-CL')}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <select
                                                            value={cheque.estado_id}
                                                            onChange={e => handleCambiarEstadoCheque(cheque.id, parseInt(e.target.value))}
                                                            disabled={actualizandoChequeId === cheque.id}
                                                            className={`bg-slate-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                                                esCobrado ? 'border border-green-500/50' : esRechazado ? 'border border-red-500/50' : 'border border-slate-500'
                                                            }`}
                                                        >
                                                            {ESTADOS_CHEQUE.map(e => (
                                                                <option key={e.id} value={e.id}>{e.nombre}</option>
                                                            ))}
                                                        </select>
                                                        {actualizandoChequeId === cheque.id && (
                                                            <span className="text-slate-400 text-xs">Guardando...</span>
                                                        )}
                                                        <button
                                                            onClick={() => handleEliminarCheque(cheque.id)}
                                                            className="ml-auto text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-900/30 transition-colors"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="border-t border-slate-700 pt-4">
                                    <h3 className="text-white font-semibold mb-3">+ Agregar nuevo cheque</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-slate-400 text-xs mb-1">N° Cheque *</label>
                                            <input type="text" value={nuevoCheque.numero_cheque} onChange={e => setNuevoCheque(p => ({ ...p, numero_cheque: e.target.value }))} placeholder="Ej: 0012345" className="w-full bg-slate-700 border border-slate-500 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 text-xs mb-1">Banco *</label>
                                            <select value={nuevoCheque.banco_id} onChange={e => setNuevoCheque(p => ({ ...p, banco_id: parseInt(e.target.value) }))} className="w-full bg-slate-700 border border-slate-500 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                                                <option value={0}>Seleccionar banco...</option>
                                                {BANCOS.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 text-xs mb-1">Monto ($) *</label>
                                            <input type="number" value={nuevoCheque.monto} onChange={e => setNuevoCheque(p => ({ ...p, monto: e.target.value }))} placeholder="Ej: 500000" className="w-full bg-slate-700 border border-slate-500 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 text-xs mb-1">Fecha Vencimiento *</label>
                                            <input type="date" value={nuevoCheque.fecha_vencimiento} onChange={e => setNuevoCheque(p => ({ ...p, fecha_vencimiento: e.target.value }))} className="w-full bg-slate-700 border border-slate-500 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 text-xs mb-1">Fecha Emision</label>
                                            <input type="date" value={nuevoCheque.fecha_emision} onChange={e => setNuevoCheque(p => ({ ...p, fecha_emision: e.target.value }))} className="w-full bg-slate-700 border border-slate-500 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 text-xs mb-1">RUT Librador</label>
                                            <input type="text" value={nuevoCheque.librador_rut} onChange={e => setNuevoCheque(p => ({ ...p, librador_rut: e.target.value }))} placeholder="Ej: 12.345.678-9" className="w-full bg-slate-700 border border-slate-500 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-slate-400 text-xs mb-1">Nombre Librador *</label>
                                            <input type="text" value={nuevoCheque.librador_nombre} onChange={e => setNuevoCheque(p => ({ ...p, librador_nombre: e.target.value }))} placeholder="Nombre completo" className="w-full bg-slate-700 border border-slate-500 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-slate-400 text-xs mb-1">Observaciones</label>
                                            <input type="text" value={nuevoCheque.observaciones} onChange={e => setNuevoCheque(p => ({ ...p, observaciones: e.target.value }))} placeholder="Opcional..." className="w-full bg-slate-700 border border-slate-500 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                    {errorCheque && <p className="text-red-400 text-sm mt-3 bg-red-900/30 rounded p-2">{errorCheque}</p>}
                                    <button
                                        onClick={handleAgregarCheque}
                                        disabled={guardandoCheque}
                                        className="mt-3 w-full bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        {guardandoCheque ? 'Guardando...' : '+ Agregar Cheque'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex-shrink-0 px-5 pb-5 border-t border-slate-700 pt-4">
                                <button onClick={cerrarModalCheques} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
