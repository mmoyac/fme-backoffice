'use client';

import { useState, FormEvent } from 'react';
import { createProducto, uploadImagen, type ProductoCreate } from '@/lib/api/productos';
import { useRouter } from 'next/navigation';

export default function NuevoProductoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProductoCreate>({
    nombre: '',
    descripcion: '',
    sku: '',
    imagen_url: '',
    categoria_id: 1,
    tipo_producto_id: 1,
    unidad_medida_id: 1,
    es_vendible: true,
    es_vendible_web: false,
    es_ingrediente: false,
    activo: true,
    stock_minimo: 0,
    stock_critico: 0
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
    } catch (err) {
      alert('Error al crear producto');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-white mb-6">Nuevo Producto</h1>

      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-6 space-y-4">
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

        <div className="grid grid-cols-2 gap-4">
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

        <div>
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

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Imagen
          </label>
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
    </div>
  );
}
