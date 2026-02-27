import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function generarPDFSolicitudHTML(htmlElement: HTMLElement, solicitudId: number) {
  // Capturar el elemento como imagen
  const canvas = await html2canvas(htmlElement, { scale: 2, backgroundColor: '#fff' });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  // Ajustar tamaño de imagen al ancho de la página
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  // Escalar imagen para que quepa en la página
  const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
  const finalWidth = imgWidth * ratio;
  const finalHeight = imgHeight * ratio;
  pdf.addImage(imgData, 'PNG', 20, 20, finalWidth, finalHeight);
  pdf.save(`solicitud_${solicitudId}.pdf`);
}
