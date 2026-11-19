import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CONFIGS_ETIQUETA, type TamanoEtiqueta } from '@/components/etiquetas/EtiquetaNutricional';

export interface ItemPdfEtiqueta {
  /** Nodo de la etiqueta renderizada a tamaño real (visible para html2canvas, puede estar fuera de pantalla). */
  nodo: HTMLElement;
  copias: number;
}

/**
 * Genera un PDF con una página del tamaño del formato por cada copia.
 * Cada nodo se rasteriza una sola vez y la imagen se reutiliza (mismo alias) en sus copias.
 */
export async function generarPdfEtiquetas(items: ItemPdfEtiqueta[], tamano: TamanoEtiqueta): Promise<jsPDF | null> {
  const config = CONFIGS_ETIQUETA[tamano];
  const widthMM = parseFloat(config.ancho);
  const heightMM = parseFloat(config.alto);
  const validos = items.filter((it) => it.copias > 0);
  if (validos.length === 0) return null;

  const pdf = new jsPDF({
    orientation: widthMM > heightMM ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [widthMM, heightMM],
  });

  let primera = true;
  for (let i = 0; i < validos.length; i++) {
    const { nodo, copias } = validos[i];
    const canvas = await html2canvas(nodo, {
      scale: 3,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
    });
    const imgData = canvas.toDataURL('image/png');
    const alias = `etiqueta_${i}`;
    for (let c = 0; c < copias; c++) {
      if (!primera) pdf.addPage([widthMM, heightMM], widthMM > heightMM ? 'landscape' : 'portrait');
      pdf.addImage(imgData, 'PNG', 0, 0, widthMM, heightMM, alias, 'NONE');
      primera = false;
    }
  }
  return pdf;
}

export function descargarPdf(pdf: jsPDF, nombre: string): void {
  pdf.save(nombre);
}

/** Abre el diálogo de impresión del navegador con el PDF en un iframe oculto. */
export function imprimirPdf(pdf: jsPDF): void {
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = url;
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 100);
  };
  document.body.appendChild(iframe);
  setTimeout(() => {
    URL.revokeObjectURL(url);
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }, 60000);
}
