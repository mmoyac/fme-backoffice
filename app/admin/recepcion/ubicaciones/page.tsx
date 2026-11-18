'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUbicaciones, type Ubicacion } from '@/lib/api/recepcion';

export default function UbicacionesPage() {
  const router = useRouter();
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarUbicaciones();
  }, []);

  const cargarUbicaciones = async () => {
    try {
      setLoading(true);
      const data = await getUbicaciones();
      setUbicaciones(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar ubicaciones');
    } finally {
      setLoading(false);
    }
  };

  const calcularOcupacion = (ubicacion: Ubicacion) => {
    // Por ahora retornar 0, más tarde se puede conectar con lotes
    return 0;
  };

  const getColorCapacidad = (ocupado: number, total: number) => {
    if (total === 0) return 'bg-gray-500';
    const porcentaje = (ocupado / total) * 100;
    if (porcentaje >= 90) return 'bg-red-500';
    if (porcentaje >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">Ubicaciones del Almacén</h1>
          <p className="text-gray-400">Gestión de ubicaciones y capacidades para el almacén WMS</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push('/admin/recepcion')}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Volver a Recepción
          </button>
        </div>
      </div>

      {/* Contenido */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white text-gray-900 rounded-lg p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando ubicaciones...</p>
        </div>
      ) : (
        <>
          {/* Mapa visual del almacén */}
          <div className="bg-white text-gray-900 rounded-lg border border-gray-200 p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🏗️ Mapa del Almacén</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Sector A - Cámaras Frío */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h4 className="font-semibold text-blue-900 mb-3">❄️ Sector A - Cámaras Frío</h4>
                <div className="space-y-2">
                  {ubicaciones
                    .filter(u => u.codigo.startsWith('P1-A'))
                    .map(ubicacion => {
                      const ocupado = calcularOcupacion(ubicacion);
                      const colorCapacidad = getColorCapacidad(ocupado, ubicacion.capacidad_maxima);
                      
                      return (
                        <div key={ubicacion.id} className="flex items-center justify-between bg-white text-gray-900 p-3 rounded border">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{ubicacion.codigo}</div>
                            <div className="text-xs text-gray-600">{ubicacion.nombre}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{ocupado}/{ubicacion.capacidad_maxima}</div>
                            <div className={`w-16 h-2 rounded ${colorCapacidad} mt-1`}></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Sector B - Estanterías */}
              <div className="border rounded-lg p-4 bg-green-50">
                <h4 className="font-semibold text-green-900 mb-3">📚 Sector B - Estanterías</h4>
                <div className="space-y-2">
                  {ubicaciones
                    .filter(u => u.codigo.startsWith('P1-B'))
                    .map(ubicacion => {
                      const ocupado = calcularOcupacion(ubicacion);
                      const colorCapacidad = getColorCapacidad(ocupado, ubicacion.capacidad_maxima);
                      
                      return (
                        <div key={ubicacion.id} className="flex items-center justify-between bg-white text-gray-900 p-3 rounded border">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{ubicacion.codigo}</div>
                            <div className="text-xs text-gray-600">{ubicacion.nombre}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{ocupado}/{ubicacion.capacidad_maxima}</div>
                            <div className={`w-16 h-2 rounded ${colorCapacidad} mt-1`}></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Sector C y Otros */}
              <div className="border rounded-lg p-4 bg-purple-50">
                <h4 className="font-semibold text-purple-900 mb-3">🔧 Sector C - Preparación</h4>
                <div className="space-y-2">
                  {ubicaciones
                    .filter(u => u.codigo.startsWith('P1-C') || u.codigo === 'CUARENTENA')
                    .map(ubicacion => {
                      const ocupado = calcularOcupacion(ubicacion);
                      const colorCapacidad = getColorCapacidad(ocupado, ubicacion.capacidad_maxima);
                      
                      return (
                        <div key={ubicacion.id} className="flex items-center justify-between bg-white text-gray-900 p-3 rounded border">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{ubicacion.codigo}</div>
                            <div className="text-xs text-gray-600">{ubicacion.nombre}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{ocupado}/{ubicacion.capacidad_maxima}</div>
                            <div className={`w-16 h-2 rounded ${colorCapacidad} mt-1`}></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla detallada */}
          <div className="bg-white text-gray-900 rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">📋 Detalle de Ubicaciones</h3>
            </div>
            
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-[14%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="w-[18%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="w-[24%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Capacidad
                    </th>
                    <th className="w-[20%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ocupación
                    </th>
                    <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ubicaciones.map((ubicacion) => {
                    const ocupado = calcularOcupacion(ubicacion);
                    const porcentajeOcupacion = ubicacion.capacidad_maxima > 0 
                      ? (ocupado / ubicacion.capacidad_maxima) * 100 
                      : 0;
                    
                    return (
                      <tr key={ubicacion.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900 break-all">{ubicacion.codigo}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900 truncate" title={ubicacion.nombre}>{ubicacion.nombre}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-600 break-words">{ubicacion.descripcion}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{ubicacion.capacidad_maxima} cajas</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-y-1">
                            <div className="text-sm font-medium text-gray-900 mr-2">
                              {ocupado}/{ubicacion.capacidad_maxima}
                            </div>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${getColorCapacidad(ocupado, ubicacion.capacidad_maxima)}`}
                                style={{ width: `${Math.min(porcentajeOcupacion, 100)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 ml-2">
                              {porcentajeOcupacion.toFixed(0)}%
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            ubicacion.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {ubicacion.activo ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Celular: una tarjeta por ubicación */}
            <ul className="lg:hidden divide-y divide-gray-200">
              {ubicaciones.map((ubicacion) => {
                const ocupado = calcularOcupacion(ubicacion);
                const porcentajeOcupacion = ubicacion.capacidad_maxima > 0
                  ? (ocupado / ubicacion.capacidad_maxima) * 100
                  : 0;
                return (
                  <li key={ubicacion.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 break-all">{ubicacion.codigo}</div>
                        <div className="text-sm text-gray-900 break-words">{ubicacion.nombre}</div>
                      </div>
                      <span className={`shrink-0 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        ubicacion.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {ubicacion.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    {ubicacion.descripcion && <div className="text-sm text-gray-600 break-words">{ubicacion.descripcion}</div>}
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <span className="font-medium">{ocupado}/{ubicacion.capacidad_maxima}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getColorCapacidad(ocupado, ubicacion.capacidad_maxima)}`}
                          style={{ width: `${Math.min(porcentajeOcupacion, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{porcentajeOcupacion.toFixed(0)}%</span>
                    </div>
                    <div className="text-xs text-gray-500">Capacidad: {ubicacion.capacidad_maxima} cajas</div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Leyenda */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">📌 Leyenda de Ocupación</h4>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-2 bg-green-500 rounded mr-2"></div>
                <span>Disponible (&lt; 70%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-2 bg-yellow-500 rounded mr-2"></div>
                <span>Ocupado (70-90%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-2 bg-red-500 rounded mr-2"></div>
                <span>Lleno (&gt; 90%)</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}