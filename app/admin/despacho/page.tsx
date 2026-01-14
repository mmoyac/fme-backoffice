'use client';

import React from 'react';
import { Truck, Package, MapPin, Clock } from 'lucide-react';

export default function DespachoPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestión de Despachos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sistema de picking, empaque y entrega de pedidos
          </p>
        </div>
      </div>

      {/* Cards de navegación */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Lista de Despachos */}
        <a 
          href="/admin/despacho/lista" 
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Lista de Despachos
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Ver todos los despachos asignados
              </p>
            </div>
            <Truck className="h-8 w-8 text-blue-500" />
          </div>
        </a>

        {/* Asignar Despacho */}
        <a 
          href="/admin/despacho/asignar" 
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Asignar Despachos
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Asignar pedidos a despachadores
              </p>
            </div>
            <Package className="h-8 w-8 text-green-500" />
          </div>
        </a>

        {/* Picking */}
        <a 
          href="/admin/despacho/picking" 
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Picking
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Interface de picking móvil
              </p>
            </div>
            <MapPin className="h-8 w-8 text-yellow-500" />
          </div>
        </a>

        {/* Dashboard */}
        <a 
          href="/admin/despacho/dashboard" 
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Dashboard
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Métricas y reportes
              </p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </a>
      </div>

      {/* Calculadora existente */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Herramientas Adicionales
        </h2>
        <div className="space-y-2">
          <a 
            href="/admin/despacho/calculadora" 
            className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
          >
            Calculadora de Costos de Despacho
          </a>
        </div>
      </div>
    </div>
  );
}