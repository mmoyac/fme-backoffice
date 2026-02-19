'use client';

import { useRef, useState } from 'react';
import Barcode from 'react-barcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { EtiquetaCompleta } from '@/lib/api/etiquetas';

interface EtiquetaPreviewProps {
  etiqueta: EtiquetaCompleta;
  onClose: () => void;
}

type TamanoEtiqueta = '62x100' | '62x29' | '29x90' | 'A4';

export default function EtiquetaPreview({ etiqueta, onClose }: EtiquetaPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [tamano, setTamano] = useState<TamanoEtiqueta>('62x100');
  const [generandoPDF, setGenerandoPDF] = useState(false);

  console.log('EtiquetaPreview - Datos completos:', etiqueta);
  console.log('EtiquetaPreview - Código de barras:', etiqueta.codigo_barra);
  console.log('EtiquetaPreview - Info nutricional:', etiqueta.informacion_nutricional);
  if (etiqueta.informacion_nutricional) {
    console.log('  - Energía:', etiqueta.informacion_nutricional.energia_kcal);
    console.log('  - Proteínas:', etiqueta.informacion_nutricional.proteinas_g);
    console.log('  - Carbohidratos:', etiqueta.informacion_nutricional.carbohidratos_g);
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    setGenerandoPDF(true);
    try {
      // Capturar el elemento como imagen
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });

      // Obtener dimensiones en mm
      const config = configs[tamano];
      const widthMM = parseFloat(config.ancho);
      const heightMM = parseFloat(config.alto);

      // Crear PDF con dimensiones exactas
      const pdf = new jsPDF({
        orientation: widthMM > heightMM ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [widthMM, heightMM]
      });

      // Agregar imagen al PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, widthMM, heightMM);

      // Descargar
      const fileName = `etiqueta_${etiqueta.producto_sku}_${tamano}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar PDF');
    } finally {
      setGenerandoPDF(false);
    }
  };

  // Configuraciones por tamaño (Brother QL-800)
  const configs = {
    '62x100': {
      nombre: '62mm x 100mm (Brother QL - Etiqueta Grande)',
      ancho: '62mm',
      alto: '100mm',
      fontSize: { titulo: '14px', normal: '10px', small: '8px' },
      barcodeHeight: 45,
      barcodeWidth: 1.5,
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
      nombre: 'A4 (Impresora Normal)',
      ancho: '210mm',
      alto: '297mm',
      fontSize: { titulo: '20px', normal: '13px', small: '11px' },
      barcodeHeight: 70,
      barcodeWidth: 2,
    }
  };

  const config = configs[tamano];

  // Función para renderizar sello hexagonal
  const SelloHexagonal = ({ nombre }: { nombre: string }) => {
    const size = tamano === 'A4' ? 70 : tamano === '62x100' ? 50 : 30;
    const fontSize = tamano === 'A4' ? 9 : tamano === '62x100' ? 7 : 5;
    
    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size * 1.15} viewBox="0 0 80 92">
          <path
            d="M40 2 L75 23 L75 69 L40 90 L5 69 L5 23 Z"
            fill="#000000"
            stroke="#ffffff"
            strokeWidth="2"
          />
          <text
            x="40"
            y="38"
            textAnchor="middle"
            fill="white"
            fontSize={fontSize}
            fontWeight="bold"
            fontFamily="Arial"
          >
            {nombre.split(' ').map((word, idx) => (
              <tspan key={idx} x="40" dy={idx === 0 ? 0 : 12}>
                {word}
              </tspan>
            ))}
          </text>
        </svg>
      </div>
    );
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 no-print">
        <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto">
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
          <div className="p-8 bg-gray-50 flex justify-center no-print">
            <div 
              ref={printRef} 
              className="printable-label bg-white"
              style={{
                width: config.ancho,
                minHeight: config.alto,
                padding: tamano === '62x29' ? '2mm' : tamano === '29x90' ? '1.5mm' : '4mm',
                border: '2px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* LAYOUT COMPACTO (62x29mm) */}
              {tamano === '62x29' && (
                <div className="flex flex-col items-center justify-center h-full">
                  <div style={{ fontSize: config.fontSize.titulo, fontWeight: 'bold', textAlign: 'center', marginBottom: '1mm', lineHeight: '1.1', color: '#000' }}>
                    {etiqueta.producto_nombre}
                  </div>
                  {etiqueta.codigo_barra && (
                    <Barcode
                      value={etiqueta.codigo_barra}
                      format="CODE128"
                      width={config.barcodeWidth}
                      height={config.barcodeHeight}
                      fontSize={7}
                      background="#ffffff"
                      lineColor="#000000"
                      displayValue={true}
                      margin={0}
                    />
                  )}
                </div>
              )}

              {/* LAYOUT VERTICAL (29x90mm) */}
              {tamano === '29x90' && (
                <div className="flex flex-col items-center text-center h-full justify-between">
                  <div style={{ fontSize: config.fontSize.titulo, fontWeight: 'bold', lineHeight: '1.1', color: '#000' }}>
                    {etiqueta.producto_nombre.length > 25 
                      ? etiqueta.producto_nombre.substring(0, 25) + '...'
                      : etiqueta.producto_nombre
                    }
                  </div>
                  {etiqueta.codigo_barra && (
                    <div className="my-1">
                      <Barcode
                        value={etiqueta.codigo_barra}
                        format="CODE128"
                        width={config.barcodeWidth}
                        height={config.barcodeHeight}
                        fontSize={6}
                        background="#ffffff"
                        lineColor="#000000"
                        displayValue={true}
                        margin={0}
                      />
                    </div>
                  )}
                  <div style={{ fontSize: config.fontSize.small, color: '#000' }}>
                    {etiqueta.producto_sku}
                  </div>
                </div>
              )}

              {/* LAYOUT COMPLETO (62x100mm y A4) */}
              {(tamano === '62x100' || tamano === 'A4') && (
                <div>
                  {/* Nombre del producto */}
                  <h1 style={{ 
                    fontSize: config.fontSize.titulo, 
                    fontWeight: 'bold', 
                    textAlign: 'center', 
                    textTransform: 'uppercase',
                    marginBottom: '2mm',
                    paddingBottom: '2mm',
                    borderBottom: '2px solid #000',
                    lineHeight: '1.2',
                    color: '#000'
                  }}>
                    {etiqueta.producto_nombre}
                  </h1>

                  {/* Código de barras */}
                  {etiqueta.codigo_barra && (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '3mm 0' }}>
                      <Barcode
                        value={etiqueta.codigo_barra}
                        format="CODE128"
                        width={config.barcodeWidth}
                        height={config.barcodeHeight}
                        fontSize={parseInt(config.fontSize.normal)}
                        background="#ffffff"
                        lineColor="#000000"
                        displayValue={true}
                        margin={0}
                      />
                    </div>
                  )}

                  {/* Sellos de Advertencia */}
                  {etiqueta.sellos && etiqueta.sellos.length > 0 && (
                    <div style={{ margin: '3mm 0', border: '2px solid #000', padding: '2mm', borderRadius: '2mm' }}>
                      <h3 style={{ fontSize: config.fontSize.normal, fontWeight: 'bold', textAlign: 'center', marginBottom: '2mm' }}>
                        SELLOS DE ADVERTENCIA
                      </h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2mm' }}>
                        {etiqueta.sellos.map((sello) => (
                          <SelloHexagonal key={sello.codigo} nombre={sello.nombre} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Información Nutricional (solo si existe) */}
                  {etiqueta.informacion_nutricional ? (
                    <div style={{ marginTop: '3mm', border: '2px solid #000', borderRadius: '2mm', overflow: 'hidden' }}>
                      <div style={{ background: '#000', color: '#fff', padding: '2mm', fontSize: config.fontSize.normal, fontWeight: 'bold' }}>
                        INFORMACIÓN NUTRICIONAL (por 100g)
                      </div>
                      <table style={{ width: '100%', fontSize: config.fontSize.small, borderCollapse: 'collapse', background: '#fff' }}>
                        <tbody>
                          {etiqueta.informacion_nutricional.energia_kcal && (
                            <tr style={{ borderBottom: '1px solid #ccc', background: '#fff' }}>
                              <td style={{ padding: '1mm 2mm', fontWeight: 'bold', color: '#000' }}>Energía</td>
                              <td style={{ padding: '1mm 2mm', textAlign: 'right', fontWeight: 'bold', color: '#000' }}>
                                {etiqueta.informacion_nutricional.energia_kcal} kcal
                              </td>
                            </tr>
                          )}
                          {etiqueta.informacion_nutricional.proteinas_g && (
                            <tr style={{ borderBottom: '1px solid #ccc', background: '#fff' }}>
                              <td style={{ padding: '1mm 2mm', color: '#000' }}>Proteínas</td>
                              <td style={{ padding: '1mm 2mm', textAlign: 'right', color: '#000' }}>
                                {etiqueta.informacion_nutricional.proteinas_g} g
                              </td>
                            </tr>
                          )}
                          {etiqueta.informacion_nutricional.carbohidratos_g && (
                            <tr style={{ borderBottom: '1px solid #ccc', background: '#fff' }}>
                              <td style={{ padding: '1mm 2mm', color: '#000' }}>Carbohidratos</td>
                              <td style={{ padding: '1mm 2mm', textAlign: 'right', color: '#000' }}>
                                {etiqueta.informacion_nutricional.carbohidratos_g} g
                              </td>
                            </tr>
                          )}
                          {etiqueta.informacion_nutricional.grasas_totales_g && (
                            <tr style={{ borderBottom: '1px solid #ccc', background: '#fff' }}>
                              <td style={{ padding: '1mm 2mm', color: '#000' }}>Grasas Totales</td>
                              <td style={{ padding: '1mm 2mm', textAlign: 'right', color: '#000' }}>
                                {etiqueta.informacion_nutricional.grasas_totales_g} g
                              </td>
                            </tr>
                          )}
                          {etiqueta.informacion_nutricional.sodio_mg && (
                            <tr style={{ background: '#fff' }}>
                              <td style={{ padding: '1mm 2mm', color: '#000' }}>Sodio</td>
                              <td style={{ padding: '1mm 2mm', textAlign: 'right', color: '#000' }}>
                                {etiqueta.informacion_nutricional.sodio_mg} mg
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ marginTop: '3mm', padding: '2mm', textAlign: 'center', fontSize: config.fontSize.small, color: '#666', border: '1px dashed #ccc', borderRadius: '2mm' }}>
                      <p style={{ margin: '0' }}>⚠️ Información nutricional no disponible</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.8em' }}>Complete los datos en la pestaña de Etiquetas</p>
                    </div>
                  )}

                  {/* SKU */}
                  <div style={{ marginTop: '2mm', textAlign: 'center', fontSize: config.fontSize.small, color: '#666' }}>
                    SKU: {etiqueta.producto_sku}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Estilos para impresión */}
      <style jsx global>{`
        @media print {
          /* Ocultar todo excepto la etiqueta */
          body * {
            visibility: hidden !important;
          }
          
          .printable-label,
          .printable-label * {
            visibility: visible !important;
          }
          
          /* Posicionar la etiqueta */
          .printable-label {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: ${config.ancho} !important;
            height: ${config.alto} !important;
            max-width: ${config.ancho} !important;
            max-height: ${config.alto} !important;
            margin: 0 !important;
            padding: ${tamano === '62x29' ? '2mm' : tamano === '29x90' ? '1.5mm' : '4mm'} !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            overflow: hidden !important;
          }
          
          /* Ocultar elementos no imprimibles */
          .no-print,
          .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Configurar página */
          @page {
            size: ${config.ancho} ${config.alto};
            margin: 0;
          }
          
          /* Eliminar fondos oscuros */
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Asegurar que los elementos no causen páginas extra */
          * {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </>
  );
}
