'use client';

import { useState } from 'react';
import { ExistenciasTab } from './components/ExistenciasTab';
import { TransferenciasTab } from './components/TransferenciasTab';
import { HistorialTab } from './components/HistorialTab';

export default function InventarioPage() {
    const [activeTab, setActiveTab] = useState<'existencias' | 'transferencias' | 'historial'>('existencias');

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-6">Inventario</h1>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg mb-6 w-fit">
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
            </div>

            {/* Content */}
            <div>
                {activeTab === 'existencias' && <ExistenciasTab />}
                {activeTab === 'transferencias' && <TransferenciasTab />}
                {activeTab === 'historial' && <HistorialTab />}
            </div>
        </div>
    );
}
