'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  getEnrolamientos, 
  getTiposVehiculo, 
  getEstadosEnrolamiento, 
  getProveedoresCarnes,
  updateEnrolamiento,
  type EnrolamientoList,
  type TipoVehiculo,
  type EstadoEnrolamiento,
  type ProveedorCarne,
  formatearFecha,
  obtenerColorEstado
} from '@/lib/api/recepcion';

export default function EnrolamientosPage() {
  const [enrolamientos, setEnrolamientos] = useState<EnrolamientoList[]>([]);
  const [tiposVehiculo, setTiposVehiculo] = useState<TipoVehiculo[]>([]);
  const [estados, setEstados] = useState<EstadoEnrolamiento[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorCarne[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<number | ''>('');
  const [filtroProveedor, setFiltroProveedor] = useState<number | ''>('');
  const [filtroTipoVehiculo, setFiltroTipoVehiculo] = useState<number | ''>('');

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado, filtroProveedor, filtroTipoVehiculo]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar datos maestros (solo la primera vez)
      if (tiposVehiculo.length === 0) {
        const [tiposRes, estadosRes, proveedoresRes] = await Promise.all([
          getTiposVehiculo(),
          getEstadosEnrolamiento(),
          getProveedoresCarnes()
        ]);
        
        setTiposVehiculo(tiposRes);
        setEstados(estadosRes);
        setProveedores(proveedoresRes);
      }

      // Cargar enrolamientos con filtros
      const params: any = {};
      if (filtroEstado) params.estado_id = Number(filtroEstado);
      if (filtroProveedor) params.proveedor_id = Number(filtroProveedor);
      if (filtroTipoVehiculo) params.tipo_vehiculo_id = Number(filtroTipoVehiculo);

      const enrolamientosRes = await getEnrolamientos(params);
      setEnrolamientos(enrolamientosRes);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltroEstado('');
    setFiltroProveedor('');
    setFiltroTipoVehiculo('');
  };

  const handleCambiarEstado = async (enrolamientoId: number, estadoActual: string) => {
    try {
      console.log('Estado actual:', estadoActual); // Debug
      
      // Determinar el siguiente estado
      let nuevoEstadoId: number;
      let mensaje: string;
      
      switch (estadoActual) { // Comparar con el nombre que viene del backend
        case 'Pendiente':
          const estadoEnProceso = estados.find(e => e.codigo === 'EN_PROCESO');
          if (!estadoEnProceso) {
            alert('Estado EN_PROCESO no encontrado');
            return;
          }
          nuevoEstadoId = estadoEnProceso.id;
          mensaje = '¿Comenzar el procesamiento de cajas?';
          break;
          
        case 'En Proceso':
          const estadoFinalizado = estados.find(e => e.codigo === 'FINALIZADO');
          if (!estadoFinalizado) {
            alert('Estado FINALIZADO no encontrado');
            return;
          }
          nuevoEstadoId = estadoFinalizado.id;
          mensaje = '¿Finalizar el enrolamiento? Las cajas quedarán disponibles para venta.';
          break;
          
        default:
          alert('Este enrolamiento ya está finalizado');
          return;
      }
      
      if (confirm(mensaje)) {
        await updateEnrolamiento(enrolamientoId, { estado_id: nuevoEstadoId });
        // Recargar datos
        await cargarDatos();
      }
      
    } catch (err) {
      alert('Error al cambiar estado: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Enrolamientos</h1>
          <p className="text-gray-400">Registro y control de vehículos que ingresan con mercancía</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/recepcion"
            className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-slate-700 transition-colors"
          >
            ← Volver a Recepción
          </Link>
          <Link
            href="/admin/recepcion/enrolamientos/nuevo"
            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            + Nuevo Enrolamiento
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-300">Estado:</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-1 text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos</option>
              {estados.map(estado => (
                <option key={estado.id} value={estado.id}>{estado.nombre}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-300">Proveedor:</label>
            <select
              value={filtroProveedor}
              onChange={(e) => setFiltroProveedor(e.target.value as any)}
              className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-1 text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos</option>
              {proveedores.map(proveedor => (
                <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-300">Tipo Vehículo:</label>
            <select
              value={filtroTipoVehiculo}
              onChange={(e) => setFiltroTipoVehiculo(e.target.value as any)}
              className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-1 text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos</option>
              {tiposVehiculo.map(tipo => (
                <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
              ))}
            </select>
          </div>

          <button
            onClick={limpiarFiltros}
            className="px-3 py-1 text-sm text-gray-300 border border-slate-600 rounded hover:bg-slate-700 transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Contenido */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando enrolamientos...</p>
        </div>
      ) : enrolamientos.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🚛</div>
          <h3 className="text-lg font-semibold text-white mb-2">No hay enrolamientos</h3>
          <p className="text-gray-400 mb-4">
            {filtroEstado || filtroProveedor || filtroTipoVehiculo 
              ? 'No se encontraron enrolamientos con los filtros aplicados.' 
              : 'Aún no se han registrado enrolamientos de vehículos.'}
          </p>
          <Link
            href="/admin/recepcion/enrolamientos/nuevo"
            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            + Registrar Primer Enrolamiento
          </Link>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Vehículo
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Fechas
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Registrado por
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {enrolamientos.map((enrolamiento, index) => (
                  <tr key={enrolamiento.id} className={`${index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'} hover:bg-slate-700 transition-colors`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{enrolamiento.patente}</div>
                        <div className="text-sm text-gray-300">{enrolamiento.tipo_vehiculo_nombre}</div>
                        <div className="text-xs text-gray-400">Chofer: {enrolamiento.chofer}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {enrolamiento.proveedor_nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {enrolamiento.numero_documento}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${obtenerColorEstado(enrolamiento.estado_nombre)}`}>
                        {enrolamiento.estado_nombre}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div>Inicio: {formatearFecha(enrolamiento.fecha_inicio)}</div>
                      {enrolamiento.fecha_termino && (
                        <div>Fin: {formatearFecha(enrolamiento.fecha_termino)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {enrolamiento.usuario_registro_nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/admin/recepcion/enrolamientos/${enrolamiento.id}`}
                          className="text-primary hover:text-primary-dark transition-colors"
                        >
                          Ver
                        </Link>
                        
                        {enrolamiento.estado_nombre !== 'Finalizado' && (
                          <button
                            onClick={() => handleCambiarEstado(enrolamiento.id, enrolamiento.estado_nombre)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              enrolamiento.estado_nombre === 'Pendiente' 
                                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                            }`}
                          >
                            {enrolamiento.estado_nombre === 'Pendiente' ? 'Iniciar Proceso' : 'Finalizar'}
                          </button>
                        )}
                        
                        <Link
                          href={`/admin/recepcion/lotes?enrolamiento=${enrolamiento.id}`}
                          className="text-green-400 hover:text-green-300 transition-colors"
                        >
                          Cajas
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}