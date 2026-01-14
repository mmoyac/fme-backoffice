'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProductos, type Producto } from '@/lib/api/productos';
import { getClientes, type Cliente } from '@/lib/api/clientes';
import { getLocales, type Local } from '@/lib/api/locales';
import { getMediosPago, type MedioPago } from '@/lib/api/maestras';
import { crearPedido, type PedidoCreate, type ItemPedidoCreate } from '@/lib/api/pedidos';
import { getPrecioProductoLocal } from '@/lib/api/precios';
import { estimarPuntosPorItems, type ItemParaPuntos } from '@/lib/api/puntos';
import { AuthService } from '@/lib/auth';
import { CheckCircleIcon, XMarkIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import { BoletaTermica } from '@/components/pos/BoletaTermica';

// Función para obtener catálogo con stock
async function getCatalogoProductos() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/productos/catalogo`, {
    headers: AuthService.getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener catálogo');
  return response.json();
}

// Función para obtener productos con datos específicos del local
async function getProductosConDatosLocal(localId: number) {
  // Obtener productos base
  const productos = await getProductos();
  
  // Para cada producto, obtener precio e inventario del local específico
  const productosConDatos = await Promise.all(
    productos.map(async (producto) => {
      try {
        // Obtener precio del local
        const precio = await getPrecioProductoLocal(producto.id, localId);
        
        // Obtener stock del local específico
        const responseStock = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/inventario/producto/${producto.id}/local/${localId}`,
          { headers: AuthService.getAuthHeaders() }
        );
        
        let stockLocal = 0;
        if (responseStock.ok) {
          const inventario = await responseStock.json();
          stockLocal = inventario.cantidad_stock || 0;
        }
        
        return {
          ...producto,
          precio_local: precio?.monto_precio || 0,
          stock_local: stockLocal,
          // Mantener compatibilidad con código existente
          stock_total: stockLocal
        };
      } catch (error) {
        console.warn(`Error obteniendo datos para producto ${producto.id}:`, error);
        return {
          ...producto,
          precio_local: 0,
          stock_local: 0,
          stock_total: 0
        };
      }
    })
  );
  
  return productosConDatos;
}

// Importar componentes de las etapas
import { EtapaProductos } from '@/components/pos/EtapaProductos';
import { EtapaCarrito } from '@/components/pos/EtapaCarrito';
import { EtapaFinalizacion } from '@/components/pos/EtapaFinalizacion';

// Interfaces para el POS
interface ItemCarrito {
  id: string;
  producto_id: number;
  sku: string;
  nombre: string;
  tipo_venta_codigo: string; // UNITARIO, PESO_SUELTO
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface ClienteFormulario {
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  es_anonimo: boolean;
  // Campos tributarios
  rut?: string;
  razon_social?: string;
  giro?: string;
  es_empresa?: boolean;
}

type EtapaPOS = 'productos' | 'carrito' | 'finalizacion';

export default function POSPedidoPage() {
  // Estados principales
  const [etapaActual, setEtapaActual] = useState<EtapaPOS>('productos');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
  
  // Estados del producto seleccionado
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidadInput, setCantidadInput] = useState<string>('');
  
  // Estados del formulario final
  const [cliente, setCliente] = useState<ClienteFormulario>({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    es_anonimo: true
  });
  const [localId, setLocalId] = useState<number | null>(null);
  const [medioPagoId, setMedioPagoId] = useState<number | null>(null);
  const [tipoDocumentoId, setTipoDocumentoId] = useState<number | null>(null);
  const [notas, setNotas] = useState<string>('');
  
  // Estados de carga
  const [loading, setLoading] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [procesando, setProcesando] = useState(false);
  
  // Estados para impresión de boleta
  const [mostrarBoleta, setMostrarBoleta] = useState<boolean>(false);
  const [datosBoleta, setDatosBoleta] = useState<any>(null);
  
  // Estado para usuario autenticado
  const [usuarioActual, setUsuarioActual] = useState<any>(null);
  
  // Estado para puntos
  const [puntosEstimados, setPuntosEstimados] = useState<any>(null);

  const router = useRouter();

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        console.log('🔄 Cargando datos del POS...');
        
        // Obtener usuario actual
        const usuario = await AuthService.getCurrentUser();
        setUsuarioActual(usuario);
        console.log('👤 Usuario autenticado:', usuario);
        
        const [productosData, clientesData, localesData, mediosData] = await Promise.all([
          getCatalogoProductos(), // Usar catálogo que incluye stock_total
          getClientes(),
          getLocales(),
          getMediosPago()
        ]);
        
        console.log('📦 Productos obtenidos:', productosData.length);
        
        setProductos(productosData.filter((p: any) => p.stock_total > 0)); // Solo productos con stock
        setClientes(clientesData);
        setLocales(localesData);  // Usar todos los locales temporalmente
        setMediosPago(mediosData);
        
        console.log('🏪 Todos los locales:', localesData);
        
        // Seleccionar local por defecto del usuario
        const localesVenta = localesData; // Usar todos los locales disponibles
        
        if (usuario?.local_defecto_id) {
          setLocalId(usuario.local_defecto_id);
        } else if (localesVenta.length > 0) {
          // Si el usuario no tiene local por defecto, usar el primer local de venta
          setLocalId(localesVenta[0].id);
        } else if (localesData.length > 0) {
          // Fallback: usar cualquier local disponible
          setLocalId(localesData[0].id);
        } else {
          console.warn('⚠️ No hay locales disponibles en absoluto');
        }
      } catch (error) {
        console.error('❌ Error cargando datos POS:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Recargar productos cuando cambie el local seleccionado
  useEffect(() => {
    if (localId && locales.length > 0) {
      cargarProductosLocal(localId);
    }
  }, [localId]);

  // Cargar productos específicos del local
  const cargarProductosLocal = async (localIdParam: number) => {
    setLoadingProductos(true);
    try {
      console.log('🔄 Cargando productos para local:', localIdParam);
      const productosLocal = await getProductosConDatosLocal(localIdParam);
      
      // Solo mostrar productos con stock en este local
      setProductos(productosLocal.filter(p => p.stock_local > 0));
    } catch (error) {
      console.error('❌ Error cargando productos del local:', error);
    } finally {
      setLoadingProductos(false);
    }
  };

  // Función para agregar producto al carrito
  const agregarAlCarrito = async () => {
    if (!productoSeleccionado || !cantidadInput || !localId) {
      return;
    }
    
    const cantidadFloat = parseFloat(cantidadInput) || 0;
    // Para productos unitarios, redondear. Para peso, mantener decimales
    const cantidad = productoSeleccionado.tipo_venta_codigo === 'UNITARIO' 
      ? Math.round(cantidadFloat) 
      : cantidadFloat;
    if (cantidad <= 0) {
      return;
    }
    
    try {
      // Obtener precio del producto
      const precio = await getPrecioProductoLocal(productoSeleccionado.id, localId);
      
      if (!precio || !precio.monto_precio) {
        alert(`No se encontró precio para "${productoSeleccionado.nombre}" en este local`);
        return;
      }
      
      const precioUnitario = precio.monto_precio;
      
      // Verificar si ya existe en el carrito
      const itemExistente = carrito.find(item => item.producto_id === productoSeleccionado.id);
      
      if (itemExistente) {
        // Actualizar cantidad
        const nuevosItems = carrito.map(item => {
          if (item.producto_id === productoSeleccionado.id) {
            const nuevaCantidadFloat = item.cantidad + cantidad;
            // Mantener lógica según tipo de producto
            const nuevaCantidad = item.tipo_venta_codigo === 'UNITARIO' 
              ? Math.round(nuevaCantidadFloat) 
              : nuevaCantidadFloat;
            return {
              ...item,
              cantidad: nuevaCantidad,
              subtotal: nuevaCantidad * precioUnitario
            };
          }
          return item;
        });
        console.log('📝 Actualizando items del carrito:', nuevosItems);
        setCarrito(nuevosItems);
      } else {
        // Agregar nuevo item
        const nuevoItem: ItemCarrito = {
          id: Date.now().toString(),
          producto_id: productoSeleccionado.id,
          sku: productoSeleccionado.sku,
          nombre: productoSeleccionado.nombre,
          tipo_venta_codigo: productoSeleccionado.tipo_venta_codigo || 'UNITARIO',
          cantidad: cantidad, // Ya procesada según el tipo de producto
          precio_unitario: precioUnitario,
          subtotal: cantidad * precioUnitario
        };
        console.log('➕ Agregando nuevo item:', nuevoItem);
        setCarrito([...carrito, nuevoItem]);
      }
      
      // Resetear selección
      setProductoSeleccionado(null);
      setCantidadInput('');
      
    } catch (error) {
      console.error('Error agregando al carrito:', error);
      alert('Error al agregar el producto');
    }
  };

  // Función para eliminar item del carrito
  const eliminarDelCarrito = (itemId: string) => {
    setCarrito(carrito.filter(item => item.id !== itemId));
  };

  // Calcular total del carrito
  const totalCarrito = carrito.reduce((total, item) => total + item.subtotal, 0);

  // Función para calcular puntos estimados
  const calcularPuntosEstimados = async (carritoActual: ItemCarrito[]) => {
    if (carritoActual.length === 0) {
      setPuntosEstimados(null);
      return;
    }

    try {
      const items: ItemParaPuntos[] = carritoActual.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad
      }));

      const estimacion = await estimarPuntosPorItems(items);
      setPuntosEstimados(estimacion);
    } catch (error) {
      console.error('Error calculando puntos:', error);
      setPuntosEstimados(null);
    }
  };

  // Efecto para calcular puntos cuando cambie el carrito
  useEffect(() => {
    calcularPuntosEstimados(carrito);
  }, [carrito]);

  // Función para procesar pedido
  const procesarPedido = async () => {
    if (carrito.length === 0 || !localId || !medioPagoId || !tipoDocumentoId) {
      alert('Complete todos los campos requeridos');
      return;
    }
    
    // Validación específica para facturas
    if (cliente.es_empresa && tipoDocumentoId) {
      // Buscar el tipo de documento seleccionado para validar si es factura
      const tipoSeleccionado = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/config/tipos-documento`)
        .then(res => res.json())
        .then(tipos => tipos.find((t: any) => t.id === tipoDocumentoId));
      
      if (tipoSeleccionado?.codigo === 'FAC') {
        if (!cliente.rut || !cliente.razon_social) {
          alert('Para factura debe completar RUT y Razón Social');
          return;
        }
        if (cliente.es_anonimo) {
          alert('No se puede emitir factura para cliente anónimo');
          return;
        }
      }
    }
    
    setProcesando(true);
    
    try {
      // 1. Crear/obtener cliente
      let clienteId: number;
      let datosCliente = {
        nombre: cliente.es_anonimo ? 'Cliente Anónimo' : cliente.nombre || 'Sin nombre',
        email: cliente.es_anonimo ? `anonimo${Date.now()}@pos.local` : cliente.email || '',
        telefono: cliente.es_anonimo ? '000000000' : cliente.telefono || '',
        direccion: cliente.es_anonimo ? 'Dirección no especificada' : cliente.direccion || '',
        // Campos tributarios
        rut: cliente.rut || undefined,
        razon_social: cliente.razon_social || undefined,
        giro: cliente.giro || undefined,
        es_empresa: cliente.es_empresa || false
      };

      if (cliente.es_anonimo) {
        // Para clientes anónimos, usar un email único temporal
        datosCliente.email = `anonimo${Date.now()}@pos.local`;
      }

      // Crear cliente
      const nuevoCliente = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clientes/`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(datosCliente)
      });

      if (!nuevoCliente.ok) {
        const errorCliente = await nuevoCliente.json();
        throw new Error(`Error creando cliente: ${errorCliente.detail}`);
      }

      const clienteCreado = await nuevoCliente.json();
      clienteId = clienteCreado.id;

      console.log('✅ Cliente creado:', clienteCreado);

      // 2. Crear pedido
      const itemsPedido = carrito.map(item => ({
        producto_id: item.producto_id,
        sku: item.sku, // Agregar SKU requerido por el backend
        cantidad: item.cantidad, // Respetar cantidad según tipo de producto
        precio_unitario_venta: item.precio_unitario
      }));
      
      const pedidoData = {
        cliente_id: clienteId,
        cliente_nombre: datosCliente.nombre,
        cliente_email: datosCliente.email,
        cliente_telefono: datosCliente.telefono,
        direccion_entrega: datosCliente.direccion,
        local_id: localId,
        medio_pago_id: medioPagoId,
        tipo_pedido_id: 1, // PRODUCTOS
        tipo_documento_tributario_id: tipoDocumentoId || 2, // Por defecto BOLETA (BOL)
        // Campos tributarios del cliente
        cliente_rut: datosCliente.rut,
        cliente_razon_social: datosCliente.razon_social,
        cliente_giro: datosCliente.giro,
        cliente_es_empresa: datosCliente.es_empresa,
        notas: notas || undefined,
        puntos_usar: 0,
        items: itemsPedido
      };

      console.log('📦 Datos del pedido:', pedidoData);
      
      const nuevoPedido = await crearPedido(pedidoData);
      
      console.log('✅ Pedido creado exitosamente:', nuevoPedido);
      
      // Preparar datos para la boleta
      const localSeleccionado = locales.find(l => l.id === localId);
      const medioPagoSeleccionado = mediosPago.find(mp => mp.id === medioPagoId);
      
      // Obtener información del tipo de documento
      const tiposDocumento = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/config/tipos-documento`)
        .then(res => res.json()).catch(() => []);
      const tipoDocumentoSeleccionado = tiposDocumento.find((t: any) => t.id === tipoDocumentoId);
      
      console.log('🔍 Debug tipos documento:', {
        tipoDocumentoId,
        tiposDocumento,
        tipoDocumentoSeleccionado,
        codigoSeleccionado: tipoDocumentoSeleccionado?.codigo
      });
      
      const datosBoleta = {
        numero_pedido: nuevoPedido.numero_pedido,
        fecha: new Date().toISOString(),
        local_nombre: localSeleccionado?.nombre || 'Local POS',
        local_direccion: localSeleccionado?.direccion,
        cliente_nombre: datosCliente.nombre,
        cliente_telefono: datosCliente.telefono !== '000000000' ? datosCliente.telefono : undefined,
        // Información tributaria
        cliente_rut: datosCliente.rut,
        cliente_razon_social: datosCliente.razon_social,
        tipo_documento: tipoDocumentoSeleccionado?.codigo === 'FAC' ? 'FACTURA' : 'BOLETA',
        estado_sii: tipoDocumentoSeleccionado?.codigo === 'FAC' ? 'PENDIENTE ENVÍO' : undefined,
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
      
      console.log('🧾 Datos boleta construidos:', datosBoleta);
      
      // Mostrar boleta para impresión
      setDatosBoleta(datosBoleta);
      setMostrarBoleta(true);
      
    } catch (error) {
      console.error('❌ Error completo creando pedido:', error);
      
      let mensajeError = 'Error desconocido al crear el pedido';
      
      if (error instanceof Error) {
        mensajeError = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Intentar extraer información útil del error
        try {
          mensajeError = JSON.stringify(error, null, 2);
        } catch {
          mensajeError = 'Error de formato desconocido';
        }
      }
      
      console.error('📝 Mensaje de error procesado:', mensajeError);
      alert(`Error al crear el pedido:\n${mensajeError}`);
    } finally {
      setProcesando(false);
    }
  };
  
  // Función para manejar el cierre de la boleta
  const cerrarBoleta = () => {
    setMostrarBoleta(false);
    setDatosBoleta(null);
    // Limpiar carrito y regresar a productos
    setCarrito([]);
    setEtapaActual('productos');
    setCliente({
      nombre: '',
      email: '',
      telefono: '',
      direccion: '',
      es_anonimo: true
    });
    setNotas('');
    // Mantener local y medio de pago seleccionados para próximo pedido
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando POS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header del POS */}
      <div className="bg-slate-800 shadow-sm border-b border-slate-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">POS - Nuevo Pedido</h1>
            
            {/* Indicador de etapas */}
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${etapaActual === 'productos' ? 'text-teal-400' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  etapaActual === 'productos' ? 'bg-teal-600 text-white' : 'bg-slate-700 text-slate-400'
                }`}>1</div>
                <span className="font-medium">Productos</span>
              </div>
              
              <div className={`flex items-center space-x-2 ${etapaActual === 'carrito' ? 'text-teal-400' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  etapaActual === 'carrito' ? 'bg-teal-600 text-white' : 'bg-slate-700 text-slate-400'
                }`}>2</div>
                <span className="font-medium">Carrito</span>
              </div>
              
              <div className={`flex items-center space-x-2 ${etapaActual === 'finalizacion' ? 'text-teal-400' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  etapaActual === 'finalizacion' ? 'bg-teal-600 text-white' : 'bg-slate-700 text-slate-400'
                }`}>3</div>
                <span className="font-medium">Finalizar</span>
              </div>
            </div>
            
            {/* Total del carrito */}
            {carrito.length > 0 && (
              <div className="text-right">
                <p className="text-sm text-slate-400">{carrito.length} items</p>
                <p className="text-xl font-bold text-teal-400">
                  ${totalCarrito.toLocaleString()}
                </p>
                {puntosEstimados && puntosEstimados.total_puntos > 0 && (
                  <p className="text-sm text-green-400">
                    🎁 +{puntosEstimados.total_puntos} puntos
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Información del Local Asignado */}
      {localId && locales.length > 0 && (
        <div className="bg-slate-800/50 border-b border-slate-600 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-slate-300">🏪 Local de venta:</span>
              <span className="font-medium text-teal-400">
                {locales.find(l => l.id === localId)?.nombre || 'Local no encontrado'}
              </span>
              <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">
                {usuarioActual?.local_defecto_id === localId ? 'Local asignado' : 'Local temporal'}
              </span>
            </div>
            {usuarioActual?.nombre_completo && (
              <div className="text-sm text-slate-400">
                👤 {usuarioActual.nombre_completo}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advertencia si no hay local asignado */}
      {!localId && !loading && locales.length > 0 && (
        <div className="bg-red-900/20 border-b border-red-600/30 px-6 py-3">
          <div className="flex items-center space-x-4">
            <span className="text-red-400 font-medium">⚠️ No se pudo determinar tu local asignado.</span>
            <span className="text-red-300 text-sm">Contacta al administrador para configurar tu local por defecto.</span>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="p-6">
        {etapaActual === 'productos' && (
          <EtapaProductos 
            productos={productos}
            productoSeleccionado={productoSeleccionado}
            setProductoSeleccionado={setProductoSeleccionado}
            cantidadInput={cantidadInput}
            setCantidadInput={setCantidadInput}
            agregarAlCarrito={agregarAlCarrito}
            carrito={carrito}
            onSiguiente={() => setEtapaActual('carrito')}
            localId={localId}
            loadingProductos={loadingProductos}
          />
        )}
        
        {etapaActual === 'carrito' && (
          <EtapaCarrito 
            carrito={carrito}
            eliminarDelCarrito={eliminarDelCarrito}
            totalCarrito={totalCarrito}
            onAnterior={() => setEtapaActual('productos')}
            onSiguiente={() => setEtapaActual('finalizacion')}
          />
        )}
        
        {etapaActual === 'finalizacion' && (
          <EtapaFinalizacion 
            cliente={cliente}
            setCliente={setCliente}
            locales={locales}
            localId={localId}
            setLocalId={setLocalId}
            mediosPago={mediosPago}
            medioPagoId={medioPagoId}
            setMedioPagoId={setMedioPagoId}
            tipoDocumentoId={tipoDocumentoId}
            setTipoDocumentoId={setTipoDocumentoId}
            notas={notas}
            setNotas={setNotas}
            totalCarrito={totalCarrito}
            procesando={procesando}
            onAnterior={() => setEtapaActual('carrito')}
            onProcesar={procesarPedido}
            carrito={carrito}
            usuarioActual={usuarioActual}
            puntosEstimados={puntosEstimados}
          />
        )}
      </div>
      
      {/* Boleta térmica */}
      {mostrarBoleta && datosBoleta && (
        <BoletaTermica 
          datos={datosBoleta}
          onImprimir={cerrarBoleta}
          visible={mostrarBoleta}
        />
      )}
    </div>
  );
}