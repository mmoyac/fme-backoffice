'use client';

import { useEffect } from 'react';

interface ItemBoleta {
  sku: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  tipo_venta_codigo: string;
}

interface DatosBoleta {
  numero_pedido: number;
  fecha: string;
  local_nombre: string;
  local_direccion?: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  // Información tributaria
  cliente_rut?: string;
  cliente_razon_social?: string;
  tipo_documento?: string; // "BOLETA" o "FACTURA" - Código normalizado para comparaciones
  estado_sii?: string; // Estado SII para facturas
  items: ItemBoleta[];
  subtotal: number;
  total: number;
  medio_pago: string;
  vendedor?: string;
  puntos_ganados?: number; // Nuevos puntos ganados
  // Información del tenant
  tenant_nombre?: string;
  tenant_sitio?: string;
}

interface BoletaTermicaProps {
  datos: DatosBoleta;
  onImprimir: () => void;
  visible: boolean;
}

export function BoletaTermica({ datos, onImprimir, visible }: BoletaTermicaProps) {
  
  useEffect(() => {
    if (visible) {
      // Auto-imprimir después de un breve delay
      const timer = setTimeout(() => {
        window.print();
      }, 1000); // Aumenté el tiempo para que el usuario pueda ver la vista previa
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handlePrint = () => {
    window.print();
  };

  if (!visible) return null;

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearPrecio = (precio: number) => {
    return precio.toLocaleString('es-CL');
  };

  const truncarTexto = (texto: string, maxLength: number) => {
    return texto.length > maxLength ? texto.substring(0, maxLength - 3) + '...' : texto;
  };

  return (
    <>
      {/* Estilos para impresión térmica */}
      <style jsx global>{`
        @media print {
          /* Ocultar todo por defecto */
          * {
            visibility: hidden;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          /* Mostrar solo el contenido de la boleta */
          .boleta-container,
          .boleta-container * {
            visibility: visible;
          }
          
          /* Configuraciones específicas para la boleta */
          .boleta-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 58mm;
            max-width: 58mm;
            margin: 0;
            padding: 2mm;
            background: white;
            font-family: 'Courier New', monospace;
            font-size: 10px;
            line-height: 1.2;
            color: black;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .text-center {
            text-align: center;
          }
          
          .text-right {
            text-align: right;
          }
          
          .font-bold {
            font-weight: bold;
          }
          
          .separador {
            border-top: 1px dashed black;
            margin: 2mm 0;
            width: 100%;
          }
          
          .item-linea {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1mm;
          }
        }
        
        @media screen {
          .boleta-container {
            max-width: 300px;
            margin: 20px auto;
            padding: 15px;
            background: white;
            border: 1px solid #ccc;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.3;
            color: black;
          }
        }
      `}</style>

      {/* Overlay para pantalla */}
      <div className="no-print fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
          {/* Header del modal */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-xl font-bold">¡Pedido Creado!</h3>
            <p className="text-green-100 text-sm mt-1">Boleta generada exitosamente</p>
          </div>
          
          {/* Contenido del modal */}
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <span className="text-2xl font-bold text-gray-700">#{datos.numero_pedido}</span>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Cliente:</span>
                  <span className="font-semibold text-gray-800">{datos.cliente_nombre}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Total:</span>
                  <span className="font-bold text-green-600 text-lg">${formatearPrecio(datos.total)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Productos:</span>
                  <span className="font-semibold text-gray-800">{datos.items.length} items</span>
                </div>
                {datos.puntos_ganados && datos.puntos_ganados > 0 && (
                  <div className="flex justify-between items-center bg-green-50 p-2 rounded border border-green-200">
                    <span className="text-green-700 font-medium">🎁 Puntos Ganados:</span>
                    <span className="font-bold text-green-600">{datos.puntos_ganados} pts</span>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-gray-500 mt-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                🖨️ La boleta se enviará automáticamente a la impresora térmica
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handlePrint}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <span>🖨️</span>
                <span>Imprimir</span>
              </button>
              <button
                onClick={onImprimir}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <span>✅</span>
                <span>Continuar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido de la boleta (se imprime) */}
      <div className="boleta-container">
        {/* Header */}
        <div className="text-center font-bold">
          <div style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>{datos.local_nombre.toUpperCase()}</div>
          {datos.local_direccion && (
            <div style={{ fontSize: '9px', fontWeight: 'normal', marginTop: '1mm' }}>
              {datos.local_direccion}
            </div>
          )}
        </div>
        
        <div className="separador"></div>
        
        {/* Info del pedido */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
            {datos.tipo_documento || 'BOLETA'} DE VENTA
          </div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', margin: '2mm 0' }}>N° PEDIDO: {datos.numero_pedido}</div>
          <div style={{ fontSize: '10px' }}>Fecha: {formatearFecha(datos.fecha)}</div>
          {datos.vendedor && <div style={{ fontSize: '9px' }}>Vendedor: {datos.vendedor}</div>}
          
          {/* Información de estado SII para facturas */}
          {datos.tipo_documento === 'FACTURA' && (
            <div style={{ fontSize: '9px', marginTop: '1mm', fontStyle: 'italic' }}>
              Estado SII: {datos.estado_sii || 'PENDIENTE ENVÍO'}
            </div>
          )}
        </div>
        
        <div className="separador"></div>
        
        {/* Cliente */}
        <div>
          <div>Cliente: {truncarTexto(datos.cliente_nombre, 25)}</div>
          {datos.cliente_telefono && datos.cliente_telefono !== '000000000' && (
            <div>Tel: {datos.cliente_telefono}</div>
          )}
          {/* Información tributaria para facturas */}
          {datos.tipo_documento === 'FACTURA' && (
            <>
              {datos.cliente_rut && (
                <div style={{ fontSize: '9px' }}>RUT: {datos.cliente_rut}</div>
              )}
              {datos.cliente_razon_social && (
                <div style={{ fontSize: '9px' }}>Razón Social: {truncarTexto(datos.cliente_razon_social, 25)}</div>
              )}
            </>
          )}
        </div>
        
        <div className="separador"></div>
        
        {/* Items */}
        <div>
          {datos.items.map((item, index) => (
            <div key={index} style={{ marginBottom: '2mm' }}>
              {/* Nombre del producto */}
              <div>{truncarTexto(item.nombre, 30)}</div>
              
              {/* Línea de cantidad x precio = subtotal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                <span>
                  {item.cantidad} {item.tipo_venta_codigo === 'PESO_SUELTO' ? 'kg' : 'un'} x ${formatearPrecio(item.precio_unitario)}
                </span>
                <span>${formatearPrecio(item.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="separador"></div>
        
        {/* Totales */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <span>SUBTOTAL:</span>
            <span>${formatearPrecio(datos.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', marginTop: '1mm', padding: '1mm 0', borderTop: '1px solid black' }}>
            <span>TOTAL:</span>
            <span>${formatearPrecio(datos.total)}</span>
          </div>
        </div>
        
        <div className="separador"></div>
        
        {/* Medio de pago */}
        <div>
          <div>Forma de Pago: {datos.medio_pago}</div>
          {datos.puntos_ganados && datos.puntos_ganados > 0 && (
            <div style={{ marginTop: '1mm', fontSize: '10px', fontWeight: 'bold' }}>
              🎁 Puntos Ganados: {datos.puntos_ganados}
            </div>
          )}
        </div>
        
        <div className="separador"></div>
        
        {/* Footer */}
        <div className="text-center" style={{ fontSize: '9px', marginTop: '3mm' }}>
          <div style={{ fontWeight: 'bold' }}>¡GRACIAS POR SU COMPRA!</div>
          <div style={{ marginTop: '1mm' }}>{datos.tenant_nombre || 'Tienda'}</div>
          {datos.tenant_sitio && (
            <div style={{ marginTop: '1mm', fontSize: '8px' }}>{datos.tenant_sitio}</div>
          )}
        </div>
        
        {/* Espaciado final para corte */}
        <div style={{ height: '10mm' }}></div>
      </div>
    </>
  );
}