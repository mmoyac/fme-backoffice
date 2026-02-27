import jsPDF from "jspdf";
import "jspdf-autotable";
import { SolicitudTransferencia } from "../../types/solicitud";

export function generarPDFSolicitud(solicitud: SolicitudTransferencia, localesMap: Record<number, any>, productosMap: Record<number, any>) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Solicitud de Transferencia", 14, 18);

  doc.setFontSize(10);
  doc.text(`ID Solicitud: ${solicitud.solicitud_id}`, 14, 28);
  doc.text(`Local Origen: ${localesMap[solicitud.local_origen_id]?.nombre || solicitud.local_origen_id}`, 14, 34);
  doc.text(`Local Destino: ${localesMap[solicitud.local_destino_id]?.nombre || solicitud.local_destino_id}`, 14, 40);
  doc.text(`Fecha de Solicitud: ${new Date(solicitud.fecha_creacion).toLocaleString()}`, 14, 46);
  doc.text(`Fecha de Respuesta: ${new Date(solicitud.fecha_actualizacion).toLocaleString()}`, 14, 52);
  doc.text(`Estado: FINALIZADO`, 14, 58);
  if (solicitud.nota) {
    doc.text(`Nota: ${solicitud.nota}`, 14, 64);
  }

  // Tabla de productos
  const rows = solicitud.items.map(item => [
    productosMap[item.producto_id]?.nombre || item.producto_id,
    item.cantidad_solicitada,
    item.cantidad_aprobada ?? "-"
  ]);

  (doc as any).autoTable({
    head: [["Producto", "Cantidad Solicitada", "Cantidad Aprobada"]],
    body: rows,
    startY: 70,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [69, 162, 154] },
  });

  doc.save(`solicitud_${solicitud.solicitud_id}.pdf`);
}
