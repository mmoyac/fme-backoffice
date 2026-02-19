import { useState, useRef, useEffect } from 'react';

interface DireccionSugerencia {
  place_name: string;
  center: [number, number];
  text: string;
}

interface DireccionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function DireccionAutocomplete({
  value,
  onChange,
  placeholder = 'Ingrese dirección...',
  className = '',
  required = false
}: DireccionAutocompleteProps) {
  const [sugerencias, setSugerencias] = useState<DireccionSugerencia[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Verificar si MAPBOX_ACCESS_TOKEN está configurado
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Función para obtener sugerencias de Mapbox
  const obtenerSugerencias = async (query: string): Promise<DireccionSugerencia[]> => {
    if (query.length < 3) return [];

    if (!mapboxToken) {
      console.warn('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN no está configurado');
      return [];
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=cl&limit=5&types=address,poi`
      );
      
      if (!response.ok) {
        setError('Error al buscar direcciones');
        return [];
      }
      
      const data = await response.json();
      setError('');
      return data.features || [];
    } catch (error) {
      console.error('Error obteniendo sugerencias:', error);
      setError('Error de conexión');
      return [];
    }
  };

  // Debounced search
  const buscarSugerencias = (query: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setCargando(true);
    setMostrarSugerencias(true);
    setError('');

    timeoutRef.current = setTimeout(async () => {
      const resultados = await obtenerSugerencias(query);
      setSugerencias(resultados);
      setCargando(false);
    }, 300);
  };

  // Manejar cambio en input
  const handleChange = (newValue: string) => {
    onChange(newValue);
    
    if (newValue.length >= 3) {
      buscarSugerencias(newValue);
    } else {
      setMostrarSugerencias(false);
      setSugerencias([]);
      setError('');
    }
  };

  // Seleccionar sugerencia
  const seleccionarSugerencia = (sugerencia: DireccionSugerencia) => {
    onChange(sugerencia.place_name);
    setMostrarSugerencias(false);
    setSugerencias([]);
    setError('');
  };

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMostrarSugerencias(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      />
      
      {/* Indicador de carga */}
      {cargando && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute left-0 right-0 mt-1 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Sugerencias */}
      {mostrarSugerencias && sugerencias.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-slate-700 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {sugerencias.map((sugerencia, index) => (
            <button
              key={index}
              type="button"
              onClick={() => seleccionarSugerencia(sugerencia)}
              className="w-full text-left px-3 py-2 hover:bg-slate-600 text-white text-sm border-b border-slate-600 last:border-b-0 transition-colors"
            >
              <div className="font-medium">{sugerencia.text}</div>
              <div className="text-xs text-slate-400 truncate">{sugerencia.place_name}</div>
            </button>
          ))}
        </div>
      )}

      {/* Sin resultados */}
      {mostrarSugerencias && !cargando && sugerencias.length === 0 && value.length >= 3 && !error && (
        <div className="absolute z-50 w-full mt-1 bg-slate-700 border border-slate-600 rounded-md shadow-lg px-3 py-2">
          <div className="text-sm text-slate-400">
            No se encontraron direcciones
          </div>
        </div>
      )}

      {/* Nota si no está configurado Mapbox */}
      {!mapboxToken && value.length >= 3 && (
        <div className="absolute left-0 right-0 mt-1 text-xs text-yellow-400">
          ⚠️ Autocompletado no disponible (configura MAPBOX_ACCESS_TOKEN)
        </div>
      )}
    </div>
  );
}
