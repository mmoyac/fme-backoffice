'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';
import {
  getTiposVehiculo,
  getEstadosEnrolamiento,
  getProveedoresCarnes,
  createEnrolamiento,
  type TipoVehiculo,
  type EstadoEnrolamiento,
  type ProveedorCarne,
  type EnrolamientoCreate
} from '@/lib/api/recepcion';

export default function NuevoEnrolamientoPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [tiposVehiculo, setTiposVehiculo] = useState<TipoVehiculo[]>([]);
  const [estados, setEstados] = useState<EstadoEnrolamiento[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorCarne[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    tipo_vehiculo_id: '',
    proveedor_id: '',
    patente: '',
    chofer: '',
    numero_documento: '',
    notas: ''
  });

  useEffect(() => {
    cargarDatosMaestros();
  }, []);

  const cargarDatosMaestros = async () => {
    try {
      const [tiposRes, estadosRes, proveedoresRes] = await Promise.all([
        getTiposVehiculo(),
        getEstadosEnrolamiento(),
        getProveedoresCarnes()
      ]);
      
      setTiposVehiculo(tiposRes);
      setEstados(estadosRes);
      setProveedores(proveedoresRes);
    } catch (err) {
      setError('Error al cargar datos maestros: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Usuario no autenticado');
      return;
    }

    // Validaciones
    if (!formData.tipo_vehiculo_id || !formData.proveedor_id || !formData.patente || 
        !formData.chofer || !formData.numero_documento) {
      setError('Por favor complete todos los campos obligatorios');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Buscar el estado PENDIENTE
      const estadoPendiente = estados.find(e => e.codigo === 'PENDIENTE');
      if (!estadoPendiente) {
        throw new Error('Estado PENDIENTE no encontrado');
      }

      const nuevoEnrolamiento: EnrolamientoCreate = {
        tipo_vehiculo_id: Number(formData.tipo_vehiculo_id),
        proveedor_id: Number(formData.proveedor_id),
        estado_id: estadoPendiente.id,
        usuario_registro_id: user.id,
        patente: formData.patente.toUpperCase().trim(),
        chofer: formData.chofer.trim(),
        numero_documento: formData.numero_documento.trim(),
        notas: formData.notas.trim() || undefined
      };

      await createEnrolamiento(nuevoEnrolamiento);
      
      // Redirigir a la lista con un mensaje de éxito
      router.push('/admin/recepcion/enrolamientos?created=true');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear enrolamiento');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400">Cargando formulario...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Nuevo Enrolamiento</h1>
          <p className="text-gray-400">Registrar llegada de vehículo con mercancía de proveedor</p>
        </div>
        <Link
          href="/admin/recepcion/enrolamientos"
          className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-slate-700 transition-colors"
        >
          ← Volver a Enrolamientos
        </Link>
      </div>

      {/* Información importante */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-2">📋 Información importante</h4>
        <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
          <li>Solo se pueden enrolar <strong className="text-white">proveedores de tipo CARNES</strong></li>
          <li>El enrolamiento se creará en estado <strong className="text-white">PENDIENTE</strong></li>
          <li>Después del registro puede cambiar a <strong className="text-white">EN PROCESO</strong> para escanear cajas</li>
          <li>Al finalizar el proceso, las cajas quedarán disponibles para venta</li>
        </ul>
      </div>

      {/* Formulario */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Proveedor */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Proveedor de Carnes *
              </label>
              <select
                name="proveedor_id"
                value={formData.proveedor_id}
                onChange={handleInputChange}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map(proveedor => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre} {proveedor.rut ? `(${proveedor.rut})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de Vehículo */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo de Vehículo *
              </label>
              <select
                name="tipo_vehiculo_id"
                value={formData.tipo_vehiculo_id}
                onChange={handleInputChange}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Seleccionar tipo...</option>
                {tiposVehiculo.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Patente */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Patente *
              </label>
              <input
                type="text"
                name="patente"
                value={formData.patente}
                onChange={handleInputChange}
                placeholder="Ej: ABC-1234"
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400"
                required
              />
            </div>

            {/* Chofer */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre del Chofer *
              </label>
              <input
                type="text"
                name="chofer"
                value={formData.chofer}
                onChange={handleInputChange}
                placeholder="Nombre completo del conductor"
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400"
                required
              />
            </div>

          </div>

          {/* Número de Documento */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Número de Documento (Guía/Factura) *
            </label>
            <input
              type="text"
              name="numero_documento"
              value={formData.numero_documento}
              onChange={handleInputChange}
              placeholder="Número de guía de despacho o factura"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400"
              required
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notas (Opcional)
            </label>
            <textarea
              name="notas"
              value={formData.notas}
              onChange={handleInputChange}
              rows={3}
              placeholder="Observaciones adicionales sobre el enrolamiento..."
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400 resize-none"
            />
          </div>

          {/* Información del usuario */}
          {user && (
            <div className="bg-slate-700 rounded-lg p-4">
              <p className="text-sm text-gray-300">
                <strong className="text-white">Registrado por:</strong> {user.nombre_completo} ({user.email})
              </p>
              <p className="text-sm text-gray-300">
                <strong className="text-white">Fecha de registro:</strong> {new Date().toLocaleString('es-CL')}
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/admin/recepcion/enrolamientos"
              className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Registrando...' : 'Registrar Enrolamiento'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}