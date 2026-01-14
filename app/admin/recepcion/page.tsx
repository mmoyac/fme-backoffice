'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RecepcionPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Recepción de Mercancías</h1>
        <p className="text-gray-400">Gestión de enrolamientos y control de cajas con trazabilidad WMS</p>
      </div>

      {/* Cards de navegación */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Enrolamientos */}
        <Link href="/admin/recepcion/enrolamientos" 
              className="block p-6 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-750 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🚛</span>
            </div>
            <span className="text-sm text-gray-400">Gestionar</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Enrolamientos</h3>
          <p className="text-gray-400 text-sm">
            Registrar llegada de vehículos y controlar el proceso de recepción desde inicio hasta finalización.
          </p>
        </Link>

        {/* Lotes / Cajas */}
        <Link href="/admin/recepcion/lotes"
              className="block p-6 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-750 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
            <span className="text-sm text-gray-400">Escanear</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Lotes / Cajas</h3>
          <p className="text-gray-400 text-sm">
            Procesar cajas individuales, escanear códigos QR, registrar pesos y asignar ubicaciones.
          </p>
        </Link>

        {/* Ubicaciones */}
        <Link href="/admin/recepcion/ubicaciones"
              className="block p-6 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-750 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📍</span>
            </div>
            <span className="text-sm text-gray-400">Configurar</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Ubicaciones</h3>
          <p className="text-gray-400 text-sm">
            Gestionar ubicaciones del almacén, capacidades y asignación automática de espacios.
          </p>
        </Link>

      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="text-2xl font-bold text-primary">-</div>
          <div className="text-sm text-gray-400">Enrolamientos Activos</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="text-2xl font-bold text-green-500">-</div>
          <div className="text-sm text-gray-400">Cajas Procesadas Hoy</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="text-2xl font-bold text-purple-500">-</div>
          <div className="text-sm text-gray-400">Cajas Disponibles</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="text-2xl font-bold text-amber-500">-</div>
          <div className="text-sm text-gray-400">Próximas a Vencer</div>
        </div>
      </div>

      {/* Información importante */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-2">💡 Flujo de Recepción de Mercancías</h4>
        <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
          <li><strong className="text-white">Registrar Enrolamiento:</strong> Cuando llega un vehículo del proveedor</li>
          <li><strong className="text-white">Procesar Cajas:</strong> Escanear cada caja individual (QR, peso, foto)</li>
          <li><strong className="text-white">Asignar Ubicación:</strong> Colocar en ubicación específica del almacén</li>
          <li><strong className="text-white">Finalizar Enrolamiento:</strong> Marcar como completado para activar ventas</li>
        </ol>
      </div>
    </div>
  );
}