// jspdf y html2canvas se cargan solo al generar un PDF (no en el bundle de /admin/solicitudes)
import type jsPDF from "jspdf";

async function buildPDF(htmlElement: HTMLElement): Promise<jsPDF> {
  const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const canvas = await html2canvas(htmlElement, { scale: 2, backgroundColor: '#fff' });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new JsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  pdf.addImage(imgData, 'PNG', 20, 20, canvas.width * ratio, canvas.height * ratio);
  return pdf;
}

export async function generarPDFSolicitudHTML(htmlElement: HTMLElement, solicitudId: number) {
  const pdf = await buildPDF(htmlElement);
  pdf.save(`solicitud_${solicitudId}.pdf`);
}

export async function generarPDFSolicitudBlob(htmlElement: HTMLElement): Promise<Blob> {
  const pdf = await buildPDF(htmlElement);
  return pdf.output('blob');
}
