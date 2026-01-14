// Mejora avanzada de preprocessing para OCR
// Técnicas usadas por sistemas profesionales

export function mejorarImagenParaOCR(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // 1. Convertir a escala de grises con mejor algoritmo
  for (let i = 0; i < data.length; i += 4) {
    const luminance = Math.round(
      0.299 * data[i] + 
      0.587 * data[i + 1] + 
      0.114 * data[i + 2]
    );
    data[i] = luminance;     // R
    data[i + 1] = luminance; // G  
    data[i + 2] = luminance; // B
  }

  // 2. Aplicar umbralización adaptativa (OTSU method simplificado)
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    histogram[data[i]]++;
  }

  // Calcular umbral óptimo
  let total = canvas.width * canvas.height;
  let sum = 0;
  for (let t = 0; t < 256; t++) {
    sum += t * histogram[t];
  }

  let sumB = 0;
  let wB = 0;
  let maximum = 0.0;
  let threshold = 0;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;

    let wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];

    let mB = sumB / wB;
    let mF = (sum - sumB) / wF;

    let varBetween = wB * wF * (mB - mF) * (mB - mF);

    if (varBetween > maximum) {
      maximum = varBetween;
      threshold = t;
    }
  }

  // 3. Aplicar umbral calculado
  for (let i = 0; i < data.length; i += 4) {
    const value = data[i] > threshold ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  // 4. Aplicar operaciones morfológicas (erosión/dilatación)
  const processedData = new Uint8ClampedArray(data);
  const width = canvas.width;
  const height = canvas.height;

  // Dilatación para conectar caracteres fragmentados
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // Si el pixel actual es negro, revisar vecinos
      if (data[idx] === 0) {
        // Hacer dilatación de 3x3
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            processedData[nIdx] = 0;
            processedData[nIdx + 1] = 0;
            processedData[nIdx + 2] = 0;
          }
        }
      }
    }
  }

  ctx.putImageData(new ImageData(processedData, width, height), 0, 0);
  return canvas;
}

// Integración con Gemini Vision API
export async function extraerDatosConGemini(imagenBase64: string) {
  const prompt = `
  Extrae los siguientes datos de esta etiqueta de carne argentina en formato JSON:
  
  {
    "peso_bruto_kg": "XX.XX",
    "peso_neto_kg": "XX.XX", 
    "fecha_vencimiento": "YYYY-MM-DD",
    "lote_tropa": "XXXXXXXX",
    "codigo_barras_superior": "XXXXXXXXXXX"
  }
  
  Busca específicamente:
  - Peso Bruto/Gross Weight
  - Peso Neto/Net Weight 
  - Fecha de vencimiento (formato DD/MM/YYYY)
  - Lote (código de 8 dígitos, ej: 20250715)
  - Código de barras (11 dígitos, ej: 90677477200)
  `;

  try {
    // Esta sería la integración con Gemini API
    const response = await fetch('/api/gemini-vision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imagenBase64,
        prompt: prompt
      })
    });

    const resultado = await response.json();
    return resultado;
  } catch (error) {
    console.error('Error con Gemini Vision:', error);
    return null;
  }
}

// Configuraciones avanzadas de Tesseract como alternativa
export const configuracionesTesseractAvanzadas = [
  {
    lang: 'eng',
    options: {
      tessedit_pageseg_mode: '6', // Uniform block of text
      tessedit_ocr_engine_mode: '1', // Neural net LSTM only
      tessedit_char_blacklist: '~`!@#$%^&*()_+[]{}|\\:";\'<>?,./=', // Eliminar caracteres problemáticos
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,-/:() ',
      classify_bln_numeric_mode: '1', // Mejorar números
      textord_really_old_xheight: '1', // Mejorar altura de línea
      textord_min_xheight: '10', // Altura mínima de caracteres
      preserve_interword_spaces: '1' // Preservar espacios
    }
  },
  {
    lang: 'spa+eng',
    options: {
      tessedit_pageseg_mode: '4', // Single column of text
      tessedit_ocr_engine_mode: '2', // Legacy + LSTM
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚÑáéíóúñ.,-/:() ',
      classify_integer_matcher_multiplier: '10', // Mejor reconocimiento de números
      classify_cp_cutoff_strength: '7'
    }
  }
];