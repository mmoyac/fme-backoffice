'use client';

/**
 * Módulos contratados por un tenant (consola de plataforma, change add-modulos-tenant).
 * Al marcar un módulo se marcan sus requisitos; al desmarcarlo se desmarcan los que dependen
 * de él. El backend vuelve a validar las dependencias (422 si la combinación no es válida).
 */
import { useEffect, useMemo, useState } from 'react';
import { AuthService } from '@/lib/auth';

interface ModuloCatalogo {
    codigo: string;
    nombre: string;
    requiere: string[];
}

interface Props {
    tenant: { id: number; nombre: string };
    onClose: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const headers = () => ({
    Authorization: `Bearer ${AuthService.getSuperadminToken()}`,
    'Content-Type': 'application/json',
});

function conRequisitos(codigo: string, catalogo: ModuloCatalogo[], acc = new Set<string>()): Set<string> {
    acc.add(codigo);
    for (const r of catalogo.find(m => m.codigo === codigo)?.requiere ?? []) {
        if (!acc.has(r)) conRequisitos(r, catalogo, acc);
    }
    return acc;
}

function conDependientes(codigo: string, catalogo: ModuloCatalogo[], acc = new Set<string>()): Set<string> {
    acc.add(codigo);
    for (const m of catalogo) {
        if (m.requiere.includes(codigo) && !acc.has(m.codigo)) conDependientes(m.codigo, catalogo, acc);
    }
    return acc;
}

export default function ModulosTenantModal({ tenant, onClose }: Props) {
    const [catalogo, setCatalogo] = useState<ModuloCatalogo[]>([]);
    const [originales, setOriginales] = useState<Set<string>>(new Set());
    const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [cRes, mRes] = await Promise.all([
                    fetch(`${API_URL}/api/superadmin/modulos`, { headers: headers() }),
                    fetch(`${API_URL}/api/superadmin/tenants/${tenant.id}/modulos`, { headers: headers() }),
                ]);
                if (!cRes.ok || !mRes.ok) throw new Error('No se pudieron cargar los módulos');
                const cat: ModuloCatalogo[] = await cRes.json();
                const actuales = new Set<string>((await mRes.json()).modulos);
                setCatalogo(cat);
                setOriginales(actuales);
                setSeleccion(new Set(actuales));
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Error al cargar');
            } finally {
                setCargando(false);
            }
        })();
    }, [tenant.id]);

    const nombre = (c: string) => catalogo.find(m => m.codigo === c)?.nombre ?? c;

    const alternar = (codigo: string) => {
        const nueva = new Set(seleccion);
        if (nueva.has(codigo)) {
            const quitar = conDependientes(codigo, catalogo);
            quitar.forEach(m => nueva.delete(m));
            const extra = Array.from(quitar).filter(m => m !== codigo && seleccion.has(m));
            setAviso(extra.length ? `También se quitó: ${extra.map(nombre).join(', ')} (dependen de ${nombre(codigo)})` : null);
        } else {
            const agregar = conRequisitos(codigo, catalogo);
            const extra = Array.from(agregar).filter(m => m !== codigo && !seleccion.has(m));
            agregar.forEach(m => nueva.add(m));
            setAviso(extra.length ? `También se agregó: ${extra.map(nombre).join(', ')} (requisito de ${nombre(codigo)})` : null);
        }
        setSeleccion(nueva);
    };

    const cambios = useMemo(() => {
        const agregados = Array.from(seleccion).filter(m => !originales.has(m));
        const quitados = Array.from(originales).filter(m => !seleccion.has(m));
        return { agregados, quitados };
    }, [seleccion, originales]);

    const guardar = async () => {
        if (cambios.quitados.length) {
            const ok = confirm(
                `Se quitarán a ${tenant.nombre}: ${cambios.quitados.map(nombre).join(', ')}.\n` +
                'Sus usuarios dejarán de ver esos menús y las APIs responderán "módulo no contratado". ¿Continuar?'
            );
            if (!ok) return;
        }
        setGuardando(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/api/superadmin/tenants/${tenant.id}/modulos`, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify({ modulos: Array.from(seleccion) }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'No se pudo guardar');
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al guardar');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b border-slate-700">
                    <h2 className="text-lg font-semibold text-white">Módulos de {tenant.nombre}</h2>
                    <p className="text-xs text-slate-400 mt-1">
                        El núcleo (dashboard, productos, clientes, precios, locales, usuarios, mantenedores, alertas) siempre está incluido.
                    </p>
                </div>

                <div className="px-6 py-4 overflow-y-auto flex-1">
                    {cargando ? (
                        <p className="text-slate-400">Cargando...</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {catalogo.map(m => (
                                <label
                                    key={m.codigo}
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                        seleccion.has(m.codigo) ? 'border-primary bg-slate-700/60' : 'border-slate-700 hover:bg-slate-700/30'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="mt-1 accent-amber-500"
                                        checked={seleccion.has(m.codigo)}
                                        onChange={() => alternar(m.codigo)}
                                    />
                                    <span>
                                        <span className="block text-sm text-white font-medium">{m.nombre}</span>
                                        {m.requiere.length > 0 && (
                                            <span className="block text-xs text-slate-400">
                                                Requiere: {m.requiere.map(nombre).join(', ')}
                                            </span>
                                        )}
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                    {aviso && <p className="text-xs text-amber-400 mt-3">{aviso}</p>}
                    {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
                </div>

                <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400">
                        {cambios.agregados.length + cambios.quitados.length === 0
                            ? 'Sin cambios'
                            : `+${cambios.agregados.length} / −${cambios.quitados.length}`}
                    </span>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 rounded text-sm text-slate-300 hover:text-white">
                            Cancelar
                        </button>
                        <button
                            onClick={guardar}
                            disabled={guardando || cargando || cambios.agregados.length + cambios.quitados.length === 0}
                            className="bg-primary hover:bg-amber-600 disabled:opacity-50 text-slate-900 px-4 py-2 rounded text-sm font-semibold"
                        >
                            {guardando ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
