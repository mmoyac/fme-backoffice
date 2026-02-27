import React from "react";
import { SolicitudTransferencia } from "../../types/solicitud";

interface Props {
  solicitud: SolicitudTransferencia;
  localesMap: Record<number, any>;
  productosMap: Record<number, any>;
}

const SolicitudPDFResumen: React.FC<Props> = ({ solicitud, localesMap, productosMap }) => {
  return (
    <div style={{ width: 600, padding: 24, fontFamily: 'Arial, sans-serif', background: '#fff', color: '#222' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 16 }}>Solicitud de Transferencia #{solicitud.solicitud_id}</h2>
      <div style={{ marginBottom: 12 }}>
        <strong>Local Origen:</strong> {localesMap[solicitud.local_origen_id]?.nombre || solicitud.local_origen_id}<br />
        <strong>Local Destino:</strong> {localesMap[solicitud.local_destino_id]?.nombre || solicitud.local_destino_id}<br />
        <strong>Fecha:</strong> {new Date(solicitud.fecha_creacion).toLocaleString('es-CL')}
      </div>
      {solicitud.nota && (
        <div style={{ marginBottom: 12 }}>
          <strong>Nota:</strong> {solicitud.nota}
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: 6, background: '#f5f5f5' }}>Producto</th>
            <th style={{ border: '1px solid #ccc', padding: 6, background: '#f5f5f5' }}>Solicitado</th>
            <th style={{ border: '1px solid #ccc', padding: 6, background: '#f5f5f5' }}>Aprobado</th>
          </tr>
        </thead>
        <tbody>
          {solicitud.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #ccc', padding: 6 }}>{productosMap[item.producto_id]?.nombre || item.producto_id}</td>
              <td style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center' }}>{item.cantidad_solicitada}</td>
              <td style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center' }}>{item.cantidad_aprobada ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 12, color: '#888', textAlign: 'right' }}>
        Generado: {new Date().toLocaleString('es-CL')}
      </div>
    </div>
  );
};

export default SolicitudPDFResumen;
