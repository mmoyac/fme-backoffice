'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';
import CapturaEtiquetaGemini from '@/components/CapturaEtiquetaGemini';
import {
  getEnrolamientos,
  getProductosCarnes,
  getUbicaciones,
  createLote,
  type EnrolamientoList,
  type LoteCreate
} from '@/lib/api/recepcion';

interface Producto {
  id: number;
  nombre: string;
  sku: string;
  descripcion: string;
}

interface Ubicacion {
  id: number;
  codigo: string;
  nombre: string;
}

export default function NuevoLotePage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [enrolamientos, setEnrolamientos] = useState<EnrolamientoList[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    enrolamiento_id: '',
    producto_id: '',
    ubicacion_id: '',
    peso_original: '',
    peso_actual: '',
    peso_bruto_kg: '',
    fecha_vencimiento: '',
    fecha_fabricacion: '',
    qr_original: '',
    lote_proveedor: ''
  });



  // Manejar datos extraídos de la foto con Gemini Vision API
  const handleDatosEtiqueta = (datos: any) => {
    console.log('=== DATOS EXTRAIDOS GEMINI ===', datos);
    
    const datosEncontrados: string[] = [];
    
    // Actualizar campos solo si hay datos extraídos por Gemini
    setFormData(prev => {
      const nuevo = { ...prev };
      
      // Auto-seleccionar producto si hay matching con score alto
      if (datos.producto_id && datos.producto_match_score && datos.producto_match_score > 0.5) {
        nuevo.producto_id = datos.producto_id.toString();
        const producto = productos.find(p => p.id === datos.producto_id);
        if (producto) {
          datosEncontrados.push(`🎯 Producto detectado: ${producto.nombre} (${(datos.producto_match_score * 100).toFixed(1)}% coincidencia)`);
        }
      } else if (datos.nombre_producto) {
        datosEncontrados.push(`📦 Producto detectado en etiqueta: "${datos.nombre_producto}" (no se encontró coincidencia automática)`);
      }
      
      if (datos.peso_bruto_kg) {
        nuevo.peso_bruto_kg = datos.peso_bruto_kg;
        datosEncontrados.push(`Peso Bruto: ${datos.peso_bruto_kg} kg`);
      }
      
      if (datos.peso_neto_kg) {
        nuevo.peso_original = datos.peso_neto_kg;
        nuevo.peso_actual = datos.peso_neto_kg;
        datosEncontrados.push(`Peso Neto: ${datos.peso_neto_kg} kg`);
      }
      
      if (datos.fecha_vencimiento) {
        nuevo.fecha_vencimiento = datos.fecha_vencimiento;
        datosEncontrados.push(`Vencimiento: ${datos.fecha_vencimiento}`);
      }
      
      if (datos.fecha_fabricacion) {
        nuevo.fecha_fabricacion = datos.fecha_fabricacion;
        datosEncontrados.push(`Fabricación: ${datos.fecha_fabricacion}`);
      }
      
      if (datos.codigo_barras_superior) {
        nuevo.qr_original = datos.codigo_barras_superior;
        datosEncontrados.push(`Código: ${datos.codigo_barras_superior}`);
      }
      
      if (datos.lote_tropa) {
        nuevo.lote_proveedor = datos.lote_tropa;
        datosEncontrados.push(`Lote: ${datos.lote_tropa}`);
      }
      
      return nuevo;
    });

    // Mostrar resultado al usuario
    if (datosEncontrados.length > 0) {
      alert(`✅ Datos extraídos exitosamente:\n\n${datosEncontrados.join('\n')}\n\n📝 Los campos se han completado automáticamente.`);
    } else if (datos.textoCompleto) {
      alert(`⚠️ OCR completado pero no se pudieron identificar datos específicos.\n\nTexto extraído:\n"${datos.textoCompleto.substring(0, 200)}..."\n\n💡 Asegúrese de que la imagen tenga buena calidad y sea legible.`);
    } else {
      alert('❌ No se pudo extraer texto de la imagen. Intente con mejor iluminación o una imagen más clara.');
    }
  };



  useEffect(() => {
    cargarDatosMaestros();
  }, []);

  const cargarDatosMaestros = async () => {
    try {
      // Cargar solo enrolamientos en estado EN_PROCESO
      const [enrolamientosRes, productosRes, ubicacionesRes] = await Promise.all([
        getEnrolamientos(),
        getProductosCarnes(),
        getUbicaciones()
      ]);
      
      // Debug: ver todos los enrolamientos
      console.log('Todos los enrolamientos:', enrolamientosRes);
      
      // Filtrar solo enrolamientos EN_PROCESO (comparación más robusta)
      const enrolamientosEnProceso = enrolamientosRes.filter(enr => {
        const estado = enr.estado_nombre?.toUpperCase?.() || '';
        console.log(`Enrolamiento ${enr.id} - Estado: "${enr.estado_nombre}" -> "${estado}"`);
        return estado === 'EN_PROCESO' || estado === 'EN PROCESO';
      });
      
      console.log('Enrolamientos en proceso:', enrolamientosEnProceso);
      
      setEnrolamientos(enrolamientosEnProceso);
      setProductos(productosRes);
      setUbicaciones(ubicacionesRes);
      
      // Auto-seleccionar si hay un solo enrolamiento en proceso
      if (enrolamientosEnProceso.length === 1) {
        setFormData(prev => ({ ...prev, enrolamiento_id: enrolamientosEnProceso[0].id.toString() }));
      }
      
      setError(null);
    } catch (err) {
      setError('Error al cargar datos maestros');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Si cambia peso original, copiar a peso actual
    if (name === 'peso_original') {
      setFormData(prev => ({ ...prev, peso_actual: value }));
    }
  };

  const generarCodigoLote = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `LOTE-${timestamp}-${random}`.toUpperCase();
  };

  const generarQRPropio = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `QR-${timestamp}-${random}`.toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (enrolamientos.length === 0) {
        throw new Error('No hay enrolamientos en proceso. Debe tener un enrolamiento en estado EN_PROCESO.');
      }

      const nuevoLote: LoteCreate = {
        enrolamiento_id: Number(formData.enrolamiento_id),
        producto_id: Number(formData.producto_id),
        ubicacion_id: Number(formData.ubicacion_id),
        codigo_lote: generarCodigoLote(),
        qr_propio: generarQRPropio(),
        peso_original: parseFloat(formData.peso_original),
        peso_actual: parseFloat(formData.peso_actual || formData.peso_original),
        peso_bruto_kg: formData.peso_bruto_kg ? parseFloat(formData.peso_bruto_kg) : undefined,
        fecha_vencimiento: new Date(formData.fecha_vencimiento).toISOString(),
        fecha_fabricacion: formData.fecha_fabricacion ? new Date(formData.fecha_fabricacion).toISOString() : undefined,
        qr_original: formData.qr_original || undefined
      };

      await createLote(nuevoLote);
      
      // Redirigir a la lista con mensaje de éxito
      router.push('/admin/recepcion/lotes?created=true');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear lote');
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

  if (enrolamientos.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-white mb-2">No hay enrolamientos en proceso</h3>
          <p className="text-gray-400 mb-4">
            Para escanear cajas, necesita tener al menos un enrolamiento en estado <strong className="text-white">"EN PROCESO"</strong>.
          </p>
          <Link
            href="/admin/recepcion/enrolamientos"
            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            Ver Enrolamientos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Escanear Nueva Caja</h1>
          <p className="text-gray-400">Registrar caja individual con trazabilidad completa</p>
        </div>
        <Link
          href="/admin/recepcion/lotes"
          className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-slate-700 transition-colors"
        >
          ← Volver a Lotes
        </Link>
      </div>

      {/* Información importante */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-2">📦 Información del Proceso</h4>
        <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
          <li>Cada caja individual se registra como un <strong className="text-white">lote único</strong></li>
          <li>El sistema genera automáticamente el <strong className="text-white">código de lote</strong> y <strong className="text-white">QR propio</strong></li>
          <li>Las cajas quedan <strong className="text-white">disponibles para venta</strong> cuando se finaliza el enrolamiento</li>
          <li>La trazabilidad permite seguimiento completo desde origen hasta venta</li>
        </ul>
      </div>

      {/* Captura de Etiqueta con Gemini Vision API */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-4">📸 Captura Inteligente de Etiqueta</h4>
        <p className="text-sm text-gray-300 mb-4">
          Tome una foto de la etiqueta para auto-completar los datos del lote usando IA
        </p>
        <CapturaEtiquetaGemini 
          onDatosExtraidos={handleDatosEtiqueta}
          onError={(error) => setError(error)}
        />
      </div>

      {/* Formulario */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Enrolamiento */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Enrolamiento (EN PROCESO) *
              </label>
              <select
                name="enrolamiento_id"
                value={formData.enrolamiento_id}
                onChange={handleInputChange}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Seleccionar enrolamiento...</option>
                {enrolamientos.map(enr => (
                  <option key={enr.id} value={enr.id}>
                    {enr.patente} - {enr.proveedor_nombre} ({enr.estado_nombre})
                  </option>
                ))}
              </select>
            </div>

            {/* Producto */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Producto (Solo Carnes) *
              </label>
              <select
                name="producto_id"
                value={formData.producto_id}
                onChange={handleInputChange}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Seleccionar producto de carnes...</option>
                {productos.map(prod => (
                  <option key={prod.id} value={prod.id}>
                    {prod.sku} - {prod.nombre}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                🥩 Solo se muestran productos de la categoría CARNES
              </p>
            </div>

            {/* Ubicación */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ubicación en Almacén *
              </label>
              <select
                name="ubicacion_id"
                value={formData.ubicacion_id}
                onChange={handleInputChange}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Seleccionar ubicación...</option>
                {ubicaciones.map(ubicacion => (
                  <option key={ubicacion.id} value={ubicacion.id}>
                    {ubicacion.codigo} - {ubicacion.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Peso Original / Neto */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Peso Neto (kg) * <span className="text-gray-500 font-normal">— el que se vende</span>
              </label>
              <input
                type="number"
                name="peso_original"
                value={formData.peso_original}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                required
                placeholder="Ej: 23.80"
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400"
              />
            </div>

            {/* Peso Bruto */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Peso Bruto (kg) <span className="text-gray-500 font-normal">— para carga de camión</span>
              </label>
              <input
                type="number"
                name="peso_bruto_kg"
                value={formData.peso_bruto_kg}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                placeholder="Ej: 25.50"
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400"
              />
            </div>

            {/* Fecha de Vencimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fecha de Vencimiento *
              </label>
              <input
                type="date"
                name="fecha_vencimiento"
                value={formData.fecha_vencimiento}
                onChange={handleInputChange}
                required
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Fecha de Fabricación */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fecha de Fabricación
              </label>
              <input
                type="date"
                name="fecha_fabricacion"
                value={formData.fecha_fabricacion}
                onChange={handleInputChange}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Información de la Etiqueta Original */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <h4 className="font-semibold text-white mb-4">📋 Información de la Etiqueta Original</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* QR Original */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Código QR/Barras Original
                  </label>
                  <input
                    type="text"
                    name="qr_original"
                    value={formData.qr_original}
                    onChange={handleInputChange}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Escanear o ingresar código"
                  />
                </div>

                {/* Lote del Proveedor */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    N° Lote Proveedor
                  </label>
                  <input
                    type="text"
                    name="lote_proveedor"
                    value={formData.lote_proveedor || ''}
                    onChange={handleInputChange}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Lote del proveedor"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Información auto-generada */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h5 className="font-semibold text-white mb-2">🔄 Información Auto-generada</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-300">Código de Lote:</span>
                <span className="text-white ml-2 font-mono">Se genera automáticamente</span>
              </div>
              <div>
                <span className="text-gray-300">QR Propio:</span>
                <span className="text-white ml-2 font-mono">Se genera automáticamente</span>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/admin/recepcion/lotes"
              className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Registrando...' : 'Registrar Caja'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}