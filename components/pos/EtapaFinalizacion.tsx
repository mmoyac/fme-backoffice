// Componente para la etapa final: cliente, pago y procesamiento
import { useState, useEffect } from 'react';
import { ArrowLeftIcon, CheckCircleIcon, UserIcon, DocumentTextIcon, PlusIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BoletaTermica } from './BoletaTermica';
import { obtenerTiposDocumento, TipoDocumento } from '../../lib/api/configuracion';
import { useTenant } from '../../lib/TenantContext';
import { createCliente, type ClienteCreate, type Cliente } from '../../lib/api/clientes';
import { DireccionAutocomplete } from '../ui/DireccionAutocomplete';

// ⚙️ CONFIGURACIÓN: Códigos de tipo de documento
// Debe coincidir con la configuración del archivo page.tsx
const CODIGO_DOCUMENTO_POS_DEFAULT = 'BOL'; // Boleta Electrónica (ID 2)
const CODIGO_FACTURA = 'FAC'; // Factura Electrónica (ID 1)

interface EtapaFinalizacionProps {
  cliente: any;
  setCliente: (cliente: any) => void;
  clientes: Cliente[]; // Agregar lista de clientes
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
  // Callback para recargar clientes después de crear uno nuevo
  onClienteCreado?: () => void;
}

export function EtapaFinalizacion({
  cliente,
  setCliente,
  clientes,
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
  puntosEstimados,
  onClienteCreado
}: EtapaFinalizacionProps) {
  // Contexto de tenant
  const { config: tenantConfig } = useTenant();

  // Estado para mostrar vista previa de boleta
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  
  // Estado para tipos de documento
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
  const [cargandoTipos, setCargandoTipos] = useState(true);
  
  // Estados para búsqueda  de clientes
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  
  // Estados para modal de crear cliente
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState<ClienteCreate>({
    nombre: '',
    email: '',
    telefono: '',
    direccion: ''
  });
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [errorCreacion, setErrorCreacion] = useState('');
  
  // Estado para verificar email duplicado
  const [emailDuplicado, setEmailDuplicado] = useState<Cliente | null>(null);

  // Cargar tipos de documento al montar el componente
  useEffect(() => {
    const cargarTiposDocumento = async () => {
      try {
        const tipos = await obtenerTiposDocumento(true);
        setTiposDocumento(tipos);
        
        // Establecer documento por defecto si no hay tipo seleccionado
        if (!tipoDocumentoId && tipos.length > 0) {
          const documentoDefault = tipos.find(tipo => tipo.codigo === CODIGO_DOCUMENTO_POS_DEFAULT);
          if (documentoDefault) {
            setTipoDocumentoId(documentoDefault.id);
            console.log(`🧾 Tipo documento establecido por defecto: ${documentoDefault.nombre} (${CODIGO_DOCUMENTO_POS_DEFAULT})`);
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
  
  // Filtrar clientes según búsqueda
  useEffect(() => {
    if (busquedaCliente.trim().length > 0) {
      const busqueda = busquedaCliente.toLowerCase();
      const filtrados = clientes.filter(c => 
        c.nombre.toLowerCase().includes(busqueda) ||
        c.email?.toLowerCase().includes(busqueda) ||
        c.telefono?.includes(busqueda) ||
        c.rut?.includes(busqueda)
      ).slice(0, 5); // Máximo 5 sugerencias
      setClientesFiltrados(filtrados);
      setMostrarSugerencias(true);
    } else {
      setClientesFiltrados([]);
      setMostrarSugerencias(false);
    }
  }, [busquedaCliente, clientes]);
  
  // Verificar si el email ingresado ya existe
  useEffect(() => {
    if (!cliente.es_anonimo && cliente.email && cliente.email.trim() !== '' && !cliente.id) {
      const clienteConEmail = clientes.find(c => 
        c.email && c.email.toLowerCase() === cliente.email.toLowerCase()
      );
      setEmailDuplicado(clienteConEmail || null);
    } else {
      setEmailDuplicado(null);
    }
  }, [cliente.email, cliente.es_anonimo, cliente.id, clientes]);
  
  // Función para seleccionar cliente de la lista
  const seleccionarCliente = (clienteSeleccionado: Cliente) => {
    console.log('👤 Cliente seleccionado:', clienteSeleccionado.nombre, 'es_empresa:', clienteSeleccionado.es_empresa);
    
    setCliente({
      id: clienteSeleccionado.id,
      nombre: clienteSeleccionado.nombre,
      email: clienteSeleccionado.email || '',
      telefono: clienteSeleccionado.telefono || '',
      direccion: clienteSeleccionado.direccion || '',
      rut: clienteSeleccionado.rut || '',
      razon_social: clienteSeleccionado.razon_social || '',
      giro: clienteSeleccionado.giro || '',
      es_empresa: clienteSeleccionado.es_empresa || false,
      es_anonimo: false
    });
    setBusquedaCliente(clienteSeleccionado.nombre);
    setMostrarSugerencias(false);
    
    // SIEMPRE forzar documento por defecto cuando se selecciona un cliente
    // El usuario puede cambiar manualmente a FACTURA si lo necesita
    if (tiposDocumento.length > 0) {
      const documentoDefault = tiposDocumento.find(tipo => tipo.codigo === CODIGO_DOCUMENTO_POS_DEFAULT);
      if (documentoDefault) {
        setTipoDocumentoId(documentoDefault.id);
        console.log(`🧾 Cliente seleccionado → Estableciendo ${documentoDefault.nombre} por defecto (el usuario puede cambiar si lo necesita)`);
      }
    }
  };
  
  // Función para crear nuevo cliente
  const handleCrearCliente = async () => {
    try {
      setCreandoCliente(true);
      setErrorCreacion('');
      
      // Validaciones básicas
      if (!nuevoCliente.nombre.trim()) {
        setErrorCreacion('El nombre es obligatorio');
        return;
      }
      
      const clienteCreado = await createCliente(nuevoCliente);
      console.log('✅ Cliente creado:', clienteCreado);
      
      // Seleccionar el cliente recién creado
      seleccionarCliente(clienteCreado);
      
      // Cerrar modal y limpiar formulario
      setMostrarModalCliente(false);
      setNuevoCliente({ nombre: '', email: '', telefono: '', direccion: '' });
      
      // Notificar al padre para recargar la lista
      if (onClienteCreado) {
        onClienteCreado();
      }
    } catch (error: any) {
      console.error('❌ Error creando cliente:', error);
      setErrorCreacion(error.message || 'Error al crear el cliente');
    } finally {
      setCreandoCliente(false);
    }
  };

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
                onClick={() => {
                  setCliente({...cliente, es_anonimo: true, es_empresa: false});
                  setBusquedaCliente('');
                  // Forzar documento por defecto para cliente anónimo
                  const documentoDefault = tiposDocumento.find(tipo => tipo.codigo === CODIGO_DOCUMENTO_POS_DEFAULT);
                  if (documentoDefault) {
                    setTipoDocumentoId(documentoDefault.id);
                    console.log(`🧾 Cliente anónimo → Estableciendo ${documentoDefault.nombre}`);
                  }
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  cliente.es_anonimo 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Cliente Anónimo
              </button>
              
              <button
                onClick={() => {
                  setCliente({...cliente, es_anonimo: false});
                  // Forzar documento por defecto cuando cambia a registrado
                  const documentoDefault = tiposDocumento.find(tipo => tipo.codigo === CODIGO_DOCUMENTO_POS_DEFAULT);
                  if (documentoDefault) {
                    setTipoDocumentoId(documentoDefault.id);
                    console.log(`🧾 Cliente registrado → Estableciendo ${documentoDefault.nombre}`);
                  }
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !cliente.es_anonimo 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Cliente Registrado
              </button>
            </div>
            
            {/* Buscador de clientes (solo si no es anónimo) */}
            {!cliente.es_anonimo && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Buscar Cliente Existente
                </label>
                
                <div className="relative">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      onFocus={() => busquedaCliente && setMostrarSugerencias(true)}
                      placeholder="Buscar por nombre, email, teléfono o RUT..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white placeholder-slate-400"
                    />
                  </div>
                  
                  {/* Sugerencias de búsqueda */}
                  {mostrarSugerencias && clientesFiltrados.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {clientesFiltrados.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => seleccionarCliente(c)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-600 transition-colors border-b border-slate-600 last:border-b-0"
                        >
                          <div className="font-medium text-white">{c.nombre}</div>
                          <div className="text-sm text-slate-400 space-y-1 mt-1">
                            {c.email && <div>📧 {c.email}</div>}
                            {c.telefono && <div>📱 {c.telefono}</div>}
                            {c.rut && <div>🆔 {c.rut}</div>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Mensaje si no hay resultados */}
                  {mostrarSugerencias && busquedaCliente && clientesFiltrados.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg p-4">
                      <p className="text-slate-400 text-sm">No se encontraron clientes</p>
                    </div>
                  )}
                </div>
                
                {/* Botón para crear nuevo cliente */}
                <button
                  onClick={() => setMostrarModalCliente(true)}
                  className="mt-3 w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Crear Nuevo Cliente</span>
                </button>
                
                {/* Mostrar información del cliente seleccionado */}
                {cliente.id && (
                  <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-green-400">✓ Cliente seleccionado</div>
                        <div className="text-white mt-1">{cliente.nombre}</div>
                        {cliente.email && <div className="text-sm text-slate-300">📧 {cliente.email}</div>}
                        {cliente.telefono && <div className="text-sm text-slate-300">📱 {cliente.telefono}</div>}
                      </div>
                      <button
                        onClick={() => {
                          setCliente({...cliente, id: undefined});
                          setBusquedaCliente('');
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
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
                  {tiposDocumento.filter(tipo => [CODIGO_DOCUMENTO_POS_DEFAULT, CODIGO_FACTURA].includes(tipo.codigo)).map(tipo => (
                    <button
                      key={tipo.id}
                      onClick={() => {
                        console.log('🧾 Cambiando tipo documento a:', tipo.nombre, 'ID:', tipo.id);
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
                      <div className="font-medium flex items-center justify-between">
                        <span>{tipo.nombre}</span>
                        {tipoDocumentoId === tipo.id && <span className="text-teal-400">✓</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {tipo.codigo === CODIGO_DOCUMENTO_POS_DEFAULT ? 'Para consumidores finales' : 'Para empresas (requiere RUT)'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Indicador del tipo seleccionado */}
              {tipoDocumentoId && (
                <div className="mt-3 text-xs text-slate-400">
                  Tipo seleccionado: <span className="text-white font-medium">
                    {tiposDocumento.find(t => t.id === tipoDocumentoId)?.nombre || 'Desconocido'}
                  </span>
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
                    className={`w-full p-3 bg-slate-700 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white placeholder-slate-400 ${
                      emailDuplicado ? 'border-yellow-500' : 'border-slate-600'
                    }`}
                    placeholder="cliente@email.com"
                  />
                  
                  {/* Advertencia de email duplicado */}
                  {emailDuplicado && (
                    <div className="mt-2 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <span className="text-yellow-400 text-lg">⚠️</span>
                        <div className="flex-1">
                          <p className="text-yellow-300 text-sm font-medium">
                            Este email ya está registrado
                          </p>
                          <p className="text-yellow-200 text-xs mt-1">
                            Cliente: <span className="font-semibold">{emailDuplicado.nombre}</span>
                          </p>
                          <button
                            onClick={() => {
                              seleccionarCliente(emailDuplicado);
                              setEmailDuplicado(null);
                            }}
                            className="mt-2 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded transition-colors"
                          >
                            ✓ Usar este cliente
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
              {/* Local de despacho - READONLY */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Local de Despacho
                </label>
                <div className="w-full p-3 bg-slate-900 border-2 border-slate-700 rounded-lg text-slate-300 flex items-center justify-between">
                  <span>{locales.find(l => l.id === localId)?.nombre || 'No asignado'}</span>
                  <span className="text-xs bg-slate-700 px-2 py-1 rounded">
                    🔒 Automático
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  El local de despacho se asigna automáticamente según tu usuario
                </p>
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
              
              {/* Tipo de documento - MUY VISIBLE */}
              <div className={`flex justify-between text-sm p-3 rounded-lg border-2 ${
                tiposDocumento.find(t => t.id === tipoDocumentoId)?.codigo === CODIGO_FACTURA
                  ? 'bg-yellow-900/30 border-yellow-500/50'
                  : 'bg-blue-900/30 border-blue-500/50'
              }`}>
                <span className="font-medium text-white">📄 Tipo Documento:</span>
                <span className={`font-bold ${
                  tiposDocumento.find(t => t.id === tipoDocumentoId)?.codigo === CODIGO_FACTURA
                    ? 'text-yellow-400'
                    : 'text-blue-400'
                }`}>
                  {tiposDocumento.find(t => t.id === tipoDocumentoId)?.nombre || tiposDocumento.find(t => t.codigo === CODIGO_DOCUMENTO_POS_DEFAULT)?.nombre || 'Documento'}
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
                  <div>{tenantConfig?.branding.nombre_comercial || tenantConfig?.tenant.nombre || 'Tienda'}</div>
                  {(tenantConfig?.tenant.dominio_principal || tenantConfig?.footer?.email) && (
                    <div>{tenantConfig?.tenant.dominio_principal || tenantConfig?.footer?.email}</div>
                  )}
                </div>
              </div>
              <p className="text-center text-slate-400 text-xs mt-2">
                Esta es solo una vista previa. La boleta real se generará al crear el pedido.
              </p>
            </div>
          )}
          
          {/* Botones de acción */}
          <div className="space-y-3">
            {/* Advertencia GRANDE si es FACTURA */}
            {tiposDocumento.find(t => t.id === tipoDocumentoId)?.codigo === CODIGO_FACTURA && (
              <div className="bg-yellow-900/50 border-2 border-yellow-500 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-3xl">⚠️</span>
                  <div>
                    <p className="text-yellow-300 font-bold text-lg">¡ATENCIÓN! Vas a crear una FACTURA</p>
                    <p className="text-yellow-200 text-sm mt-1">
                      Si no necesitas factura, cambia el tipo de documento arriba.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
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
      
      {/* Modal para crear nuevo cliente */}
      {mostrarModalCliente && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <PlusIcon className="h-6 w-6 text-teal-400" />
                <span>Crear Nuevo Cliente</span>
              </h3>
              <button
                onClick={() => {
                  setMostrarModalCliente(false);
                  setErrorCreacion('');
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* Formulario */}
            <div className="p-6 space-y-4">
              {errorCreacion && (
                <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">❌ {errorCreacion}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nombre Completo * 
                  </label>
                  <input
                    type="text"
                    value={nuevoCliente.nombre}
                    onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="Ingrese el nombre completo"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={nuevoCliente.email || ''}
                    onChange={(e) => setNuevoCliente({...nuevoCliente, email: e.target.value})}
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="cliente@email.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={nuevoCliente.telefono || ''}
                    onChange={(e) => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="+56 9 xxxx xxxx"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Dirección 📍
                  </label>
                  <DireccionAutocomplete
                    value={nuevoCliente.direccion || ''}
                    onChange={(value) => setNuevoCliente({...nuevoCliente, direccion: value})}
                    placeholder="Ingrese dirección (autocompletado)"
                    className="p-3"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    💡 Comience a escribir para ver sugerencias de direcciones
                  </p>
                </div>
              </div>
            </div>
            
            {/* Footer del modal */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-700">
              <button
                onClick={() => {
                  setMostrarModalCliente(false);
                  setErrorCreacion('');
                }}
                disabled={creandoCliente}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 text-white font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearCliente}
                disabled={creandoCliente || !nuevoCliente.nombre.trim()}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
              >
                {creandoCliente ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5" />
                    <span>Crear Cliente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}