'use client';

import { useRef, useState } from 'react';
import type { EtiquetaCompleta } from '@/lib/api/etiquetas';
import EtiquetaNutricional, { CONFIGS_ETIQUETA, esFormatoEmpresa, problemaSellos, type TamanoEtiqueta } from './etiquetas/EtiquetaNutricional';
import { generarPdfEtiquetas, descargarPdf, imprimirPdf } from '@/lib/etiquetas/pdf';

interface EtiquetaPreviewProps {
  etiqueta: EtiquetaCompleta;
  onClose: () => void;
}

export default function EtiquetaPreview({ etiqueta, onClose }: EtiquetaPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);   // preview escalado (pantalla)
  const pdfRef = useRef<HTMLDivElement>(null);     // render oculto a tamaño real (PDF)
  const [tamano, setTamano] = useState<TamanoEtiqueta>('A4');
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [desborda, setDesborda] = useState(false);

  const generarPDF = async () => {
    const target = pdfRef.current;
    if (!target) return null;
    return generarPdfEtiquetas([{ nodo: target, copias: 1 }], tamano);
  };

  const handleDownloadPDF = async () => {
    setGenerandoPDF(true);
    try {
      const pdf = await generarPDF();
      if (pdf) descargarPdf(pdf, `etiqueta_${etiqueta.producto_sku}_${tamano}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar PDF');
    } finally {
      setGenerandoPDF(false);
    }
  };

  const handlePrint = async () => {
    setGenerandoPDF(true);
    try {
      const pdf = await generarPDF();
      if (pdf) imprimirPdf(pdf);
    } catch (error) {
      console.error('Error imprimiendo:', error);
      alert('Error al imprimir');
    } finally {
      setGenerandoPDF(false);
    }
  };

  const config = CONFIGS_ETIQUETA[tamano];

  // Escala para que los layouts grandes quepan en la pantalla del modal
  const previewScale = tamano === 'A4' ? 0.72 : tamano === '62x100' ? 1.8 : tamano === '75x62' ? 2.2 : 1;
  // Sellos que no alcanzan su tamaño legal en el formato elegido: no se permite imprimir
  const bloqueoSellos = problemaSellos(tamano, etiqueta.sellos?.length ?? 0);

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 no-print">
        <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-auto">
          {/* Header */}
          <div className="bg-gray-800 text-white px-6 py-4 rounded-t-lg no-print">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">Vista Previa de Etiqueta</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={generandoPDF || !!bloqueoSellos}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {generandoPDF ? '⏳ Generando...' : '📥 Descargar PDF'}
                </button>
                <button
                  onClick={handlePrint}
                  disabled={generandoPDF || !!bloqueoSellos}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {generandoPDF ? '⏳ Generando...' : '🖨️ Imprimir'}
                </button>
                <button
                  onClick={onClose}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>
            {/* Selector de tamaño */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Tamaño de Etiqueta:</label>
              <select
                value={tamano}
                onChange={(e) => setTamano(e.target.value as TamanoEtiqueta)}
                className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
              >
                {Object.entries(CONFIGS_ETIQUETA).map(([key, val]) => (
                  <option key={key} value={key}>{val.nombre}</option>
                ))}
              </select>
            </div>
            {bloqueoSellos && (
              <p className="mt-2 text-sm text-red-300">⛔ No se puede imprimir: {bloqueoSellos}.</p>
            )}
            {esFormatoEmpresa(tamano) && desborda && !bloqueoSellos && (
              <p className="mt-2 text-sm text-amber-300">
                ⚠️ Texto demasiado largo para este formato: parte del contenido no cabe. Acorta ingredientes, preparación o conservación en la ficha del producto.
              </p>
            )}
          </div>

          {/* Vista previa */}
          <div className="p-6 bg-gray-100 flex justify-center items-start no-print overflow-auto">
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'top center',
                marginBottom: previewScale !== 1 ? `calc((${previewScale} - 1) * ${config.alto})` : '0',
              }}
            >
              <div
                ref={printRef}
                className="printable-label bg-white shadow-lg"
                style={{
                  width: config.ancho,
                  height: config.alto,
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                }}
              >
                <EtiquetaNutricional etiqueta={etiqueta} tamano={tamano} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DIV OCULTO A TAMAÑO REAL para generación de PDF ── */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          zIndex: -1,
          pointerEvents: 'none',
        }}
      >
        <EtiquetaNutricional ref={pdfRef} etiqueta={etiqueta} tamano={tamano} onDesborde={setDesborda} />
      </div>

      {/* Estilos para impresión */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .printable-label, .printable-label * { visibility: visible !important; }
          .printable-label {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: ${config.ancho} !important;
            height: ${config.alto} !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            overflow: hidden !important;
            transform: none !important;
          }
          .no-print, .no-print * { display: none !important; }
          @page {
            size: ${config.ancho} ${config.alto};
            margin: 0;
          }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          * { page-break-inside: avoid !important; }
        }
      `}</style>
    </>
  );
}
