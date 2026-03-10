'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getResumenCajas, getFrigorificoPdfUrl, type ResumenCajasPorFecha, type ResumenCajasVendedor, type ResumenCajasCorte } from '@/lib/api/preventa';

export default function ResumenCajasPage() {
  const today = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(today);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ResumenCajasPorFecha | null>(null);
  const [error, setError] = useState('');
  const [expandedVendedor, setExpandedVendedor] = useState<number | null>(null);

  const cargar = async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const result = await getResumenCajas(fecha);
      setData(result);
    } catch (e: any) {
      setError(e.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const formatCLP = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <a href="/admin/despacho" className="text-gray-400 hover:text-white text-sm">
          ← Despachos
        </a>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Resumen de Cajas por Vendedor
        </h1>
      </div>

      {/* Selector de fecha */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <button
            onClick={cargar}
            disabled={loading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md font-medium transition-colors"
          >
            {loading ? 'Cargando...' : 'Consultar'}
          </button>
          <button
            onClick={() => window.open(getFrigorificoPdfUrl(fecha), '_blank')}
            className="px-5 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-md font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF todos los proveedores
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Totales */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-5 text-center border border-emerald-200 dark:border-emerald-700">
              <p className="text-sm text-emerald-700 dark:text-emerald-400">Total Cajas del Día</p>
              <p className="text-4xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">{data.total_cajas}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-center border border-blue-200 dark:border-blue-700">
              <p className="text-sm text-blue-700 dark:text-blue-400">Total Pedidos Activos</p>
              <p className="text-4xl font-bold text-blue-800 dark:text-blue-300 mt-1">{data.total_pedidos}</p>
            </div>
          </div>

          {/* Tabla por vendedor */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Por Vendedor</h2>
            </div>
            {data.por_vendedor.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-10">
                No hay cajas vendidas para esta fecha.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="text-left px-4 py-3 text-gray-700 dark:text-gray-300 font-semibold">Vendedor</th>
                    <th className="text-center px-4 py-3 text-gray-700 dark:text-gray-300 font-semibold">Pedidos</th>
                    <th className="text-center px-4 py-3 text-gray-700 dark:text-gray-300 font-semibold">Total Cajas</th>
                    <th className="text-right px-4 py-3 text-gray-700 dark:text-gray-300 font-semibold">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {data.por_vendedor.map((v: ResumenCajasVendedor) => (
                    <React.Fragment key={v.vendedor_id}>
                      <tr className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{v.vendedor_nombre}</td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{v.cantidad_pedidos}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 font-bold px-3 py-1 rounded">
                            {v.cantidad_cajas}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setExpandedVendedor(expandedVendedor === v.vendedor_id ? null : v.vendedor_id)}
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 ml-auto"
                          >
                            {expandedVendedor === v.vendedor_id
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />}
                            Ver pedidos
                          </button>
                        </td>
                      </tr>
                      {expandedVendedor === v.vendedor_id && (
                        <tr className="bg-gray-50 dark:bg-gray-900/30">
                          <td colSpan={4} className="px-8 py-4">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                  <th className="text-left py-1.5">N° Pedido</th>
                                  <th className="text-left py-1.5">Cliente</th>
                                  <th className="text-center py-1.5">Cajas</th>
                                  <th className="text-right py-1.5">Monto</th>
                                </tr>
                              </thead>
                              <tbody>
                                {v.pedidos.map(p => (
                                  <tr key={p.pedido_id} className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="py-1.5 text-blue-600 dark:text-blue-400 font-mono">{p.numero_pedido}</td>
                                    <td className="py-1.5 text-gray-700 dark:text-gray-300">{p.cliente}</td>
                                    <td className="py-1.5 text-center font-semibold text-emerald-700 dark:text-emerald-400">{p.cajas}</td>
                                    <td className="py-1.5 text-right text-gray-600 dark:text-gray-400">{formatCLP(p.monto_total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {/* Fila total */}
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 font-bold">
                    <td className="px-4 py-3 text-gray-900 dark:text-white">TOTAL</td>
                    <td className="px-4 py-3 text-center text-gray-900 dark:text-white">{data.total_pedidos}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-emerald-600 text-white font-bold px-3 py-1 rounded">
                        {data.total_cajas}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Tabla por corte */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Por Corte</h2>
            </div>
            {data.por_corte.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-10">
                No hay cortes para esta fecha.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="text-left px-4 py-3 text-gray-700 dark:text-gray-300 font-semibold">Corte / Producto</th>
                    <th className="text-center px-4 py-3 text-gray-700 dark:text-gray-300 font-semibold">Total Cajas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.por_corte.map((c: ResumenCajasCorte) => (
                    <tr key={c.producto_id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{c.corte}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-bold px-3 py-1 rounded">
                          {c.total_cajas}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 font-bold">
                    <td className="px-4 py-3 text-gray-900 dark:text-white">TOTAL</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-emerald-600 text-white font-bold px-3 py-1 rounded">
                        {data.total_cajas}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
