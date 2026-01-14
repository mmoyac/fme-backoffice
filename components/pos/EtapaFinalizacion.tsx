// Componente para la etapa final: cliente, pago y procesamiento
import { useState, useEffect } from 'react';
import { ArrowLeftIcon, CheckCircleIcon, UserIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { BoletaTermica } from './BoletaTermica';
import { obtenerTiposDocumento, TipoDocumento } from '../../lib/api/configuracion';

interface EtapaFinalizacionProps {
  cliente: any;
  setCliente: (cliente: any) => void;
  locales: any[];
  localId: number | null;
  setLocalId: (id: number) => void;
  mediosPago: any[];
  medioPagoId: number | null;
  setMedioPagoId: (id: number) => void;
  // Tipo de documento tributario
  tipoDocumentoId: number | null;
  setTipoDocumentoId: (id: number) => void;
  notas: string;
  setNotas: (notas: string) => void;
  totalCarrito: number;
  procesando: boolean;
  onAnterior: () => void;
  onProcesar: () => void;
  // Props para vista previa de boleta
  carrito: any[];
  usuarioActual: any;
  puntosEstimados: any;
}

export function EtapaFinalizacion({
  cliente,
  setCliente,
  locales,
  localId,
  setLocalId,
  mediosPago,
  medioPagoId,
  setMedioPagoId,
  tipoDocumentoId,
  setTipoDocumentoId,
  notas,
  setNotas,
  totalCarrito,
  procesando,
  onAnterior,
  onProcesar,
  carrito,
  usuarioActual,
  puntosEstimados
}: EtapaFinalizacionProps) {

  // Estado para mostrar vista previa de boleta
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  
  // Estado para tipos de documento
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
  const [cargandoTipos, setCargandoTipos] = useState(true);

  // Cargar tipos de documento al montar el componente
  useEffect(() => {
    const cargarTiposDocumento = async () => {
      try {
        const tipos = await obtenerTiposDocumento(true);
        setTiposDocumento(tipos);
        
        // Establecer BOLETA como predeterminado si no hay tipo seleccionado
        if (!tipoDocumentoId && tipos.length > 0) {
          const boleta = tipos.find(tipo => tipo.codigo === 'BOL');
          if (boleta) {
            setTipoDocumentoId(boleta.id);
          }
        }
      } catch (error) {
        console.error('Error cargando tipos de documento:', error);
      } finally {
        setCargandoTipos(false);
      }
    };
    
    cargarTiposDocumento();
  }, []);

  // Función para generar datos de vista previa de boleta
  const generarDatosVistaPrevia = () => {
    const localSeleccionado = locales.find(l => l.id === localId);
    const medioPagoSeleccionado = mediosPago.find(mp => mp.id === medioPagoId);
    
    return {
      numero_pedido: 'VISTA-PREVIA',
      fecha: new Date().toISOString(),
      local_nombre: localSeleccionado?.nombre || 'Local POS',
      local_direccion: localSeleccionado?.direccion,
      cliente_nombre: cliente.es_anonimo ? 'Cliente Anónimo' : cliente.nombre || 'Sin nombre',
      cliente_telefono: cliente.es_anonimo ? undefined : cliente.telefono,
      items: carrito.map(item => ({
        sku: item.sku,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        tipo_venta_codigo: item.tipo_venta_codigo
      })),
      subtotal: totalCarrito,
      total: totalCarrito,
      medio_pago: medioPagoSeleccionado?.nombre || 'Efectivo',
      vendedor: usuarioActual?.nombre_completo || 'Sistema POS',
      puntos_ganados: puntosEstimados?.total_puntos || 0
    };
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Finalizar Pedido</h2>
        <p className="text-slate-400">Complete la información del cliente y método de pago</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tipo de cliente */}
          <div className="bg-slate-800 rounded-lg shadow-sm p-6">
            <h3 className="font-bold text-lg text-white mb-4 flex items-center space-x-2">
              <UserIcon className="w-5 h-5" />
              <span>Cliente</span>
            </h3>
            
            {/* Toggle anónimo vs registrado */}
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => setCliente({...cliente, es_anonimo: true})}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  cliente.es_anonimo 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Cliente Anónimo
              </button>
              
              <button
                onClick={() => setCliente({...cliente, es_anonimo: false})}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !cliente.es_anonimo 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Cliente Registrado
              </button>
            </div>
            
            {/* Selector de tipo de documento */}
            <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <div className="flex items-center space-x-2 mb-3">
                <DocumentTextIcon className="h-5 w-5 text-teal-400" />
                <span className="text-sm font-medium text-slate-300">Tipo de Documento</span>
              </div>
              
              {cargandoTipos ? (
                <div className="animate-pulse h-10 bg-slate-700 rounded-lg"></div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {tiposDocumento.filter(tipo => ['BOL', 'FAC'].includes(tipo.codigo)).map(tipo => (
                    <button
                      key={tipo.id}
                      onClick={() => {
                        setTipoDocumentoId(tipo.id);
                        // Si selecciona factura, marcar como empresa
                        if (tipo.codigo === 'FAC') {
                          setCliente({...cliente, es_empresa: true, es_anonimo: false});
                        } else {
                          setCliente({...cliente, es_empresa: false});
                        }
                      }}
                      className={`p-3 rounded-lg border-2 transition-colors text-left ${
                        tipoDocumentoId === tipo.id
                          ? 'border-teal-500 bg-teal-500/20 text-white'
                          : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="font-medium">{tipo.nombre}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {tipo.codigo === 'BOL' ? 'Para consumidores finales' : 'Para empresas (requiere RUT)'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Formulario de cliente (si no es anónimo) */}
            {!cliente.es_anonimo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={cliente.nombre}
                    onChange={(e) => setCliente({...cliente, nombre: e.target.value})}
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="Ingrese el nombre"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={cliente.telefono}
                    onChange={(e) => setCliente({...cliente, telefono: e.target.value})}
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="+56 9 xxxx xxxx"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={cliente.email}
                    onChange={(e) => setCliente({...cliente, email: e.target.value})}
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="cliente@email.com"
                  />
                </div>
                
                {/* Campos tributarios (solo si es factura) */}
                {cliente.es_empresa && tiposDocumento.find(t => t.id === tipoDocumentoId)?.codigo === 'FAC' && (
                  <>
                    <div className="md:col-span-2 pt-4 border-t border-slate-600">
                      <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center">
                        <DocumentTextIcon className="h-4 w-4 mr-2 text-yellow-500" />
                        Datos para Facturación
                      </h4>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        RUT Empresa * 
                      </label>
                      <input
                        type="text"
                        value={cliente.rut || ''}
                        onChange={(e) => setCliente({...cliente, rut: e.target.value})}
                        className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white placeholder-slate-400"
                        placeholder="12.345.678-9"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Razón Social *
                      </label>
                      <input
                        type="text"
                        value={cliente.razon_social || ''}
                        onChange={(e) => setCliente({...cliente, razon_social: e.target.value})}
                        className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white placeholder-slate-400"
                        placeholder="Nombre de la empresa"
                        required
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Giro Comercial
                      </label>
                      <input
                        type="text"
                        value={cliente.giro || ''}
                        onChange={(e) => setCliente({...cliente, giro: e.target.value})}
                        className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white placeholder-slate-400"
                        placeholder="Actividad comercial de la empresa"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
            
            {cliente.es_anonimo && (
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-300 text-sm">
                  ✅ Pedido anónimo - No se requieren datos del cliente
                </p>
              </div>
            )}
          </div>
          
          {/* Configuración del pedido */}
          <div className="bg-slate-800 rounded-lg shadow-sm p-6">
            <h3 className="font-bold text-lg text-white mb-4">Configuración del Pedido</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local de despacho */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Local de Despacho *
                </label>
                <select
                  value={localId || ''}
                  onChange={(e) => setLocalId(parseInt(e.target.value))}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white"
                >
                  <option value="" className="text-slate-400">Seleccionar local...</option>
                  {locales.map(local => (
                    <option key={local.id} value={local.id} className="text-white">
                      {local.nombre}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Medio de pago */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Método de Pago *
                </label>
                <select
                  value={medioPagoId || ''}
                  onChange={(e) => setMedioPagoId(parseInt(e.target.value))}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white"
                >
                  <option value="" className="text-slate-400">Seleccionar método...</option>
                  {mediosPago.map(medio => (
                    <option key={medio.id} value={medio.id} className="text-white">
                      {medio.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Notas adicionales */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Notas del Pedido (Opcional)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white placeholder-slate-400"
                placeholder="Instrucciones especiales, comentarios, etc..."
              />
            </div>
          </div>
        </div>
        
        {/* Panel lateral: Resumen y procesamiento */}
        <div className="space-y-4">
          {/* Resumen final */}
          <div className="bg-slate-800 rounded-lg shadow-sm p-6">
            <h3 className="font-bold text-lg text-white mb-4">Resumen Final</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-medium text-white">
                  {cliente.es_anonimo ? 'Anónimo' : cliente.nombre || 'Sin nombre'}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Local:</span>
                <span className="font-medium text-white">
                  {locales.find(l => l.id === localId)?.nombre || 'No seleccionado'}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Pago:</span>
                <span className="font-medium text-white">
                  {mediosPago.find(m => m.id === medioPagoId)?.nombre || 'No seleccionado'}
                </span>
              </div>
              
              <div className="border-t border-slate-700 pt-3">
                <div className="flex justify-between font-bold text-xl mb-4">
                  <span className="text-white">Total a Pagar:</span>
                  <span className="text-teal-400">${totalCarrito.toLocaleString()}</span>
                </div>
                
                {/* Puntos estimados */}
                {puntosEstimados && puntosEstimados.total_puntos > 0 && (
                  <div className="flex justify-between text-sm bg-green-900/20 p-2 rounded border border-green-500/30">
                    <span className="text-green-400">🎁 Puntos a ganar:</span>
                    <span className="font-bold text-green-400">{puntosEstimados.total_puntos} pts</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Botón de vista previa */}
            <button
              onClick={() => setMostrarVistaPrevia(!mostrarVistaPrevia)}
              className={`w-full mt-4 px-4 py-2 rounded-lg font-medium transition-colors ${
                mostrarVistaPrevia 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {mostrarVistaPrevia ? '📄 Ocultar Vista Previa' : '👁️ Vista Previa de Boleta'}
            </button>
          </div>
          
          {/* Vista previa de boleta */}
          {mostrarVistaPrevia && (
            <div className="bg-slate-800 rounded-lg shadow-sm p-4">
              <h4 className="font-bold text-white mb-3 text-center">📄 Vista Previa de Boleta</h4>
              <div className="bg-white rounded-lg p-4 font-mono text-xs text-black leading-tight">
                {/* Simulación de boleta térmica */}
                <div className="text-center font-bold">
                  <div className="text-sm">{generarDatosVistaPrevia().local_nombre.toUpperCase()}</div>
                  {generarDatosVistaPrevia().local_direccion && (
                    <div className="text-xs mt-1">{generarDatosVistaPrevia().local_direccion}</div>
                  )}
                </div>
                
                <div className="border-t border-dashed border-gray-400 my-2"></div>
                
                <div>
                  <div className="font-bold">BOLETA DE VENTA</div>
                  <div className="font-bold">N° PEDIDO: VISTA-PREVIA</div>
                  <div>{new Date().toLocaleString('es-CL')}</div>
                  <div>Vendedor: {usuarioActual?.nombre_completo || 'Sistema POS'}</div>
                </div>
                
                <div className="border-t border-dashed border-gray-400 my-2"></div>
                
                <div>
                  <div>Cliente: {generarDatosVistaPrevia().cliente_nombre}</div>
                  {generarDatosVistaPrevia().cliente_telefono && (
                    <div>Tel: {generarDatosVistaPrevia().cliente_telefono}</div>
                  )}
                </div>
                
                <div className="border-t border-dashed border-gray-400 my-2"></div>
                
                {/* Items */}
                {carrito.map((item, index) => (
                  <div key={index} className="mb-2">
                    <div>{item.nombre}</div>
                    <div className="flex justify-between text-xs">
                      <span>{item.cantidad} {item.tipo_venta_codigo === 'PESO_SUELTO' ? 'kg' : 'un'} x ${item.precio_unitario.toLocaleString()}</span>
                      <span>${item.subtotal.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                
                <div className="border-t border-dashed border-gray-400 my-2"></div>
                
                <div>
                  <div className="flex justify-between">
                    <span>SUBTOTAL:</span>
                    <span>${totalCarrito.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-gray-600 pt-1">
                    <span>TOTAL:</span>
                    <span>${totalCarrito.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="border-t border-dashed border-gray-400 my-2"></div>
                
                <div>
                  <div>Forma de Pago: {mediosPago.find(mp => mp.id === medioPagoId)?.nombre || 'Efectivo'}</div>
                  {puntosEstimados && puntosEstimados.total_puntos > 0 && (
                    <div className="font-bold">🎁 Puntos Ganados: {puntosEstimados.total_puntos}</div>
                  )}
                </div>
                
                <div className="border-t border-dashed border-gray-400 my-2"></div>
                
                <div className="text-center text-xs">
                  <div className="font-bold">¡GRACIAS POR SU COMPRA!</div>
                  <div>Masas Estación</div>
                  <div>www.masasestacion.cl</div>
                </div>
              </div>
              <p className="text-center text-slate-400 text-xs mt-2">
                Esta es solo una vista previa. La boleta real se generará al crear el pedido.
              </p>
            </div>
          )}
          
          {/* Botones de acción */}
          <div className="space-y-3">
            <button
              onClick={onAnterior}
              disabled={procesando}
              className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 text-slate-300 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>← Volver al Carrito</span>
            </button>
            
            <button
              onClick={onProcesar}
              disabled={procesando || !localId || !medioPagoId}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-4 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {procesando ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Crear Pedido</span>
                </>
              )}
            </button>
          </div>
          
          {/* Advertencias */}
          {(!localId || !medioPagoId) && (
            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3">
              <p className="text-yellow-400 text-sm">
                ⚠️ Complete todos los campos obligatorios para procesar el pedido
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}