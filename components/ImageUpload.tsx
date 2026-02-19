"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  label: string;
  currentUrl?: string;
  tipo: 'logo' | 'favicon';
  onUploadSuccess: (url: string) => void;
  acceptedFormats?: string;
  maxSizeMB?: number;
}

const TOKEN_KEY = 'fme_auth_token'; // Mismo que en auth.ts

export default function ImageUpload({
  label,
  currentUrl,
  tipo,
  onUploadSuccess,
  acceptedFormats = ".jpg,.jpeg,.png,.webp,.svg,.ico",
  maxSizeMB = 2
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [imageError, setImageError] = useState(false);

  // Actualizar preview cuando currentUrl cambia (después de cargar datos)
  useEffect(() => {
    if (currentUrl) {
      console.log(`[ImageUpload ${tipo}] currentUrl recibida:`, currentUrl);
      setPreview(currentUrl);
      setImageError(false); // Reset error state
    }
  }, [currentUrl, tipo]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`El archivo es demasiado grande. Máximo ${maxSizeMB}MB`);
      return;
    }

    // Crear preview local
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Subir archivo
    setUploading(true);
    setError(null);
    setImageError(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        throw new Error('No hay sesión activa. Por favor, vuelve a iniciar sesión.');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/configuracion-landing/upload-imagen?tipo=${tipo}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al subir imagen');
      }

      const data = await response.json();
      
      // Construir URL completa
      const fullUrl = `${process.env.NEXT_PUBLIC_API_URL}${data.url}`;
      setPreview(fullUrl);
      setImageError(false);
      onUploadSuccess(data.url); // Guardar URL relativa
      
    } catch (err: any) {
      setError(err.message || 'Error al subir imagen');
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUploadSuccess('');
    setError(null);
    setImageError(false);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-200">
        {label}
      </label>
      
      {/* Preview */}
      {preview && !imageError && (
        <div className="relative inline-block">
          <div className={`relative overflow-hidden rounded-lg border border-gray-600 bg-gray-700 ${
            tipo === 'favicon' ? 'w-16 h-16' : 'w-48 h-48'
          }`}>
            <img
              src={preview.startsWith('http') ? preview : `${process.env.NEXT_PUBLIC_API_URL}${preview}`}
              alt={label}
              className="w-full h-full object-contain"
              onError={(e) => {
                console.error(`[ImageUpload ${tipo}] Error cargando imagen:`, preview);
                const imgUrl = preview.startsWith('http') ? preview : `${process.env.NEXT_PUBLIC_API_URL}${preview}`;
                console.error(`[ImageUpload ${tipo}] URL completa:`, imgUrl);
                setImageError(true);
              }}
            />
          </div>
          
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
            title="Eliminar imagen"
          >
            ×
          </button>
        </div>
      )}

      {/* Placeholder cuando la imagen no existe o falló al cargar */}
      {preview && imageError && (
        <div className={`relative overflow-hidden rounded-lg border-2 border-dashed border-gray-500 bg-gray-800 ${
          tipo === 'favicon' ? 'w-16 h-16' : 'w-48 h-48'
        } flex items-center justify-center`}>
          <div className="text-center p-2">
            <svg className="w-8 h-8 mx-auto text-gray-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-gray-400">No existe</p>
            <p className="text-xs text-gray-500 mt-1">{preview}</p>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="flex items-center gap-3">
        <label className={`
          px-4 py-2 rounded-lg cursor-pointer transition-all
          ${uploading 
            ? 'bg-gray-600 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
          }
          text-white font-medium
        `}>
          {uploading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Subiendo...
            </span>
          ) : (
            preview ? 'Cambiar imagen' : 'Subir imagen'
          )}
          <input
            type="file"
            accept={acceptedFormats}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>

        <span className="text-xs text-gray-400">
          {acceptedFormats.replace(/\./g, '').toUpperCase()} (máx. {maxSizeMB}MB)
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-400">
        {imageError ? (
          <span className="text-yellow-400">⚠️ La imagen guardada no existe. Sube una nueva imagen.</span>
        ) : !preview ? (
          tipo === 'favicon' 
            ? '📌 Se recomienda formato .ico o .png de 32x32 px' 
            : '📌 Se recomienda formato .png o .svg con fondo transparente'
        ) : (
          tipo === 'favicon' 
            ? '✅ Favicon cargado. Se recomienda .ico o .png de 32x32 px' 
            : '✅ Logo cargado. Se recomienda .png o .svg con fondo transparente'
        )}
      </p>
    </div>
  );
}
