'use client';

import { useState, useEffect } from 'react';
import {
  getSellos,
  getEtiquetaCompleta,
  updateInformacionNutricional,
  createInformacionNutricional,
  asignarSellos,
  type SelloAdvertencia,
  type EtiquetaCompleta,
  type InformacionNutricional,
  type InformacionNutricionalUpdate
} from '@/lib/api/etiquetas';
import EtiquetaPreview from './EtiquetaPreview';

interface TabEtiquetasProps {
  productoId: number;
  productoNombre: string;
}

export default function TabEtiquetas({ productoId, productoNombre }: TabEtiquetasProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Datos
  const [sellosDisponibles, setSellosDisponibles] = useState<SelloAdvertencia[]>([]);
  const [etiqueta, setEtiqueta] = useState<EtiquetaCompleta | null>(null);
  const [sellosSeleccionados, setSellosSeleccionados] = useState<number[]>([]);
  
  // Formulario de información nutricional
  const [infoNutricional, setInfoNutricional] = useState<InformacionNutricionalUpdate>({
    porcion_referencia: '100g',
    energia_kcal: undefined,
    proteinas_g: undefined,
    carbohidratos_g: undefined,
    azucares_g: undefined,
    grasas_totales_g: undefined,
    grasas_saturadas_g: undefined,
    grasas_trans_g: undefined,
    fibra_g: undefined,
    sodio_mg: undefined,
    colesterol_mg: undefined,
    calcio_mg: undefined,
    hierro_mg: undefined,
    vitamina_a_mcg: undefined,
    vitamina_c_mg: undefined
  });

  useEffect(() => {
    loadData();
  }, [productoId]);

  async function loadData() {
    try {
      const [sellos, etiquetaData] = await Promise.all([
        getSellos(),
        getEtiquetaCompleta(productoId).catch(() => null)
      ]);

      setSellosDisponibles(sellos);
      setEtiqueta(etiquetaData);

      // Cargar información nutricional existente
      if (etiquetaData?.informacion_nutricional) {
        const info = etiquetaData.informacion_nutricional;
        setInfoNutricional({
          porcion_referencia: info.porcion_referencia,
          energia_kcal: info.energia_kcal ?? undefined,
          proteinas_g: info.proteinas_g ?? undefined,
          carbohidratos_g: info.carbohidratos_g ?? undefined,
          azucares_g: info.azucares_g ?? undefined,
          grasas_totales_g: info.grasas_totales_g ?? undefined,
          grasas_saturadas_g: info.grasas_saturadas_g ?? undefined,
          grasas_trans_g: info.grasas_trans_g ?? undefined,
          fibra_g: info.fibra_g ?? undefined,
          sodio_mg: info.sodio_mg ?? undefined,
          colesterol_mg: info.colesterol_mg ?? undefined,
          calcio_mg: info.calcio_mg ?? undefined,
          hierro_mg: info.hierro_mg ?? undefined,
          vitamina_a_mcg: info.vitamina_a_mcg ?? undefined,
          vitamina_c_mg: info.vitamina_c_mg ?? undefined
        });
      }

      // Cargar sellos seleccionados
      if (etiquetaData?.sellos) {
        setSellosSeleccionados(etiquetaData.sellos.map(s => s.id));
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar datos de etiqueta');
    } finally {
      setLoading(false);
    }
  }

  async function handleGuardar() {
    setSaving(true);
    try {
      // 1. Guardar información nutricional
      const tieneInfoNutricional = etiqueta?.informacion_nutricional;
      
      if (tieneInfoNutricional) {
        await updateInformacionNutricional(productoId, infoNutricional);
      } else {
        await createInformacionNutricional(productoId, infoNutricional);
      }

      // 2. Guardar sellos
      await asignarSellos(productoId, sellosSeleccionados);

      alert('Etiqueta guardada exitosamente');
      
      // Recargar datos
      await loadData();
    } catch (error: any) {
      console.error('Error guardando etiqueta:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  function toggleSello(selloId: number) {
    setSellosSeleccionados(prev => {
      if (prev.includes(selloId)) {
        return prev.filter(id => id !== selloId);
      } else {
        return [...prev, selloId];
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Cargando datos de etiqueta...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta: Código de barras faltante */}
      {!etiqueta?.codigo_barra && (
        <div className="bg-yellow-900/30 border border-yellow-600 text-yellow-200 px-4 py-3 rounded-lg flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold mb-1">Código de barras no configurado</p>
            <p className="text-sm">
              Este producto no tiene un código de barras asignado. Ve al tab <strong>"📦 Información del Producto"</strong>, 
              llena el campo "Código de Barra" y haz clic en <strong>"Guardar Cambios"</strong>. 
              Después podrás ver el código de barras en la vista previa de la etiqueta.
            </p>
          </div>
        </div>
      )}

      {/* SECCIÓN 1: Información Nutricional */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">📊 Información Nutricional</h2>
        <p className="text-gray-400 text-sm mb-4">Valores nutricionales por cada 100g/100ml del producto</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Porción de referencia */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Porción de Referencia
            </label>
            <input
              type="text"
              value={infoNutricional.porcion_referencia || '100g'}
              onChange={(e) => setInfoNutricional({ ...infoNutricional, porcion_referencia: e.target.value })}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
              placeholder="Ej: 100g, 100ml, 1 unidad"
            />
          </div>

          {/* Energía */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Energía (kcal)
            </label>
            <input
              type="number"
              step="0.01"
              value={infoNutricional.energia_kcal || ''}
              onChange={(e) => setInfoNutricional({ ...infoNutricional, energia_kcal: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Proteínas */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Proteínas (g)
            </label>
            <input
              type="number"
              step="0.01"
              value={infoNutricional.proteinas_g || ''}
              onChange={(e) => setInfoNutricional({ ...infoNutricional, proteinas_g: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Carbohidratos */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Carbohidratos (g)
            </label>
            <input
              type="number"
              step="0.01"
              value={infoNutricional.carbohidratos_g || ''}
              onChange={(e) => setInfoNutricional({ ...infoNutricional, carbohidratos_g: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Azúcares */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Azúcares (g)
            </label>
            <input
              type="number"
              step="0.01"
              value={infoNutricional.azucares_g || ''}
              onChange={(e) => setInfoNutricional({ ...infoNutricional, azucares_g: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Grasas totales */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Grasas Totales (g)
            </label>
            <input
              type="number"
              step="0.01"
              value={infoNutricional.grasas_totales_g || ''}
              onChange={(e) => setInfoNutricional({ ...infoNutricional, grasas_totales_g: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Grasas saturadas */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Grasas Saturadas (g)
            </label>
            <input
              type="number"
              step="0.01"
              value={infoNutricional.grasas_saturadas_g || ''}
              onChange={(e) => setInfoNutricional({ ...infoNutricional, grasas_saturadas_g: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Sodio */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sodio (mg)
            </label>
            <input
              type="number"
              step="0.01"
              value={infoNutricional.sodio_mg || ''}
              onChange={(e) => setInfoNutricional({ ...infoNutricional, sodio_mg: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Fibra */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fibra (g)
            </label>
            <input
              type="number"
              step="0.01"
              value={infoNutricional.fibra_g || ''}
              onChange={(e) => setInfoNutricional({ ...infoNutricional, fibra_g: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Campos opcionales colapsables */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-primary hover:text-primary-dark">
            + Agregar información adicional (colesterol, vitaminas, minerales)
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Colesterol */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Colesterol (mg)
              </label>
              <input
                type="number"
                step="0.01"
                value={infoNutricional.colesterol_mg || ''}
                onChange={(e) => setInfoNutricional({ ...infoNutricional, colesterol_mg: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
              />
            </div>

            {/* Calcio */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Calcio (mg)
              </label>
              <input
                type="number"
                step="0.01"
                value={infoNutricional.calcio_mg || ''}
                onChange={(e) => setInfoNutricional({ ...infoNutricional, calcio_mg: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
              />
            </div>

            {/* Hierro */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Hierro (mg)
              </label>
              <input
                type="number"
                step="0.01"
                value={infoNutricional.hierro_mg || ''}
                onChange={(e) => setInfoNutricional({ ...infoNutricional, hierro_mg: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
              />
            </div>

            {/* Vitamina A */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Vitamina A (mcg)
              </label>
              <input
                type="number"
                step="0.01"
                value={infoNutricional.vitamina_a_mcg || ''}
                onChange={(e) => setInfoNutricional({ ...infoNutricional, vitamina_a_mcg: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
              />
            </div>

            {/* Vitamina C */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Vitamina C (mg)
              </label>
              <input
                type="number"
                step="0.01"
                value={infoNutricional.vitamina_c_mg || ''}
                onChange={(e) => setInfoNutricional({ ...infoNutricional, vitamina_c_mg: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </details>
      </div>

      {/* SECCIÓN 2: Sellos de Advertencia */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">⚠️ Sellos de Advertencia</h2>
        <p className="text-gray-400 text-sm mb-4">Selecciona los sellos que aplican a este producto</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sellosDisponibles.map(sello => (
            <label
              key={sello.id}
              className="flex items-start space-x-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-600 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={sellosSeleccionados.includes(sello.id)}
                onChange={() => toggleSello(sello.id)}
                className="w-5 h-5 mt-0.5 text-primary bg-slate-600 border-slate-500 rounded focus:ring-primary"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{sello.icono}</span>
                  <span className="font-semibold text-white">{sello.nombre}</span>
                </div>
                {sello.descripcion && (
                  <p className="text-xs text-gray-400 mt-1">{sello.descripcion}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Botón de guardar */}
      <div className="flex gap-3">
        <button
          onClick={handleGuardar}
          disabled={saving}
          className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : 'Guardar Etiqueta'}
        </button>
        <button
          onClick={async () => {
            // Recargar datos actualizados antes de mostrar preview
            await loadData();
            setShowPreview(true);
          }}
          disabled={!etiqueta}
          className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          🖨️ Vista Previa/Imprimir
        </button>
      </div>

      {/* Vista previa profesional */}
      {showPreview && etiqueta && (
        <EtiquetaPreview
          etiqueta={etiqueta}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
