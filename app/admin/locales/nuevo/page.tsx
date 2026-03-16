'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { createLocal, type LocalCreate } from '@/lib/api/locales';
import { useRouter } from 'next/navigation';

interface DireccionSugerencia {
  place_name: string;
  center: [number, number];
  text: string;
  context?: Array<{ id: string; text: string }>;
}

export default function NuevoLocalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Address autocomplete
  const [sugerenciasDireccion, setSugerenciasDireccion] = useState<DireccionSugerencia[]>([]);
  const [mostrarSugerenciasDireccion, setMostrarSugerenciasDireccion] = useState(false);
  const [cargandoSugerenciasDireccion, setCargandoSugerenciasDireccion] = useState(false);
  const direccionRef = useRef<HTMLDivElement>(null);
  const timeoutDireccionRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (direccionRef.current && !direccionRef.current.contains(event.target as Node)) {
        setMostrarSugerenciasDireccion(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const obtenerSugerenciasDireccion = async (query: string): Promise<DireccionSugerencia[]> => {
    if (query.length < 3) return [];
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&country=cl&limit=5&types=address,poi`
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.features || [];
    } catch {
      return [];
    }
  };

  const buscarSugerenciasDireccion = (query: string) => {
    if (timeoutDireccionRef.current) clearTimeout(timeoutDireccionRef.current);
    setCargandoSugerenciasDireccion(true);
    setMostrarSugerenciasDireccion(true);
    timeoutDireccionRef.current = setTimeout(async () => {
      const sugerencias = await obtenerSugerenciasDireccion(query);
      setSugerenciasDireccion(sugerencias);
      setCargandoSugerenciasDireccion(false);
    }, 300);
  };

  const handleDireccionChange = (value: string) => {
    setFormData(prev => ({ ...prev, direccion: value }));
    if (value.length >= 3) {
      buscarSugerenciasDireccion(value);
    } else {
      setMostrarSugerenciasDireccion(false);
      setSugerenciasDireccion([]);
    }
  };

  const seleccionarSugerenciaDireccion = (sugerencia: DireccionSugerencia) => {
    setFormData(prev => ({ ...prev, direccion: sugerencia.place_name }));
    setMostrarSugerenciasDireccion(false);
    setSugerenciasDireccion([]);
  };

  const [formData, setFormData] = useState<LocalCreate>({
    nombre: '',
    direccion: '',
    activo: true
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await createLocal(formData);
      alert('Local creado exitosamente');
      router.push('/admin/locales');
    } catch (err) {
      alert('Error al crear local');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-white mb-6">Nuevo Local</h1>

      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-6 space-y-4">
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
            placeholder="Ej: Estación Central"
          />
        </div>

        <div ref={direccionRef} className="relative">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Dirección
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.direccion || ''}
              onChange={(e) => handleDireccionChange(e.target.value)}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-primary focus:outline-none pr-8"
              placeholder="Busca la dirección..."
              autoComplete="off"
            />
            {cargandoSugerenciasDireccion && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
          {mostrarSugerenciasDireccion && sugerenciasDireccion.length > 0 && (
            <ul className="absolute z-50 w-full bg-slate-700 border border-slate-600 rounded-lg mt-1 shadow-xl max-h-60 overflow-y-auto">
              {sugerenciasDireccion.map((s, i) => (
                <li
                  key={i}
                  onClick={() => seleccionarSugerenciaDireccion(s)}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-600 text-white text-sm border-b border-slate-600 last:border-0"
                >
                  <p className="font-medium">{s.text}</p>
                  <p className="text-gray-400 text-xs truncate">{s.place_name}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="activo"
            checked={formData.activo}
            onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
            className="w-4 h-4 text-primary bg-slate-700 border-slate-600 rounded focus:ring-primary"
          />
          <label htmlFor="activo" className="text-sm text-gray-300">
            Local activo
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Crear Local'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
