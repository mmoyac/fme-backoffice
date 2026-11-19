'use client';

import React from 'react';
import Link from 'next/link';
import { Truck, Package, MapPin, CarFront, BarChart3 } from 'lucide-react';
import BandejaDespacho from '@/components/despacho/BandejaDespacho';

export default function DespachoPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestión de Despachos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Pendientes por despachar, rutas y seguimiento de entregas
          </p>
        </div>
      </div>

      <BandejaDespacho />

      <h2 className="text-lg font-semibold text-gray-900 dark:text-white pt-2">Herramientas</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Hojas de Ruta */}
        <Link
          href="/admin/despacho/rutas"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Hojas de Ruta</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Crear rutas y registrar entregas
              </p>
            </div>
            <Truck className="h-8 w-8 text-blue-500" />
          </div>
        </Link>

        {/* Picking de Cajas */}
        <Link
          href="/admin/despacho/picking-cajas"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Picking de Cajas</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Escanear cajas del frigorífico
              </p>
            </div>
            <Package className="h-8 w-8 text-orange-500" />
          </div>
        </Link>

        {/* Vehículos */}
        <Link
          href="/admin/vehiculos"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Vehículos</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Gestionar la flota de camiones y furgones
              </p>
            </div>
            <CarFront className="h-8 w-8 text-emerald-500" />
          </div>
        </Link>

        {/* Resumen de cajas */}
        <Link
          href="/admin/despacho/resumen-cajas"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Resumen de Cajas por Vendedor</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Cajas vendidas por fecha y vendedor
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-500" />
          </div>
        </Link>

        {/* Calculadora */}
        <Link
          href="/admin/despacho/calculadora"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Calculadora de Costos</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Estimar costo de despacho por distancia
              </p>
            </div>
            <MapPin className="h-8 w-8 text-yellow-500" />
          </div>
        </Link>

      </div>
    </div>
  );
}
