/**
 * Componente mejorado de captura de etiqueta que utiliza Gemini Vision API
 * para extracción de datos con alta precisión (90-100% vs 40% de Tesseract)
 */

'use client'

import React, { useState, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Camera, Upload, Check, X, RefreshCw, Zap } from 'lucide-react'
import { AuthService } from '@/lib/auth'

interface DatosEtiqueta {
  peso_bruto_kg: string | null
  peso_neto_kg: string | null
  fecha_vencimiento: string | null
  fecha_fabricacion: string | null
  nombre_producto: string | null
  lote_tropa: string | null
  codigo_barras_superior: string | null
  confianza: number
  texto_extraido?: string
  producto_id?: number | null
  producto_match_score?: number
}

interface CapturaEtiquetaGeminiProps {
  onDatosExtraidos: (datos: DatosEtiqueta) => void
  onError?: (error: string) => void
}

export default function CapturaEtiquetaGemini({ 
  onDatosExtraidos, 
  onError 
}: CapturaEtiquetaGeminiProps) {
  const [imagenCapturada, setImagenCapturada] = useState<string | null>(null)
  const [datosExtraidos, setDatosExtraidos] = useState<DatosEtiqueta | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metodoCarga, setMetodoCarga] = useState<'archivo' | 'camara'>('archivo')
  const [mostrarDebug, setMostrarDebug] = useState(false)

  const inputArchivoRef = useRef<HTMLInputElement>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  // Detectar si es móvil para mostrar cámara por defecto
  const esMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  React.useEffect(() => {
    if (esMobile) {
      setMetodoCarga('camara')
    }
  }, [esMobile])

  // Función para procesar imagen con Gemini Vision API
  const procesarConGemini = async (archivo: File): Promise<DatosEtiqueta> => {
    const formData = new FormData()
    formData.append('file', archivo)

    // Obtener token y preparar headers para FormData
    const token = AuthService.getToken()
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Usar la URL completa del backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await fetch(`${apiUrl}/api/gemini/extraer-etiqueta`, {
      method: 'POST',
      headers, // No incluir Content-Type para FormData
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || 'Error procesando imagen con Gemini')
    }

    return await response.json()
  }

  // Manejar selección de archivo
  const manejarArchivoSeleccionado = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0]
    if (!archivo) return

    try {
      setCargando(true)
      setError(null)

      // Mostrar preview de la imagen
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagenCapturada(e.target?.result as string)
      }
      reader.readAsDataURL(archivo)

      // Procesar con Gemini
      const datos = await procesarConGemini(archivo)
      setDatosExtraidos(datos)
      onDatosExtraidos(datos)

    } catch (err) {
      const mensajeError = err instanceof Error ? err.message : 'Error desconocido'
      setError(mensajeError)
      onError?.(mensajeError)
    } finally {
      setCargando(false)
    }
  }

  // Inicializar escáner de cámara
  const inicializarCamara = () => {
    if (scannerRef.current) return

    const config: any = {
      fps: 10,
      qrbox: { width: 300, height: 200 },
      aspectRatio: 1.777778,
      supportedScanTypes: [],
    }

    const scanner = new Html5QrcodeScanner("lector-camara", config, false)
    scannerRef.current = scanner

    scanner.render(
      async (data) => {
        // Si el QR contiene una URL de imagen, procesarla
        console.log('QR detectado:', data)
      },
      (error) => {
        // Ignorar errores de no encontrar QR
        console.log('Buscando QR...', error)
      }
    )
  }

  // Capturar imagen de la cámara
  const capturarDeCamara = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',  // Usar cámara trasera en móviles
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      })
      .then(stream => {
        const video = document.createElement('video')
        video.srcObject = stream
        video.play()

        video.onloadedmetadata = () => {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(video, 0, 0)

          canvas.toBlob(async (blob) => {
            if (blob) {
              try {
                setCargando(true)
                setError(null)

                const archivo = new File([blob], 'captura_camara.jpg', { type: 'image/jpeg' })
                
                // Mostrar preview
                setImagenCapturada(canvas.toDataURL())

                // Procesar con Gemini
                const datos = await procesarConGemini(archivo)
                setDatosExtraidos(datos)
                onDatosExtraidos(datos)

              } catch (err) {
                const mensajeError = err instanceof Error ? err.message : 'Error procesando captura'
                setError(mensajeError)
                onError?.(mensajeError)
              } finally {
                setCargando(false)
                // Detener cámara
                stream.getTracks().forEach(track => track.stop())
              }
            }
          }, 'image/jpeg', 0.9)
        }
      })
      .catch(err => {
        setError('Error accediendo a la cámara: ' + err.message)
        onError?.('Error accediendo a la cámara: ' + err.message)
      })
    }
  }

  // Limpiar y reiniciar
  const limpiarCaptura = () => {
    setImagenCapturada(null)
    setDatosExtraidos(null)
    setError(null)
    if (inputArchivoRef.current) {
      inputArchivoRef.current.value = ''
    }
    if (scannerRef.current) {
      scannerRef.current.clear()
      scannerRef.current = null
    }
  }

  return (
    <div className="space-y-6">
      {/* Selector de método de carga */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMetodoCarga('archivo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            metodoCarga === 'archivo'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <Upload size={16} />
          Subir Archivo
        </button>
        <button
          type="button"
          onClick={() => setMetodoCarga('camara')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            metodoCarga === 'camara'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <Camera size={16} />
          Usar Cámara
        </button>
      </div>

      {/* Área de carga */}
      <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center">
        {metodoCarga === 'archivo' ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Upload className="h-12 w-12 text-slate-400" />
            </div>
            <div>
              <p className="text-slate-300 mb-2">
                Haz clic para seleccionar una imagen de la etiqueta
              </p>
              <p className="text-sm text-slate-500">
                JPG, PNG, WEBP hasta 10MB
              </p>
            </div>
            <input
              ref={inputArchivoRef}
              type="file"
              accept="image/*"
              onChange={manejarArchivoSeleccionado}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputArchivoRef.current?.click()}
              disabled={cargando}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-600"
            >
              Seleccionar Imagen
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Camera className="h-12 w-12 text-slate-400" />
            </div>
            <div>
              <p className="text-slate-300 mb-2">
                Capturar imagen con la cámara
              </p>
              <p className="text-sm text-slate-500">
                Asegúrate de que la etiqueta esté bien iluminada y enfocada
              </p>
            </div>
            <button
              type="button"
              onClick={capturarDeCamara}
              disabled={cargando}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-slate-600 flex items-center gap-2 mx-auto"
            >
              <Camera size={16} />
              Capturar Foto
            </button>
          </div>
        )}
      </div>

      {/* Indicador de procesamiento con Gemini */}
      {cargando && (
        <div className="bg-blue-600/20 border border-blue-600 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="animate-spin text-blue-400" size={20} />
            <div>
              <p className="text-blue-300 font-medium flex items-center gap-2">
                <Zap size={16} className="text-yellow-400" />
                Procesando con Gemini Vision AI...
              </p>
              <p className="text-blue-400 text-sm">
                Extrayendo datos de la etiqueta con alta precisión
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mostrar error */}
      {error && (
        <div className="bg-red-600/20 border border-red-600 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <X className="text-red-400" size={16} />
            <span className="text-red-300">Error: {error}</span>
          </div>
        </div>
      )}

      {/* Preview de imagen capturada */}
      {imagenCapturada && (
        <div className="border border-slate-600 rounded-lg p-4">
          <h3 className="text-lg font-medium text-slate-300 mb-3">Imagen Capturada</h3>
          <img 
            src={imagenCapturada} 
            alt="Etiqueta capturada" 
            className="max-w-full h-auto max-h-80 mx-auto border border-slate-600 rounded"
          />
        </div>
      )}

      {/* Datos extraídos */}
      {datosExtraidos && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-green-300 flex items-center gap-2">
              <Check size={20} />
              Datos Extraídos con Gemini Vision
            </h3>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" />
              <span className="text-sm text-slate-400">
                Confianza: {Math.round((datosExtraidos.confianza || 0) * 100)}%
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400">Peso Bruto (kg)</label>
              <p className="text-white font-medium">
                {datosExtraidos.peso_bruto_kg || 'No detectado'}
              </p>
            </div>
            <div>
              <label className="text-sm text-slate-400">Peso Neto (kg)</label>
              <p className="text-white font-medium">
                {datosExtraidos.peso_neto_kg || 'No detectado'}
              </p>
            </div>
            <div>
              <label className="text-sm text-slate-400">Fecha Vencimiento</label>
              <p className="text-white font-medium">
                {datosExtraidos.fecha_vencimiento || 'No detectada'}
              </p>
            </div>
            <div>
              <label className="text-sm text-slate-400">Lote/Tropa</label>
              <p className="text-white font-medium">
                {datosExtraidos.lote_tropa || 'No detectado'}
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-400">Código de Barras</label>
              <p className="text-white font-medium">
                {datosExtraidos.codigo_barras_superior || 'No detectado'}
              </p>
            </div>
          </div>

          {/* Debug expandible */}
          <button
            type="button"
            onClick={() => setMostrarDebug(!mostrarDebug)}
            className="mt-4 text-sm text-slate-400 hover:text-slate-300"
          >
            {mostrarDebug ? 'Ocultar' : 'Mostrar'} información de debug
          </button>
          
          {mostrarDebug && datosExtraidos.texto_extraido && (
            <div className="mt-3 bg-slate-900 rounded p-3">
              <label className="text-xs text-slate-500 block mb-1">Respuesta de Gemini:</label>
              <pre className="text-xs text-slate-300 overflow-auto">
                {datosExtraidos.texto_extraido}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Botón para limpiar */}
      {(imagenCapturada || datosExtraidos || error) && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={limpiarCaptura}
            className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700"
          >
            Nueva Captura
          </button>
        </div>
      )}
    </div>
  )
}