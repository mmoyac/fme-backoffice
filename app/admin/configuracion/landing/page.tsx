'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  obtenerConfiguracion,
  actualizarConfiguracion,
  type ConfiguracionLanding,
  type ConfiguracionLandingUpdate,
  type Badge,
  type Beneficio,
  type RedesSociales
} from '@/lib/api/configuracion-landing';
import { useTenant } from '@/lib/TenantContext';
import { PencilIcon, PlusIcon, TrashIcon, SwatchIcon } from '@heroicons/react/24/outline';
import ImageUpload from '@/components/ImageUpload';

export default function ConfiguracionLandingPage() {
  const router = useRouter();
  const { config: tenantConfig } = useTenant();
  
  const [configuracion, setConfiguracion] = useState<ConfiguracionLanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>('');
  const [mensaje, setMensaje] = useState<string>('');
  
  // Estados del formulario
  const [formData, setFormData] = useState<ConfiguracionLandingUpdate>({});

  useEffect(() => {
    cargarConfiguracion();
  }, [tenantConfig]);

  const cargarConfiguracion = async () => {
    if (!tenantConfig?.tenant?.id) return;
    
    try {
      setLoading(true);
      const data = await obtenerConfiguracion(tenantConfig.tenant.id);
      setConfiguracion(data);
      setFormData({
        logo_url: data.logo_url,
        favicon_url: data.favicon_url,
        nombre_comercial: data.nombre_comercial,
        colores: data.colores,
        hero_titulo: data.hero_titulo,
        hero_subtitulo: data.hero_subtitulo,
        hero_imagen_url: data.hero_imagen_url,
        hero_cta_texto: data.hero_cta_texto,
        hero_cta_link: data.hero_cta_link,
        hero_badges: data.hero_badges,
        beneficios: data.beneficios,
        redes_sociales: data.redes_sociales,
        telefono: data.telefono,
        email: data.email,
        direccion: data.direccion,
        texto_footer_descripcion: data.texto_footer_descripcion,
        texto_copyright: data.texto_copyright,
        meta_title: data.meta_title,
        meta_description: data.meta_description,
        mostrar_precios: data.mostrar_precios,
        mostrar_stock: data.mostrar_stock,
        habilitar_carrito: data.habilitar_carrito,
      });
    } catch (err) {
      console.error('Error cargando configuración:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantConfig?.tenant?.id) return;
    
    setGuardando(true);
    setError('');
    setMensaje('');
    
    try {
      await actualizarConfiguracion(tenantConfig.tenant.id, formData);
      setMensaje('✅ Configuración actualizada exitosamente. Recarga la página para ver los cambios.');
      
      // Recargar configuración
      await cargarConfiguracion();
    } catch (err) {
      console.error('Error guardando configuración:', err);
      setError(err instanceof Error ? err.message : 'Error guardando configuración');
    } finally {
      setGuardando(false);
    }
  };

  const handleColorChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      colores: {
        ...prev.colores,
        [key]: value
      }
    }));
  };

  const handleBadgeChange = (index: number, field: 'icono' | 'texto', value: string) => {
    const badges = [...(formData.hero_badges || [])];
    badges[index] = { ...badges[index], [field]: value };
    setFormData(prev => ({ ...prev, hero_badges: badges }));
  };

  const agregarBadge = () => {
    const badges = [...(formData.hero_badges || []), { icono: '✓', texto: 'Nuevo badge' }];
    setFormData(prev => ({ ...prev, hero_badges: badges }));
  };

  const eliminarBadge = (index: number) => {
    const badges = (formData.hero_badges || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, hero_badges: badges }));
  };

  const handleBeneficioChange = (index: number, field: keyof Beneficio, value: string) => {
    const beneficios = [...(formData.beneficios || [])];
    beneficios[index] = { ...beneficios[index], [field]: value };
    setFormData(prev => ({ ...prev, beneficios }));
  };

  const agregarBeneficio = () => {
    const beneficios = [...(formData.beneficios || []), { icono: '⭐', titulo: 'Nuevo beneficio', descripcion: 'Descripción' }];
    setFormData(prev => ({ ...prev, beneficios }));
  };

  const eliminarBeneficio = (index: number) => {
    const beneficios = (formData.beneficios || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, beneficios }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  if (!configuracion) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
          <p className="text-red-400">No se encontró configuración para este tenant.</p>
          <p className="text-sm text-red-300 mt-2">Contacta al administrador del sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Configuración de Landing Page</h1>
        <p className="text-slate-400">Personaliza la apariencia y contenido de tu landing page</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-600/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {mensaje && (
        <div className="mb-4 bg-green-900/20 border border-green-600/30 rounded-lg p-4">
          <p className="text-green-400">{mensaje}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección: Branding */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <SwatchIcon className="w-6 h-6 mr-2 text-teal-400" />
            Branding
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Logo Upload */}
            <ImageUpload
              label="Logo de la empresa"
              currentUrl={formData.logo_url}
              tipo="logo"
              onUploadSuccess={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
              acceptedFormats=".jpg,.jpeg,.png,.webp,.svg"
            />
            
            {/* Favicon Upload */}
            <ImageUpload
              label="Favicon (icono del navegador)"
              currentUrl={formData.favicon_url}
              tipo="favicon"
              onUploadSuccess={(url) => setFormData(prev => ({ ...prev, favicon_url: url }))}
              acceptedFormats=".ico,.png"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Nombre Comercial</label>
            <input
              type="text"
              value={formData.nombre_comercial || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, nombre_comercial: e.target.value }))}
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder="Masas Estación"
            />
          </div>
        </div>

        {/* Sección: Colores */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <SwatchIcon className="w-6 h-6 mr-2 text-teal-400" />
            Paleta de Colores
          </h2>
          
          {/* Vista previa de colores principales */}
          <div className="mb-6 p-4 bg-slate-900 rounded-lg">
            <p className="text-sm text-slate-400 mb-3">Vista Previa:</p>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div 
                  className="w-20 h-20 rounded-lg shadow-lg mb-2" 
                  style={{ backgroundColor: formData.colores?.primario || '#5EC8F2' }}
                ></div>
                <p className="text-xs text-slate-400">Primario</p>
              </div>
              <div className="text-center">
                <div 
                  className="w-20 h-20 rounded-lg shadow-lg mb-2" 
                  style={{ backgroundColor: formData.colores?.secundario || '#45A29A' }}
                ></div>
                <p className="text-xs text-slate-400">Secundario</p>
              </div>
              <div className="text-center">
                <div 
                  className="w-20 h-20 rounded-lg shadow-lg mb-2" 
                  style={{ backgroundColor: formData.colores?.acento || '#90DCFF' }}
                ></div>
                <p className="text-xs text-slate-400">Acento</p>
              </div>
            </div>
          </div>

          {/* Colores principales */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">🎨 Colores Principales</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['primario', 'secundario', 'acento'].map((key) => (
                <div key={key} className="bg-slate-700 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-slate-300 mb-2 capitalize">
                    {key === 'primario' ? '🔵 Color Primario' : 
                     key === 'secundario' ? '🟢 Color Secundario' : 
                     '⭐ Color de Acento'}
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.colores?.[key] || '#5EC8F2'}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="w-16 h-16 rounded-lg cursor-pointer border-2 border-slate-600"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={formData.colores?.[key] || ''}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        className="w-full p-2 bg-slate-600 border border-slate-500 rounded text-white text-sm font-mono"
                        placeholder="#RRGGBB"
                      />
                      <p className="text-xs text-slate-400 mt-1">Haz clic en el cuadro para elegir</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Variantes de colores (opcional) */}
          <details className="bg-slate-700 rounded-lg p-4">
            <summary className="text-white font-medium cursor-pointer">
              ⚙️ Colores Avanzados (opcional)
            </summary>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {Object.entries(formData.colores || {})
                .filter(([key]) => !['primario', 'secundario', 'acento'].includes(key))
                .map(([key, value]) => (
                <div key={key} className="bg-slate-600 p-3 rounded">
                  <label className="block text-xs font-medium text-slate-300 mb-2 capitalize">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="flex-1 p-2 bg-slate-700 border border-slate-500 rounded text-white text-xs font-mono"
                      placeholder="#RRGGBB"
                    />
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>

        {/* Sección: Hero */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">🎯 Sección Hero (Banner Principal)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Título Principal</label>
              <input
                type="text"
                value={formData.hero_titulo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, hero_titulo: e.target.value }))}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                placeholder="Las mejores masas frescas a tu mesa"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Subtítulo</label>
              <textarea
                value={formData.hero_subtitulo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, hero_subtitulo: e.target.value }))}
                rows={2}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                placeholder="Productos frescos directo del campo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Texto del Botón</label>
              <input
                type="text"
                value={formData.hero_cta_texto || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, hero_cta_texto: e.target.value }))}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                placeholder="Ver Productos"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Link del Botón</label>
              <input
                type="text"
                value={formData.hero_cta_link || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, hero_cta_link: e.target.value }))}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                placeholder="#productos"
              />
            </div>
          </div>

          {/* Badges del Hero */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">🏷️ Badges (Ventajas en el Hero)</h3>
              <button
                type="button"
                onClick={agregarBadge}
                className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg flex items-center"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Agregar Badge
              </button>
            </div>
            <div className="space-y-2">
              {(formData.hero_badges || []).map((badge, index) => (
                <div key={index} className="flex items-center space-x-2 bg-slate-700 p-3 rounded-lg">
                  <input
                    type="text"
                    value={badge.icono}
                    onChange={(e) => handleBadgeChange(index, 'icono', e.target.value)}
                    className="w-16 p-2 bg-slate-600 border border-slate-500 rounded text-white text-center"
                    placeholder="✓"
                  />
                  <input
                    type="text"
                    value={badge.texto}
                    onChange={(e) => handleBadgeChange(index, 'texto', e.target.value)}
                    className="flex-1 p-2 bg-slate-600 border border-slate-500 rounded text-white"
                    placeholder="Texto del badge"
                  />
                  <button
                    type="button"
                    onClick={() => eliminarBadge(index)}
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sección: Beneficios */}
        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">⭐ Beneficios (Por qué elegirnos)</h2>
            <button
              type="button"
              onClick={agregarBeneficio}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center"
            >
              <PlusIcon className="w-5 h-5 mr-1" />
              Agregar Beneficio
            </button>
          </div>
          <div className="space-y-4">
            {(formData.beneficios || []).map((beneficio, index) => (
              <div key={index} className="bg-slate-700 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-1">
                    <label className="block text-xs text-slate-400 mb-1">Icono</label>
                    <input
                      type="text"
                      value={beneficio.icono}
                      onChange={(e) => handleBeneficioChange(index, 'icono', e.target.value)}
                      className="w-full p-2 bg-slate-600 border border-slate-500 rounded text-white text-center text-xl"
                      placeholder="🌱"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-xs text-slate-400 mb-1">Título</label>
                    <input
                      type="text"
                      value={beneficio.titulo}
                      onChange={(e) => handleBeneficioChange(index, 'titulo', e.target.value)}
                      className="w-full p-2 bg-slate-600 border border-slate-500 rounded text-white"
                      placeholder="Productos Frescos"
                    />
                  </div>
                  <div className="md:col-span-6">
                    <label className="block text-xs text-slate-400 mb-1">Descripción</label>
                    <input
                      type="text"
                      value={beneficio.descripcion}
                      onChange={(e) => handleBeneficioChange(index, 'descripcion', e.target.value)}
                      className="w-full p-2 bg-slate-600 border border-slate-500 rounded text-white"
                      placeholder="Productos seleccionados con máxima calidad"
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => eliminarBeneficio(index)}
                      className="w-full p-2 bg-red-600 hover:bg-red-700 text-white rounded"
                    >
                      <TrashIcon className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sección: Footer y Contacto */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">📞 Información de Contacto</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Teléfono</label>
              <input
                type="text"
                value={formData.telefono || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                placeholder="+56 9 1234 5678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                placeholder="contacto@empresa.cl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Dirección</label>
              <input
                type="text"
                value={formData.direccion || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                placeholder="Calle Principal 123"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Descripción Footer</label>
            <textarea
              value={formData.texto_footer_descripcion || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, texto_footer_descripcion: e.target.value }))}
              rows={2}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder="Breve descripción de tu negocio"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Copyright</label>
            <input
              type="text"
              value={formData.texto_copyright || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, texto_copyright: e.target.value }))}
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder="© 2026 Tu Empresa. Todos los derechos reservados."
            />
          </div>

          <h3 className="text-lg font-semibold text-white mb-3">🌐 Redes Sociales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['facebook', 'instagram', 'whatsapp', 'twitter'] as const).map((red) => (
              <div key={red}>
                <label className="block text-sm font-medium text-slate-300 mb-2 capitalize">{red}</label>
                <input
                  type="text"
                  value={(formData.redes_sociales as any)?.[red] || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    redes_sociales: { ...prev.redes_sociales, [red]: e.target.value }
                  }))}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder={`https://${red}.com/tu-perfil`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Sección: Opciones de Visualización (Modo Catálogo) */}
        <div className="bg-slate-800 rounded-lg p-6 border-2 border-teal-500/30">
          <h2 className="text-xl font-bold text-white mb-4">👁️ Opciones de Visualización</h2>
          <p className="text-sm text-slate-400 mb-6">
            Controla qué elementos se muestran en la landing. Ideal para páginas de catálogo sin e-commerce.
          </p>
          
          <div className="space-y-4">
            {/* Mostrar Precios */}
            <div className="bg-slate-700 p-4 rounded-lg flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold flex items-center">
                  💰 Mostrar Precios
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Muestra u oculta los precios de los productos en el catálogo
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.mostrar_precios ?? true}
                  onChange={(e) => setFormData(prev => ({ ...prev, mostrar_precios: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            {/* Mostrar Stock */}
            <div className="bg-slate-700 p-4 rounded-lg flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold flex items-center">
                  📦 Mostrar Stock Disponible
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Muestra u oculta la cantidad de stock disponible de cada producto
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.mostrar_stock ?? true}
                  onChange={(e) => setFormData(prev => ({ ...prev, mostrar_stock: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            {/* Habilitar Carrito */}
            <div className="bg-slate-700 p-4 rounded-lg flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold flex items-center">
                  🛒 Habilitar Carrito de Compras
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Activa/desactiva la funcionalidad completa de e-commerce (carrito y checkout)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.habilitar_carrito ?? true}
                  onChange={(e) => setFormData(prev => ({ ...prev, habilitar_carrito: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            {/* Nota explicativa */}
            <div className="bg-teal-900/20 border border-teal-600/30 rounded-lg p-4">
              <p className="text-teal-400 text-sm">
                💡 <strong>Modo Catálogo:</strong> Si desactivas todas las opciones, tendrás una landing page de solo catálogo 
                sin precios, stock ni opción de compra. Perfecta para mostrar productos sin venta online.
              </p>
            </div>
          </div>
        </div>

        {/* Sección: SEO */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">🔍 SEO (Optimización para Buscadores)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Meta Title</label>
              <input
                type="text"
                value={formData.meta_title || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                placeholder="Tu Empresa - Productos Frescos"
                maxLength={60}
              />
              <p className="text-xs text-slate-400 mt-1">
                {(formData.meta_title || '').length}/60 caracteres
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Meta Description</label>
              <textarea
                value={formData.meta_description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                rows={3}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                placeholder="Descripción breve de tu negocio para aparecer en Google"
                maxLength={160}
              />
              <p className="text-xs text-slate-400 mt-1">
                {(formData.meta_description || '').length}/160 caracteres
              </p>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
          >
            {guardando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
