'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  getEnrolamientoById,
  getLotes,
  type EnrolamientoResponse,
  type LoteList,
  formatearFecha,
  obtenerColorEstado
} from '@/lib/api/recepcion';

export default function EnrolamientoDetallePage() {
  const params = useParams();
  const enrolamientoId = Number(params.id);
  
  const [enrolamiento, setEnrolamiento] = useState<EnrolamientoResponse | null>(null);
  const [lotes, setLotes] = useState<LoteList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, [enrolamientoId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar enrolamiento y lotes
      const [enrolamientoData, lotesData] = await Promise.all([
        getEnrolamientoById(enrolamientoId),
        getLotes({ enrolamiento_id: enrolamientoId })
      ]);

      setEnrolamiento(enrolamientoData);
      setLotes(lotesData);

    } catch (err) {
      console.error('Error cargando datos:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !enrolamiento) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400 mb-4">
          {error || 'Enrolamiento no encontrado'}
        </div>
        <Link
          href="/admin/recepcion/enrolamientos"
          className="text-primary hover:text-primary-dark"
        >
          ← Volver a Enrolamientos
        </Link>
      </div>
    );
  }

  // Agrupar lotes por producto
  const lotesPorProducto = lotes.reduce((acc, lote) => {
    const nombreProducto = lote.producto_nombre || 'Sin producto';
    if (!acc[nombreProducto]) {
      acc[nombreProducto] = [];
    }
    acc[nombreProducto].push(lote);
    return acc;
  }, {} as Record<string, LoteList[]>);

  const totalLotes = lotes.length;
  const totalPeso = lotes.reduce((sum, lote) => sum + (lote.peso_actual || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <h1 className="text-3xl font-bold text-white">
              Enrolamiento #{enrolamiento.id}
            </h1>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${obtenerColorEstado(enrolamiento.estado?.nombre || '')}`}>
              {enrolamiento.estado?.nombre || 'Sin estado'}
            </span>
          </div>
          <p className="text-gray-400">Detalles completos del enrolamiento</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/recepcion/enrolamientos"
            className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-slate-700 transition-colors"
          >
            ← Volver
          </Link>
          <Link
            href={`/admin/recepcion/lotes?enrolamiento=${enrolamiento.id}`}
            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            Gestionar Cajas
          </Link>
        </div>
      </div>

      {/* Información del Enrolamiento */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Información del Vehículo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Patente</label>
            <div className="text-white font-mono text-lg">{enrolamiento.patente}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Vehículo</label>
            <div className="text-white">{enrolamiento.tipo_vehiculo?.nombre || 'No especificado'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Chofer</label>
            <div className="text-white">{enrolamiento.chofer}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Documento</label>
            <div className="text-white font-mono">{enrolamiento.numero_documento}</div>
          </div>
        </div>
      </div>

      {/* Información del Proveedor */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Información del Proveedor</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Proveedor</label>
            <div className="text-white text-lg">{enrolamiento.proveedor?.nombre || 'No especificado'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">RUT</label>
            <div className="text-white font-mono">{enrolamiento.proveedor?.rut || 'No disponible'}</div>
          </div>
        </div>
      </div>

      {/* Fechas y Estado */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Control de Proceso</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Fecha de Inicio</label>
            <div className="text-white">{formatearFecha(enrolamiento.fecha_inicio)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Fecha de Término</label>
            <div className="text-white">
              {enrolamiento.fecha_termino ? formatearFecha(enrolamiento.fecha_termino) : 'En proceso'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Usuario Registro</label>
            <div className="text-white">{enrolamiento.usuario_registro?.nombre_completo || 'No disponible'}</div>
          </div>
        </div>
        
        {enrolamiento.notas && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">Notas</label>
            <div className="text-white bg-slate-700 p-3 rounded border">{enrolamiento.notas}</div>
          </div>
        )}
      </div>

      {/* Resumen de Cajas */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Resumen de Cajas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-slate-700 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-primary">{totalLotes}</div>
            <div className="text-gray-300">Total Cajas</div>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-green-400">{totalPeso.toFixed(1)} kg</div>
            <div className="text-gray-300">Peso Total</div>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-blue-400">{Object.keys(lotesPorProducto).length}</div>
            <div className="text-gray-300">Tipos de Producto</div>
          </div>
        </div>

        {/* Detalle por Producto */}
        {Object.keys(lotesPorProducto).length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Detalle por Producto</h3>
            <div className="space-y-3">
              {Object.entries(lotesPorProducto).map(([producto, productLotes]) => (
                <div key={producto} className="bg-slate-700 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-white font-medium">{producto}</div>
                      <div className="text-sm text-gray-300">{productLotes.length} cajas</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-mono">
                        {productLotes.reduce((sum, lote) => sum + (lote.peso_actual || 0), 0).toFixed(1)} kg
                      </div>
                      <div className="text-sm text-gray-300">peso total</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lista de Lotes */}
      {totalLotes > 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Cajas Individuales</h2>
            <Link
              href={`/admin/recepcion/lotes?enrolamiento=${enrolamiento.id}`}
              className="text-primary hover:text-primary-dark text-sm"
            >
              Ver todas las cajas →
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Código Lote
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Peso Actual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {lotes.slice(0, 10).map((lote) => (
                  <tr key={lote.id} className="hover:bg-slate-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">
                      {lote.codigo_lote}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {lote.producto_nombre || 'Sin producto'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {lote.peso_actual ? `${lote.peso_actual} kg` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {lote.ubicacion_codigo || 'Sin ubicación'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        lote.disponible_venta 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {lote.disponible_venta ? 'Disponible' : 'En proceso'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {lotes.length > 10 && (
              <div className="mt-4 text-center">
                <Link
                  href={`/admin/recepcion/lotes?enrolamiento=${enrolamiento.id}`}
                  className="text-primary hover:text-primary-dark"
                >
                  Ver las {lotes.length - 10} cajas restantes
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {totalLotes === 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
          <div className="text-gray-400 mb-4">Este enrolamiento aún no tiene cajas asignadas</div>
          <Link
            href={`/admin/recepcion/lotes?enrolamiento=${enrolamiento.id}`}
            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            Agregar Cajas
          </Link>
        </div>
      )}
    </div>
  );
}