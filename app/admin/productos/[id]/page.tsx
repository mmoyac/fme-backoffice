'use client';

import { useState, useEffect, FormEvent } from 'react';
import { getProducto, updateProducto, uploadImagen, type Producto, type ProductoUpdate } from '@/lib/api/productos';
import { useRouter } from 'next/navigation';
import { getCategorias, getTipos, getUnidades, type CategoriaProducto, type TipoProducto, type UnidadMedida } from '@/lib/api/maestras';
import { AuthService } from '@/lib/auth';

export default function EditarProductoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [producto, setProducto] = useState<Producto | null>(null);
  const [formData, setFormData] = useState<ProductoUpdate>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Maestras
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [tipos, setTipos] = useState<TipoProducto[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    try {
      const [productoData, categoriasData, tiposData, unidadesData] = await Promise.all([
        getProducto(Number(params.id)),
        getCategorias(),
        getTipos(),
        getUnidades(),
      ]);

      setProducto(productoData);
      setCategorias(categoriasData);
      setTipos(tiposData);
      setUnidades(unidadesData);

      setFormData({
        nombre: productoData.nombre,
        descripcion: productoData.descripcion ?? undefined,
        sku: productoData.sku,
        categoria_id: productoData.categoria_id,
        tipo_producto_id: productoData.tipo_producto_id,
        unidad_medida_id: productoData.unidad_medida_id,
        precio_compra: productoData.precio_compra ?? undefined,
        costo_fabricacion: productoData.costo_fabricacion ?? undefined,
        es_vendible: productoData.es_vendible,
        es_vendible_web: productoData.es_vendible_web,
        es_ingrediente: productoData.es_ingrediente,
        tiene_receta: productoData.tiene_receta,
        activo: productoData.activo,
        stock_minimo: productoData.stock_minimo,
        stock_critico: productoData.stock_critico,
      });
    } catch (err) {
      alert('Error al cargar datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      await updateProducto(Number(params.id), formData);

      if (selectedFile) {
        await uploadImagen(Number(params.id), selectedFile);
      }

      alert('Producto actualizado exitosamente');
      router.push('/admin/productos');
    } catch (err) {
      alert('Error al actualizar producto');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Cargando...</div>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="bg-red-900/20 border border-red-500 text-red-200 px-4 py-3 rounded">
        Producto no encontrado
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-white mb-6">Editar Producto</h1>

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
                value={formData.sku || ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={formData.nombre || ''}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
              />
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
                value={formData.categoria_id || ''}
                onChange={(e) => setFormData({ ...formData, categoria_id: Number(e.target.value) })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
              >
                <option value="">Seleccionar...</option>
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
                value={formData.tipo_producto_id || ''}
                onChange={(e) => setFormData({ ...formData, tipo_producto_id: Number(e.target.value) })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
              >
                <option value="">Seleccionar...</option>
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
                value={formData.unidad_medida_id || ''}
                onChange={(e) => setFormData({ ...formData, unidad_medida_id: Number(e.target.value) })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none"
              >
                <option value="">Seleccionar...</option>
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

          <label className="block text-sm font-medium text-gray-300 mb-2">
            Imagen Actual
          </label>
          {producto.imagen_url ? (
            <div className="mb-2">
              <img
                src={`${API_URL}${producto.imagen_url}`}
                alt={producto.nombre}
                className="h-32 w-auto rounded-lg border border-slate-600"
              />
            </div>
          ) : (
            <p className="text-gray-500 text-sm mb-2">Sin imagen</p>
          )}

          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="w-full bg-slate-700 text-gray-300 px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-slate-900 file:font-semibold hover:file:bg-primary-dark"
          />
          <p className="text-xs text-gray-500 mt-1">
            {selectedFile ? `Nueva imagen: ${selectedFile.name}` : 'Selecciona una nueva imagen para reemplazar la actual'}
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form >
    </div >
  );
}
