'use client';

import { useState, useRef, useEffect } from 'react';

interface CalculoDespacho {
  direccionOrigen: string;
  direccionDestino: string;
  distanciaKm: number;
  tiempoMinutos: number;
  costoFijo: number;
  costoVariable: number;
  costoTotal: number;
}

interface DireccionSugerencia {
  place_name: string;
  center: [number, number];
  text: string;
}

export default function CalculadoraDespachoPage() {
  const [direccionOrigen, setDireccionOrigen] = useState('');
  const [direccionDestino, setDireccionDestino] = useState('');
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState<CalculoDespacho | null>(null);
  const [error, setError] = useState('');

  // Estados para autocompletado
  const [sugerenciasOrigen, setSugerenciasOrigen] = useState<DireccionSugerencia[]>([]);
  const [sugerenciasDestino, setSugerenciasDestino] = useState<DireccionSugerencia[]>([]);
  const [mostrarSugerenciasOrigen, setMostrarSugerenciasOrigen] = useState(false);
  const [mostrarSugerenciasDestino, setMostrarSugerenciasDestino] = useState(false);
  const [cargandoSugerenciasOrigen, setCargandoSugerenciasOrigen] = useState(false);
  const [cargandoSugerenciasDestino, setCargandoSugerenciasDestino] = useState(false);

  // Referencias para detectar clicks fuera
  const origenRef = useRef<HTMLDivElement>(null);
  const destinoRef = useRef<HTMLDivElement>(null);

  // Timeouts para debounce
  const timeoutOrigenRef = useRef<NodeJS.Timeout>();
  const timeoutDestinoRef = useRef<NodeJS.Timeout>();

  // Constantes de precios
  const COSTO_FIJO = 2000; // CLP
  const COSTO_POR_KM = 150; // CLP

  // Función para obtener sugerencias de Mapbox
  const obtenerSugerencias = async (query: string): Promise<DireccionSugerencia[]> => {
    if (query.length < 3) return [];

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&country=cl&limit=5&types=address,poi`
      );
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.features || [];
    } catch (error) {
      console.error('Error obteniendo sugerencias:', error);
      return [];
    }
  };

  // Debounced search para origen
  const buscarSugerenciasOrigen = (query: string) => {
    if (timeoutOrigenRef.current) {
      clearTimeout(timeoutOrigenRef.current);
    }

    setCargandoSugerenciasOrigen(true);
    setMostrarSugerenciasOrigen(true);

    timeoutOrigenRef.current = setTimeout(async () => {
      const sugerencias = await obtenerSugerencias(query);
      setSugerenciasOrigen(sugerencias);
      setCargandoSugerenciasOrigen(false);
    }, 300);
  };

  // Debounced search para destino
  const buscarSugerenciasDestino = (query: string) => {
    if (timeoutDestinoRef.current) {
      clearTimeout(timeoutDestinoRef.current);
    }

    setCargandoSugerenciasDestino(true);
    setMostrarSugerenciasDestino(true);

    timeoutDestinoRef.current = setTimeout(async () => {
      const sugerencias = await obtenerSugerencias(query);
      setSugerenciasDestino(sugerencias);
      setCargandoSugerenciasDestino(false);
    }, 300);
  };

  // Manejar cambio en input origen
  const handleOrigenChange = (value: string) => {
    setDireccionOrigen(value);
    if (value.length >= 3) {
      buscarSugerenciasOrigen(value);
    } else {
      setMostrarSugerenciasOrigen(false);
      setSugerenciasOrigen([]);
    }
  };

  // Manejar cambio en input destino
  const handleDestinoChange = (value: string) => {
    setDireccionDestino(value);
    if (value.length >= 3) {
      buscarSugerenciasDestino(value);
    } else {
      setMostrarSugerenciasDestino(false);
      setSugerenciasDestino([]);
    }
  };

  // Seleccionar sugerencia origen
  const seleccionarSugerenciaOrigen = (sugerencia: DireccionSugerencia) => {
    setDireccionOrigen(sugerencia.place_name);
    setMostrarSugerenciasOrigen(false);
    setSugerenciasOrigen([]);
  };

  // Seleccionar sugerencia destino
  const seleccionarSugerenciaDestino = (sugerencia: DireccionSugerencia) => {
    setDireccionDestino(sugerencia.place_name);
    setMostrarSugerenciasDestino(false);
    setSugerenciasDestino([]);
  };

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (origenRef.current && !origenRef.current.contains(event.target as Node)) {
        setMostrarSugerenciasOrigen(false);
      }
      if (destinoRef.current && !destinoRef.current.contains(event.target as Node)) {
        setMostrarSugerenciasDestino(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const geocodeAddress = async (address: string) => {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&country=cl&limit=1`
    );
    
    if (!response.ok) {
      throw new Error('Error en geocodificación');
    }
    
    const data = await response.json();
    if (data.features.length === 0) {
      throw new Error('Dirección no encontrada');
    }
    
    return data.features[0].center; // [longitude, latitude]
  };

  const calcularRuta = async (coordsOrigen: [number, number], coordsDestino: [number, number]) => {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsOrigen[0]},${coordsOrigen[1]};${coordsDestino[0]},${coordsDestino[1]}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&geometries=geojson`
    );
    
    if (!response.ok) {
      throw new Error('Error calculando ruta');
    }
    
    const data = await response.json();
    if (data.routes.length === 0) {
      throw new Error('No se pudo encontrar una ruta');
    }
    
    const route = data.routes[0];
    return {
      distanciaKm: route.distance / 1000, // Convertir metros a km
      tiempoMinutos: route.duration / 60   // Convertir segundos a minutos
    };
  };

  const calcularCostoDespacho = async () => {
    if (!direccionOrigen.trim() || !direccionDestino.trim()) {
      setError('Por favor ingresa ambas direcciones');
      return;
    }

    setCalculando(true);
    setError('');
    setResultado(null);

    try {
      // 1. Geocodificar ambas direcciones
      const [coordsOrigen, coordsDestino] = await Promise.all([
        geocodeAddress(direccionOrigen),
        geocodeAddress(direccionDestino)
      ]);

      // 2. Calcular ruta y distancia
      const { distanciaKm, tiempoMinutos } = await calcularRuta(coordsOrigen, coordsDestino);

      // 3. Calcular costos
      const costoVariable = Math.round(distanciaKm * COSTO_POR_KM);
      const costoTotal = COSTO_FIJO + costoVariable;

      setResultado({
        direccionOrigen,
        direccionDestino,
        distanciaKm: Math.round(distanciaKm * 100) / 100, // 2 decimales
        tiempoMinutos: Math.round(tiempoMinutos),
        costoFijo: COSTO_FIJO,
        costoVariable,
        costoTotal
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error calculando despacho');
    } finally {
      setCalculando(false);
    }
  };

  const limpiarFormulario = () => {
    setDireccionOrigen('');
    setDireccionDestino('');
    setResultado(null);
    setError('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Calculadora de Despacho</h1>
        <p className="text-gray-400 mt-1">Calcula el costo de envío usando distancia real por Mapbox</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Datos de Envío</h2>
          
          <div className="space-y-4">
            {/* Dirección Origen */}
            <div className="relative" ref={origenRef}>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Dirección de Origen
              </label>
              <input
                type="text"
                value={direccionOrigen}
                onChange={(e) => handleOrigenChange(e.target.value)}
                placeholder="Ej: Av. Providencia 1308, Providencia, Santiago"
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                disabled={calculando}
              />
              
              {/* Sugerencias Origen */}
              {mostrarSugerenciasOrigen && (
                <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {cargandoSugerenciasOrigen ? (
                    <div className="flex items-center justify-center py-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="ml-2 text-sm text-gray-400">Buscando...</span>
                    </div>
                  ) : sugerenciasOrigen.length > 0 ? (
                    <ul>
                      {sugerenciasOrigen.map((sugerencia, index) => (
                        <li
                          key={index}
                          onClick={() => seleccionarSugerenciaOrigen(sugerencia)}
                          className="px-4 py-2 hover:bg-slate-600 cursor-pointer text-sm text-white border-b border-slate-600 last:border-b-0"
                        >
                          <div className="font-medium">{sugerencia.text}</div>
                          <div className="text-xs text-gray-400">{sugerencia.place_name}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400">
                      No se encontraron sugerencias
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dirección Destino */}
            <div className="relative" ref={destinoRef}>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Dirección de Destino
              </label>
              <input
                type="text"
                value={direccionDestino}
                onChange={(e) => handleDestinoChange(e.target.value)}
                placeholder="Ej: Av. Las Condes 12455, Las Condes, Santiago"
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                disabled={calculando}
              />
              
              {/* Sugerencias Destino */}
              {mostrarSugerenciasDestino && (
                <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {cargandoSugerenciasDestino ? (
                    <div className="flex items-center justify-center py-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="ml-2 text-sm text-gray-400">Buscando...</span>
                    </div>
                  ) : sugerenciasDestino.length > 0 ? (
                    <ul>
                      {sugerenciasDestino.map((sugerencia, index) => (
                        <li
                          key={index}
                          onClick={() => seleccionarSugerenciaDestino(sugerencia)}
                          className="px-4 py-2 hover:bg-slate-600 cursor-pointer text-sm text-white border-b border-slate-600 last:border-b-0"
                        >
                          <div className="font-medium">{sugerencia.text}</div>
                          <div className="text-xs text-gray-400">{sugerencia.place_name}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400">
                      No se encontraron sugerencias
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Información de Tarifas */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-400 mb-2">Tarifas de Despacho</h3>
              <div className="text-sm text-gray-300 space-y-1">
                <div className="flex justify-between">
                  <span>Costo fijo:</span>
                  <span className="font-semibold">${COSTO_FIJO.toLocaleString('es-CL')} CLP</span>
                </div>
                <div className="flex justify-between">
                  <span>Costo por km:</span>
                  <span className="font-semibold">${COSTO_POR_KM.toLocaleString('es-CL')} CLP/km</span>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={calcularCostoDespacho}
                disabled={calculando}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {calculando && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {calculando ? 'Calculando...' : 'Calcular Costo'}
              </button>
              
              <button
                onClick={limpiarFormulario}
                disabled={calculando}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Resultados */}
        {resultado && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Resultado del Cálculo</h2>
            
            <div className="space-y-4">
              {/* Ruta */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Ruta Calculada</h3>
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">📍</span>
                    <span className="text-gray-300">{resultado.direccionOrigen}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400">📍</span>
                    <span className="text-gray-300">{resultado.direccionDestino}</span>
                  </div>
                </div>
              </div>

              {/* Métricas de Distancia */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-400">{resultado.distanciaKm} km</p>
                  <p className="text-sm text-gray-400">Distancia</p>
                </div>
                <div className="bg-slate-700 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-400">{resultado.tiempoMinutos} min</p>
                  <p className="text-sm text-gray-400">Tiempo estimado</p>
                </div>
              </div>

              {/* Desglose de Costos */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Desglose de Costos</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Costo fijo:</span>
                    <span className="text-white">${resultado.costoFijo.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Variable ({resultado.distanciaKm} km × $150):</span>
                    <span className="text-white">${resultado.costoVariable.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="border-t border-slate-600 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-white">Total:</span>
                      <span className="text-2xl font-bold text-green-400">${resultado.costoTotal.toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Powered by Mapbox */}
              <div className="text-center">
                <p className="text-xs text-gray-500">Powered by Mapbox</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}