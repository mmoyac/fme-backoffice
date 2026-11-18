'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExistenciasTab } from './components/ExistenciasTab';
import { TransferenciasTab } from './components/TransferenciasTab';
import { HistorialTab } from './components/HistorialTab';
import { ConteoTab } from './components/ConteoTab';
import { ValorizacionTab } from './components/ValorizacionTab';
import { useAuth } from '@/lib/AuthProvider';
import { localDeAlcance } from '@/lib/alcanceLocal';

export default function InventarioPage() {
    const [activeTab, setActiveTab] = useState<'existencias' | 'conteo' | 'transferencias' | 'historial' | 'valorizacion'>('existencias');
    const [conteoAbrir, setConteoAbrir] = useState<number | null>(null);
    // null = alcance total (admin/superadmin/sin local); número = usuario de tienda (add-inventario-alcance-por-local)
    const { user } = useAuth();
    const localPropio = localDeAlcance(user);
    // Filtros compartidos: se mantienen al cambiar de pestaña
    const [busqueda, setBusqueda] = useState('');
    const [localFiltro, setLocalFiltro] = useState(0);
    const filtroCompartido = { busqueda, setBusqueda, local: localFiltro, setLocal: setLocalFiltro };

    return (
        <div>
            {/* Header con botones */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">Inventario</h1>
                    <p className="text-gray-400">Gestión de stock regular y cajas por proveedor</p>
                </div>
                <div className="space-x-3">
                    <Link
                        href="/admin/inventario/stock-cajas"
                        className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
                    >
                        <span className="mr-2">📦</span>
                        Stock de Cajas
                    </Link>
                </div>
            </div>

            {/* Información */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-white mb-2">📊 Gestión de Inventario</h4>
                <p className="text-sm text-gray-300 mb-2">
                    Gestione el stock regular de productos por local y el <strong>stock de cajas por proveedor</strong> 
                    que se alimenta desde los enrolamientos de recepción.
                </p>
                <div className="flex items-center text-sm text-blue-400">
                    <span className="mr-2">💡</span>
                    <span>Tip: Use "Stock de Cajas" para ver el inventario de cajas variables por proveedor.</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg mb-6 w-fit max-w-full overflow-x-auto whitespace-nowrap">
                <button
                    onClick={() => setActiveTab('existencias')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'existencias'
                            ? 'bg-primary text-slate-900 shadow'
                            : 'text-gray-400 hover:text-white hover:bg-slate-700'
                        }`}
                >
                    Existencias
                </button>
                <button
                    onClick={() => setActiveTab('conteo')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'conteo'
                            ? 'bg-primary text-slate-900 shadow'
                            : 'text-gray-400 hover:text-white hover:bg-slate-700'
                        }`}
                >
                    Conteo
                </button>
                <button
                    onClick={() => setActiveTab('transferencias')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'transferencias'
                            ? 'bg-primary text-slate-900 shadow'
                            : 'text-gray-400 hover:text-white hover:bg-slate-700'
                        }`}
                >
                    Transferencias
                </button>
                <button
                    onClick={() => setActiveTab('historial')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'historial'
                            ? 'bg-primary text-slate-900 shadow'
                            : 'text-gray-400 hover:text-white hover:bg-slate-700'
                        }`}
                >
                    Historial
                </button>
                <button
                    onClick={() => setActiveTab('valorizacion')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'valorizacion'
                            ? 'bg-primary text-slate-900 shadow'
                            : 'text-gray-400 hover:text-white hover:bg-slate-700'
                        }`}
                >
                    Valorización
                </button>
            </div>

            {/* Content */}
            <div>
                {activeTab === 'existencias' && <ExistenciasTab localPropio={localPropio} filtroCompartido={filtroCompartido} />}
                {activeTab === 'conteo' && <ConteoTab conteoInicialId={conteoAbrir} localPropio={localPropio} filtroCompartido={filtroCompartido} />}
                {activeTab === 'transferencias' && <TransferenciasTab localPropio={localPropio} filtroCompartido={filtroCompartido} />}
                {activeTab === 'valorizacion' && <ValorizacionTab localPropio={localPropio} filtroCompartido={filtroCompartido} />}
                {activeTab === 'historial' && (
                    <HistorialTab localPropio={localPropio} filtroCompartido={filtroCompartido} onVerConteo={(id) => { setConteoAbrir(id); setActiveTab('conteo'); }} />
                )}
            </div>
        </div>
    );
}
