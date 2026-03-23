'use client';

import { useRef, useState } from 'react';
import Barcode from 'react-barcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { EtiquetaCompleta } from '@/lib/api/etiquetas';
import NutritionalLabel from './NutritionalLabel';

interface EtiquetaPreviewProps {
  etiqueta: EtiquetaCompleta;
  onClose: () => void;
}

type TamanoEtiqueta = '62x100' | '62x29' | '29x90' | 'A4';

export default function EtiquetaPreview({ etiqueta, onClose }: EtiquetaPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);   // preview escalado (pantalla)
  const pdfRef = useRef<HTMLDivElement>(null);     // render oculto a tamaño real (PDF)
  const [tamano, setTamano] = useState<TamanoEtiqueta>('A4');
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    // Usa el div oculto a tamaño real, NO el preview escalado
    const target = pdfRef.current;
    if (!target) return;
    setGenerandoPDF(true);
    try {
      const canvas = await html2canvas(target, {
        scale: 3,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      const config = configs[tamano];
      const widthMM = parseFloat(config.ancho);
      const heightMM = parseFloat(config.alto);
      const pdf = new jsPDF({
        orientation: widthMM > heightMM ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [widthMM, heightMM],
      });
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, widthMM, heightMM);
      pdf.save(`etiqueta_${etiqueta.producto_sku}_${tamano}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar PDF');
    } finally {
      setGenerandoPDF(false);
    }
  };

  const configs = {
    '62x100': {
      nombre: 'DK-11202 — 62×100mm Landscape (Brother QL-800)',
      ancho: '100mm',
      alto: '62mm',
      fontSize: { titulo: '11px', normal: '7px', small: '6px' },
      barcodeHeight: 28,
      barcodeWidth: 0.7,
    },
    '62x29': {
      nombre: '62mm x 29mm (Brother QL - Etiqueta Compacta)',
      ancho: '62mm',
      alto: '29mm',
      fontSize: { titulo: '10px', normal: '7px', small: '6px' },
      barcodeHeight: 20,
      barcodeWidth: 1,
    },
    '29x90': {
      nombre: '29mm x 90mm (Brother QL - Etiqueta Vertical)',
      ancho: '29mm',
      alto: '90mm',
      fontSize: { titulo: '8px', normal: '6px', small: '5px' },
      barcodeHeight: 35,
      barcodeWidth: 0.8,
    },
    'A4': {
      nombre: 'A4 Landscape (Etiqueta Nutricional Completa)',
      ancho: '297mm',
      alto: '210mm',
      fontSize: { titulo: '18px', normal: '11px', small: '9px' },
      barcodeHeight: 50,
      barcodeWidth: 1.5,
    },
  };

  const config = configs[tamano];

  // Sello hexagonal (octágono negro estilo Ministerio de Salud Chile)
  // Sello octagonal oficial Ministerio de Salud Chile
  const SelloHexagonal = ({ nombre }: { nombre: string }) => {
    const size = tamano === 'A4' ? 72 : tamano === '62x100' ? 54 : 32;

    // Separar prefijo ("ALTO EN", "CONTIENE") de la(s) palabra(s) principal(es)
    const words = nombre.toUpperCase().split(' ');
    let prefijo = '';
    let mainWords: string[] = [];
    if (words[0] === 'ALTO' && words[1] === 'EN') {
      prefijo = 'ALTO EN';
      mainWords = words.slice(2);
    } else if (words[0] === 'CONTIENE') {
      prefijo = 'CONTIENE';
      mainWords = words.slice(1);
    } else {
      mainWords = words;
    }

    // Posición Y del texto principal según si hay prefijo y cuántas líneas
    const mainFontSize = mainWords.length === 1 ? 34 : 26;
    const prefijoY  = mainWords.length > 1 ? '34%' : '40%';
    const mainBaseY = prefijo ? (mainWords.length === 1 ? 62 : 55) : (mainWords.length === 1 ? 52 : 44);
    const mainStep  = mainWords.length === 1 ? 0 : 20;

    return (
      <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Octágono negro exterior (path exacto del estándar) */}
        <path d="M58.5 0H141.5L200 58.5V141.5L141.5 200H58.5L0 141.5V58.5L58.5 0Z" fill="black" />

        {/* Doble borde blanco interior */}
        <path d="M61 5H139L195 61V139L139 195H61L5 139V61L61 5Z"   stroke="white" strokeWidth="2" />
        <path d="M63 10H137L190 63V137L137 190H63L10 137V63L63 10Z" stroke="white" strokeWidth="1" />

        {/* Prefijo pequeño */}
        {prefijo && (
          <text
            x="50%" y={prefijoY}
            dominantBaseline="middle" textAnchor="middle"
            fill="white"
            style={{ font: 'bold 26px Arial, sans-serif', letterSpacing: '1px' }}
          >
            {prefijo}
          </text>
        )}

        {/* Palabra(s) principal(es) — grande */}
        {mainWords.map((word, i) => (
          <text
            key={word}
            x="50%" y={`${mainBaseY + i * mainStep}%`}
            dominantBaseline="middle" textAnchor="middle"
            fill="white"
            style={{ font: `bold ${mainFontSize}px Arial, sans-serif` }}
          >
            {word}
          </text>
        ))}

        {/* "Ministerio de salud" */}
        <text x="50%" y="82%" dominantBaseline="middle" textAnchor="middle" fill="white" style={{ font: '12px Arial, sans-serif' }}>Ministerio</text>
        <text x="50%" y="90%" dominantBaseline="middle" textAnchor="middle" fill="white" style={{ font: '12px Arial, sans-serif' }}>de salud</text>
      </svg>
    );
  };

  // ── LAYOUT A4 LANDSCAPE ──────────────────────────────────────────
  const LayoutA4 = () => {
    const info = etiqueta.informacion_nutricional;

    return (
      <div style={{
        width: '297mm',
        height: '210mm',
        fontFamily: 'Arial, sans-serif',
        color: '#000',
        background: '#fff',
        padding: '8mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── ENCABEZADO ── */}
        <div style={{ marginBottom: '3mm' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 2mm 0', lineHeight: 1.2 }}>
            {etiqueta.producto_nombre}
          </h1>
          {info?.ingredientes && (
            <p style={{ fontSize: '9px', margin: '0', lineHeight: 1.4 }}>
              <strong>Ingredientes:</strong> {info.ingredientes}
              {info.alergenos && (
                <span> <strong>{info.alergenos}</strong></span>
              )}
            </p>
          )}
        </div>

        <div style={{ borderTop: '1.5px solid #000', marginBottom: '3mm' }} />

        {/* ── CUERPO 3 COLUMNAS ── */}
        <div style={{ display: 'flex', gap: '6mm', flex: 1, minHeight: 0 }}>

          {/* COLUMNA IZQUIERDA */}
          <div style={{ width: '72mm', flexShrink: 0, fontSize: '8.5px', lineHeight: 1.5 }}>
            {info?.modo_uso && (
              <div style={{ marginBottom: '3mm' }}>
                <div style={{ fontWeight: 'bold', fontSize: '9px' }}>Modo de uso / Preparación:</div>
                <div style={{ whiteSpace: 'pre-line' }}>{info.modo_uso}</div>
              </div>
            )}
            {info?.condiciones_almacenamiento && (
              <div style={{ marginBottom: '3mm' }}>
                <div style={{ fontWeight: 'bold', fontSize: '9px' }}>Condiciones de almacenamiento:</div>
                <div style={{ whiteSpace: 'pre-line' }}>{info.condiciones_almacenamiento}</div>
              </div>
            )}
            {info?.plazo_duracion && (
              <div style={{ marginBottom: '3mm' }}>
                <div style={{ fontWeight: 'bold', fontSize: '9px' }}>Plazo de duración:</div>
                <div style={{ whiteSpace: 'pre-line' }}>{info.plazo_duracion}</div>
              </div>
            )}
            <div style={{ marginBottom: '2mm' }}>
              <span style={{ fontWeight: 'bold', fontSize: '9px' }}>Fecha de elaboración / Lote:</span>
              <div style={{ marginTop: '1mm' }}>_____________________</div>
            </div>
            <div style={{ marginBottom: '2mm' }}>
              <span style={{ fontWeight: 'bold', fontSize: '9px' }}>Producido en -</span>
            </div>
            {info?.contenido_neto && (
              <div style={{ marginTop: '2mm' }}>
                <div style={{ fontSize: '8px' }}>Cont. neto</div>
                <div style={{ fontSize: '26px', fontWeight: 'bold', lineHeight: 1 }}>{info.contenido_neto}</div>
              </div>
            )}
            {(etiqueta.empresa_razon_social || etiqueta.empresa_direccion) && (
              <div style={{ marginTop: '3mm', fontSize: '8px', lineHeight: 1.4 }}>
                <div style={{ fontWeight: 'bold' }}>Elaborado por</div>
                <div>{etiqueta.empresa_razon_social}</div>
                <div>{etiqueta.empresa_direccion}</div>
                {etiqueta.empresa_resolucion_sanitaria && (
                  <div>{etiqueta.empresa_resolucion_sanitaria}</div>
                )}
              </div>
            )}
          </div>

          {/* COLUMNA CENTRAL - Tabla nutricional */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {info && <NutritionalLabel info={info} />}
          </div>

          {/* COLUMNA DERECHA - Sellos + código */}
          <div style={{ width: '52mm', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4mm' }}>
            {etiqueta.sellos?.map((sello) => (
              <SelloHexagonal key={sello.codigo} nombre={sello.nombre} />
            ))}
            {etiqueta.codigo_barra && (
              <div style={{ marginTop: 'auto' }}>
                <Barcode
                  value={etiqueta.codigo_barra}
                  format="CODE128"
                  width={1.2}
                  height={35}
                  fontSize={8}
                  background="#ffffff"
                  lineColor="#000000"
                  displayValue={true}
                  margin={0}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ borderTop: '1px solid #000', marginTop: '2mm', paddingTop: '1.5mm', display: 'flex', justifyContent: 'space-between', fontSize: '8px' }}>
          <span>{etiqueta.empresa_email}</span>
          <span>{etiqueta.empresa_telefono}</span>
        </div>
      </div>
    );
  };

  // ── LAYOUT DK-11202 (100×62mm landscape) ─────────────────────────
  const Layout62x100 = () => {
    const info = etiqueta.informacion_nutricional;
    const cfg  = configs['62x100'];
    return (
      <div style={{
        width: '100mm', height: '62mm',
        fontFamily: 'Arial, sans-serif', color: '#000', background: '#fff',
        padding: '2mm', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Nombre + ingredientes */}
        <div style={{ marginBottom: '1.5mm' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', lineHeight: 1.2 }}>
            {etiqueta.producto_nombre}
          </div>
          {info?.ingredientes && (
            <div style={{ fontSize: '5.5px', lineHeight: 1.3 }}>
              <strong>Ingredientes:</strong> {info.ingredientes}
              {info.alergenos && <span> <strong>{info.alergenos}</strong></span>}
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #000', marginBottom: '1.5mm' }} />

        {/* Cuerpo 3 columnas */}
        <div style={{ display: 'flex', gap: '2mm', flex: 1, minHeight: 0 }}>

          {/* Col izquierda */}
          <div style={{ width: '32mm', flexShrink: 0, fontSize: '5.5px', lineHeight: 1.4 }}>
            {info?.modo_uso && (
              <div style={{ marginBottom: '1.5mm' }}>
                <strong>Modo de uso:</strong>
                <div style={{ whiteSpace: 'pre-line' }}>{info.modo_uso}</div>
              </div>
            )}
            {info?.condiciones_almacenamiento && (
              <div style={{ marginBottom: '1.5mm' }}>
                <strong>Almacenamiento:</strong>
                <div style={{ whiteSpace: 'pre-line' }}>{info.condiciones_almacenamiento}</div>
              </div>
            )}
            {info?.plazo_duracion && (
              <div style={{ marginBottom: '1.5mm' }}>
                <strong>Duracion:</strong> {info.plazo_duracion}
              </div>
            )}
            <div style={{ marginBottom: '1.5mm' }}>
              <strong>Fecha / Lote:</strong>
              <div>_______________</div>
            </div>
            {info?.contenido_neto && (
              <div>
                <div style={{ fontSize: '5px' }}>Cont. neto</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: 1 }}>{info.contenido_neto}</div>
              </div>
            )}
            {(etiqueta.empresa_razon_social || etiqueta.empresa_direccion) && (
              <div style={{ marginTop: '1mm', fontSize: '5px', lineHeight: 1.3 }}>
                <strong>Elaborado por</strong>
                <div>{etiqueta.empresa_razon_social}</div>
                <div>{etiqueta.empresa_direccion}</div>
                {etiqueta.empresa_resolucion_sanitaria && <div>{etiqueta.empresa_resolucion_sanitaria}</div>}
              </div>
            )}
          </div>

          {/* Col central - tabla nutricional (se renderiza a 58mm y se escala a 35mm) */}
          <div style={{ width: '40mm', flexShrink: 0, position: 'relative', overflow: 'hidden', alignSelf: 'stretch' }}>
            {info && (
              <div style={{ position: 'absolute', top: 0, left: 0, width: '70mm', transform: 'scale(0.57)', transformOrigin: 'top left' }}>
                <NutritionalLabel info={info} />
              </div>
            )}
          </div>

          {/* Col derecha - sellos + código */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5mm' }}>
            {etiqueta.sellos?.map((sello) => (
              <SelloHexagonal key={sello.codigo} nombre={sello.nombre} />
            ))}
            {etiqueta.codigo_barra && (
              <div style={{ marginTop: 'auto' }}>
                <Barcode
                  value={etiqueta.codigo_barra}
                  format="CODE128"
                  width={cfg.barcodeWidth}
                  height={cfg.barcodeHeight}
                  fontSize={5}
                  background="#ffffff"
                  lineColor="#000000"
                  displayValue={true}
                  margin={0}
                />
              </div>
            )}
          </div>
        </div>

      </div>
    );
  };

  // Escala para que los layouts grandes quepan en la pantalla del modal
  const previewScale = tamano === 'A4' ? 0.72 : tamano === '62x100' ? 1.8 : 1;

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
                  disabled={generandoPDF}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {generandoPDF ? '⏳ Generando...' : '📥 Descargar PDF'}
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  🖨️ Imprimir
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
                {Object.entries(configs).map(([key, val]) => (
                  <option key={key} value={key}>{val.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Vista previa */}
          <div className="p-6 bg-gray-100 flex justify-center items-start no-print overflow-auto">
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'top center',
                marginBottom: tamano === 'A4'
                  ? `calc((${0.72} - 1) * 210mm)`
                  : tamano === '62x100'
                  ? `calc((${1.8} - 1) * 62mm)`
                  : '0',
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
                {/* 62x29 */}
                {tamano === '62x29' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2mm' }}>
                    <div style={{ fontSize: config.fontSize.titulo, fontWeight: 'bold', textAlign: 'center', marginBottom: '1mm', lineHeight: 1.1, color: '#000' }}>
                      {etiqueta.producto_nombre}
                    </div>
                    {etiqueta.codigo_barra && (
                      <Barcode value={etiqueta.codigo_barra} format="CODE128" width={config.barcodeWidth} height={config.barcodeHeight} fontSize={7} background="#ffffff" lineColor="#000000" displayValue={true} margin={0} />
                    )}
                  </div>
                )}

                {/* 29x90 */}
                {tamano === '29x90' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100%', justifyContent: 'space-between', padding: '1.5mm' }}>
                    <div style={{ fontSize: config.fontSize.titulo, fontWeight: 'bold', lineHeight: 1.1, color: '#000' }}>
                      {etiqueta.producto_nombre.length > 25 ? etiqueta.producto_nombre.substring(0, 25) + '...' : etiqueta.producto_nombre}
                    </div>
                    {etiqueta.codigo_barra && (
                      <Barcode value={etiqueta.codigo_barra} format="CODE128" width={config.barcodeWidth} height={config.barcodeHeight} fontSize={6} background="#ffffff" lineColor="#000000" displayValue={true} margin={0} />
                    )}
                    <div style={{ fontSize: config.fontSize.small, color: '#000' }}>{etiqueta.producto_sku}</div>
                  </div>
                )}

                {/* 62x100 */}
                {tamano === '62x100' && <Layout62x100 />}

                {/* A4 */}
                {tamano === 'A4' && <LayoutA4 />}
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
        <div
          ref={pdfRef}
          style={{
            width: config.ancho,
            height: config.alto,
            background: '#ffffff',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {tamano === '62x29' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2mm' }}>
              <div style={{ fontSize: config.fontSize.titulo, fontWeight: 'bold', textAlign: 'center', marginBottom: '1mm', lineHeight: 1.1, color: '#000' }}>
                {etiqueta.producto_nombre}
              </div>
              {etiqueta.codigo_barra && (
                <Barcode value={etiqueta.codigo_barra} format="CODE128" width={config.barcodeWidth} height={config.barcodeHeight} fontSize={7} background="#ffffff" lineColor="#000000" displayValue={true} margin={0} />
              )}
            </div>
          )}
          {tamano === '29x90' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100%', justifyContent: 'space-between', padding: '1.5mm' }}>
              <div style={{ fontSize: config.fontSize.titulo, fontWeight: 'bold', lineHeight: 1.1, color: '#000' }}>
                {etiqueta.producto_nombre.length > 25 ? etiqueta.producto_nombre.substring(0, 25) + '...' : etiqueta.producto_nombre}
              </div>
              {etiqueta.codigo_barra && (
                <Barcode value={etiqueta.codigo_barra} format="CODE128" width={config.barcodeWidth} height={config.barcodeHeight} fontSize={6} background="#ffffff" lineColor="#000000" displayValue={true} margin={0} />
              )}
              <div style={{ fontSize: config.fontSize.small, color: '#000' }}>{etiqueta.producto_sku}</div>
            </div>
          )}
          {tamano === '62x100' && <Layout62x100 />}
          {tamano === 'A4' && <LayoutA4 />}
        </div>
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
