'use client';

import { useState, useEffect, FormEvent } from 'react';
import { createProducto, uploadImagen, type ProductoCreate } from '@/lib/api/productos';
import { getCategorias, getTipos, getUnidades, type CategoriaProducto, type TipoProducto, type UnidadMedida } from '@/lib/api/maestras';
import { useRouter } from 'next/navigation';

export default function NuevoProductoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingMaestras, setLoadingMaestras] = useState(true);
  
  // Datos maestros
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [tipos, setTipos] = useState<TipoProducto[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  
  const [formData, setFormData] = useState<ProductoCreate>({
    nombre: '',
    descripcion: '',
    sku: '',
    imagen_url: '',
    codigo_barra: '',
    categoria_id: 0,
    tipo_producto_id: 0,
    unidad_medida_id: 0,
    precio_compra: undefined,
    costo_fabricacion: undefined,
    es_vendible: true,
    es_vendible_web: false,
    es_ingrediente: false,
    tiene_receta: false,
    activo: true,
    stock_minimo: 0,
    stock_critico: 0
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Cargar datos maestros al montar el componente
  useEffect(() => {
    const cargarMaestras = async () => {
      try {
        const [categoriasData, tiposData, unidadesData] = await Promise.all([
          getCategorias(),
          getTipos(),
          getUnidades()
        ]);
        
        setCategorias(categoriasData);
        setTipos(tiposData);
        setUnidades(unidadesData);
        
        // Establecer valores por defecto (primer elemento de cada lista)
        if (categoriasData.length > 0 && tiposData.length > 0 && unidadesData.length > 0) {
          setFormData(prev => ({
            ...prev,
            categoria_id: categoriasData[0].id,
            tipo_producto_id: tiposData[0].id,
            unidad_medida_id: unidadesData[0].id
          }));
        }
      } catch (error) {
        console.error('Error cargando maestras:', error);
        alert('Error al cargar datos del formulario');
      } finally {
        setLoadingMaestras(false);
      }
    };
    
    cargarMaestras();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Crear el producto
      const producto = await createProducto(formData);

      // 2. Si hay imagen, subirla
      if (selectedFile && producto.id) {
        await uploadImagen(producto.id, selectedFile);
      }

      alert('Producto creado exitosamente');
      router.push('/admin/productos');
    } catch (err: any) {
      console.error('❌ Error creando producto:', err);
      const errorMessage = err?.message || 'Error desconocido al crear producto';
      alert(`Error al crear producto:\n\n${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-white mb-6">Nuevo Producto</h1>

      {loadingMaestras ? (
        <div className="bg-slate-800 rounded-lg p-6">
          <p className="text-gray-300">Cargando formulario...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-6 space-y-6">
          {/* Información Básica */}
          <div className="border-b border-slate-700 pb-4">
            <h2 className="text-xl font-semibold text-white mb-4">Información Básica</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  SKU *
                </label>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
                  placeholder="Ej: MASA-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
                  placeholder="Ej: Masa Napolitana"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Código de Barra
                </label>
                <input
                  type="text"
                  value={formData.codigo_barra || ''}
                  onChange={(e) => setFormData({ ...formData, codigo_barra: e.target.value })}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
                  placeholder="Ej: 7891234567890"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">Número para generar código de barras</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.descripcion || ''}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
                placeholder="Descripción del producto"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock_minimo || 0}
                  onChange={(e) => setFormData({ ...formData, stock_minimo: Number(e.target.value) })}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stock Crítico
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock_critico || 0}
                  onChange={(e) => setFormData({ ...formData, stock_critico: Number(e.target.value) })}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Clasificación */}
          <div className="border-b border-slate-700 pb-4">
            <h2 className="text-xl font-semibold text-white mb-4">Clasificación</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Categoría *
                </label>
                <select
                  required
                  value={formData.categoria_id}
                  onChange={(e) => setFormData({ ...formData, categoria_id: Number(e.target.value) })}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
                >
                  <option value={0}>Seleccionar...</option>
                  {categorias.filter(c => c.activo).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tipo de Producto *
                </label>
                <select
                  required
                  value={formData.tipo_producto_id}
                  onChange={(e) => setFormData({ ...formData, tipo_producto_id: Number(e.target.value) })}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
                >
                  <option value={0}>Seleccionar...</option>
                  {tipos.filter(t => t.activo).map(tipo => (
                    <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Unidad de Medida *
                </label>
                <select
                  required
                  value={formData.unidad_medida_id}
                  onChange={(e) => setFormData({ ...formData, unidad_medida_id: Number(e.target.value) })}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
                >
                  <option value={0}>Seleccionar...</option>
                  {unidades.filter(u => u.activo).map(unidad => (
                    <option key={unidad.id} value={unidad.id}>{unidad.nombre} ({unidad.simbolo})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Costos y Precios */}
          <div className="border-b border-slate-700 pb-4">
            <h2 className="text-xl font-semibold text-white mb-4">Costos y Precios</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Precio de Compra
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.precio_compra || ''}
                  onChange={(e) => setFormData({ ...formData, precio_compra: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Para materias primas</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Costo de Fabricación
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costo_fabricacion || ''}
                  onChange={(e) => setFormData({ ...formData, costo_fabricacion: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
                  disabled={formData.tiene_receta}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.tiene_receta ? 'Se calcula automáticamente desde la receta' : 'Para productos elaborados sin receta'}
                </p>
              </div>
            </div>
          </div>

          {/* Configuración */}
          <div className="border-b border-slate-700 pb-4">
            <h2 className="text-xl font-semibold text-white mb-4">Configuración</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.es_vendible || false}
                    onChange={(e) => setFormData({ ...formData, es_vendible: e.target.checked })}
                    className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded focus:ring-primary"
                  />
                  <span>Es vendible en local</span>
                </label>

                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.es_vendible_web || false}
                    onChange={(e) => setFormData({ ...formData, es_vendible_web: e.target.checked })}
                    className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded focus:ring-primary"
                  />
                  <span>Es vendible en web</span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.es_ingrediente || false}
                    onChange={(e) => setFormData({ ...formData, es_ingrediente: e.target.checked })}
                    className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded focus:ring-primary"
                  />
                  <span>Se usa como ingrediente</span>
                </label>

                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.tiene_receta || false}
                    onChange={(e) => setFormData({ ...formData, tiene_receta: e.target.checked })}
                    className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded focus:ring-primary"
                  />
                  <span>Tiene receta de fabricación</span>
                </label>

                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.activo !== false}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded focus:ring-primary"
                  />
                  <span>Activo</span>
                </label>
              </div>
            </div>
          </div>

          {/* Imagen */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Imagen</h2>

            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full bg-slate-700 text-gray-300 px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-slate-900 file:font-semibold hover:file:bg-primary-dark"
            />
            <p className="text-xs text-gray-500 mt-1">
              Formatos: JPG, PNG, WEBP. Tamaño máximo: 2MB
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Crear Producto'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
