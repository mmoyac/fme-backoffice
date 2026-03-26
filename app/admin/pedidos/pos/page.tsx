'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProductos, type Producto } from '@/lib/api/productos';
import { getClientes, type Cliente } from '@/lib/api/clientes';
import { getLocales, type Local } from '@/lib/api/locales';
import { getMediosPago, type MedioPago } from '@/lib/api/maestras';
import { getUnidadesMedida, type UnidadMedida } from '@/lib/api/maestras';
import { crearPedido, type PedidoCreate, type ItemPedidoCreate } from '@/lib/api/pedidos';
import { getPrecioProductoLocal } from '@/lib/api/precios';
import { estimarPuntosPorItems, type ItemParaPuntos } from '@/lib/api/puntos';
import { AuthService } from '@/lib/auth';
import { CheckCircleIcon, XMarkIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import { BoletaTermica } from '@/components/pos/BoletaTermica';
import { useTenant } from '@/lib/TenantContext';

// ⚙️ CONFIGURACIÓN: Tipo de documento por defecto para el POS
// Según tu base de datos:
// - 'BOL' = Boleta Electrónica (ID 2)
// - 'FAC' = Factura Electrónica (ID 1)
const CODIGO_DOCUMENTO_POS_DEFAULT = 'BOL'; // Boleta Electrónica para POS

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
  // ✅ OPTIMIZADO: Un solo endpoint que devuelve TODO en una query SQL
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/productos/catalogo-local/${localId}`,
    { headers: AuthService.getAuthHeaders() }
  );
  
  if (!response.ok) {
    throw new Error('Error al obtener catálogo del local');
  }
  
  const productos = await response.json();
  
  // Mapear al formato esperado por el componente
  return productos.map((p: any) => ({
    ...p,
    precio_local: p.precio_local || 0,
    stock_total: p.stock_local || 0,
    // Compatibilidad con código existente
    tipo_producto: { id: p.tipo_producto_id },
    unidad_medida: { id: p.unidad_medida_id },
    categoria: {
      id: p.categoria_id,
      nombre: p.categoria_nombre,
      puntos_fidelidad: p.categoria_puntos_fidelidad || 0
    }
  }));
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
  peso_bruto: number | null; // kg por unidad — requerido para pedidos con delivery
}

interface ClienteFormulario {
  id?: number;  // Opcional: se usa cuando el cliente es seleccionado de la búsqueda
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
  // Contexto de tenant
  const { config: tenantConfig } = useTenant();
  
  // Estados principales
  const [etapaActual, setEtapaActual] = useState<EtapaPOS>('productos');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
  const [canalesVenta, setCanalesVenta] = useState<{ id: number; codigo: string; nombre: string; entrega_inmediata: boolean; visible_en_pos: boolean }[]>([]);
  const [canalVentaId, setCanalVentaId] = useState<number | null>(null);
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedida[]>([]);
  
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
  
  // Estados para validación de caja
  const [cajaAbierta, setCajaAbierta] = useState<boolean>(false);
  const [infoCaja, setInfoCaja] = useState<any>(null);
  const [errorCaja, setErrorCaja] = useState<string>('');

  // Estados para modal de abrir caja directamente desde el POS
  const [showAbrirCajaModal, setShowAbrirCajaModal] = useState<boolean>(false);
  const [montoInicialCaja, setMontoInicialCaja] = useState<number>(0);
  const [observacionesApertura, setObservacionesApertura] = useState<string>('');
  const [abriendo, setAbriendo] = useState<boolean>(false);

  // Delivery
  const [requiereDelivery, setRequiereDelivery] = useState<boolean>(false);
  const [costoDeliveryFinal, setCostoDeliveryFinal] = useState<number | null>(null);

  const router = useRouter();
  
  // Función para recargar lista de clientes
  const recargarClientes = async () => {
    try {
      console.log('🔄 Recargando lista de clientes...');
      const clientesData = await getClientes();
      setClientes(clientesData);
      console.log('✅ Clientes actualizados:', clientesData.length);
    } catch (error) {
      console.error('❌ Error recargando clientes:', error);
    }
  };
  
  // Función para verificar si hay caja abierta en un local
  const verificarCajaAbierta = async (localIdParam: number) => {
    try {
      console.log(`🔍 Verificando caja abierta en local ${localIdParam}...`);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/caja/local/${localIdParam}/caja-abierta`,
        { headers: AuthService.getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Error al verificar caja');
      }
      
      const data = await response.json();
      console.log('📊 Estado de caja:', data);
      
      setCajaAbierta(data.tiene_caja_abierta);
      setInfoCaja(data);
      
      if (!data.tiene_caja_abierta) {
        setErrorCaja(data.mensaje || `No hay caja abierta en '${data.local_nombre}'.`);
      } else {
        setErrorCaja('');
      }
      
      return data.tiene_caja_abierta;
    } catch (error) {
      console.error('❌ Error verificando caja:', error);
      setCajaAbierta(false);
      setErrorCaja('Error al verificar el estado de la caja');
      return false;
    }
  };

  // Función para abrir caja directamente desde el POS
  const handleAbrirCajaDirecto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localId) {
      alert('No hay local seleccionado');
      return;
    }
    setAbriendo(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/caja/turno/abrir`,
        {
          method: 'POST',
          headers: { ...AuthService.getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            local_id: localId,
            monto_inicial: montoInicialCaja,
            observaciones_apertura: observacionesApertura || undefined
          })
        }
      );
      if (response.ok) {
        setShowAbrirCajaModal(false);
        setMontoInicialCaja(0);
        setObservacionesApertura('');
        // Refresca estado de caja inmediatamente
        await verificarCajaAbierta(localId);
      } else {
        const error = await response.json();
        alert(`Error al abrir caja: ${error.detail || 'Error desconocido'}`);
      }
    } catch (err) {
      alert('Error de conexión al intentar abrir caja');
    } finally {
      setAbriendo(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        console.log('🔄 Cargando datos del POS...');
        
        // Obtener usuario actual
        const usuario = await AuthService.getCurrentUser();
        setUsuarioActual(usuario);
        console.log('👤 Usuario autenticado:', usuario);
        
        const [clientesData, localesData, mediosData, unidadesData, canalesData] = await Promise.all([
          getClientes(),
          getLocales(),
          getMediosPago(),
          getUnidadesMedida(),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/canales-venta/`, { headers: AuthService.getAuthHeaders() }).then(r => r.json())
        ]);

        setClientes(clientesData);
        setLocales(localesData);
        setMediosPago(mediosData);
        setUnidadesMedida(unidadesData);
        setCanalesVenta(canalesData);
        // Por defecto: POS (entrega inmediata)
        const canalPos = canalesData.find((c: any) => c.codigo === 'POS');
        if (canalPos) setCanalVentaId(canalPos.id);
        
        console.log('🏪 Locales disponibles:', localesData.map((l: any) => `${l.id}:${l.codigo}`));
        
        // Seleccionar local físico por defecto del usuario
        // Prioridad: local_defecto_id > primer local NO-WEB > primer local disponible
        const localesFisicos = localesData.filter((l: any) => l.codigo !== 'WEB');
        
        let localSeleccionado = null;
        if (usuario?.local_defecto_id) {
          localSeleccionado = usuario.local_defecto_id;
        } else if (localesFisicos.length > 0) {
          localSeleccionado = localesFisicos[0].id;
        } else if (localesData.length > 0) {
          localSeleccionado = localesData[0].id;
        }
        
        if (localSeleccionado) {
          setLocalId(localSeleccionado);
          await verificarCajaAbierta(localSeleccionado);
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
    if (localId) {
      cargarProductosLocal(localId);
      // Verificar caja cuando cambia el local
      verificarCajaAbierta(localId);
    }
  }, [localId]);

  // Cargar productos específicos del local
  const cargarProductosLocal = async (localIdParam: number) => {
    setLoadingProductos(true);
    try {
      console.log('🔄 Cargando productos para local:', localIdParam);
      const productosLocal = await getProductosConDatosLocal(localIdParam);
      
      // Solo mostrar productos con stock en este local
      setProductos(productosLocal.filter((p: any) => p.stock_local > 0));
    } catch (error) {
      console.error('❌ Error cargando productos del local:', error);
    } finally {
      setLoadingProductos(false);
    }
  };

  // Función para calcular el precio correcto según la cantidad
  const calcularPrecioSegunCantidad = (precios: any[], cantidad: number) => {
    if (!precios || precios.length === 0) return null;
    
    // Ordenar precios por factor de conversión (mayor a menor)
    const preciosOrdenados = [...precios].sort((a, b) => {
      const factorA = getFactorUnidad(a.unidad_medida_id);
      const factorB = getFactorUnidad(b.unidad_medida_id);
      return factorB - factorA; // Mayor factor primero (docena > media docena > unitario)
    });
    
    // Buscar el precio más conveniente según la cantidad
    for (const precio of preciosOrdenados) {
      const factor = getFactorUnidad(precio.unidad_medida_id);
      if (cantidad >= factor) {
        // Este precio aplica - el monto_precio es el precio UNITARIO para este tier
        return {
          precio: precio.monto_precio, // Precio unitario
          unidad_medida_id: precio.unidad_medida_id,
          factor: factor,
          precio_total_unidad: precio.monto_precio
        };
      }
    }
    
    // Si no hay precio que aplique, usar el de menor factor (unitario)
    const precioUnitario = preciosOrdenados[preciosOrdenados.length - 1];
    const factor = getFactorUnidad(precioUnitario.unidad_medida_id);
    return {
      precio: precioUnitario.monto_precio, // Precio unitario
      unidad_medida_id: precioUnitario.unidad_medida_id,
      factor: factor,
      precio_total_unidad: precioUnitario.monto_precio
    };
  };
  
  // Función auxiliar para obtener prioridad de unidad (factor de conversión)
  const getPrioridadUnidad = (unidadId: number) => {
    const unidad = unidadesMedida.find(u => u.id === unidadId);
    return unidad?.factor_conversion || 1;
  };
  
  // Función auxiliar para obtener factor de conversión
  const getFactorUnidad = (unidadId: number) => {
    const unidad = unidadesMedida.find(u => u.id === unidadId);
    return unidad?.factor_conversion || 1;
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
      // Obtener TODOS los precios del producto
      const precios = await getPrecioProductoLocal(productoSeleccionado.id, localId);
      
      if (!precios || precios.length === 0) {
        alert(`No se encontró precio para "${productoSeleccionado.nombre}" en este local`);
        return;
      }
      
      // Calcular el precio correcto según la cantidad
      const precioCalculado = calcularPrecioSegunCantidad(precios, cantidad);
      
      if (!precioCalculado) {
        alert(`No se pudo calcular el precio para la cantidad especificada`);
        return;
      }
      
      const precioUnitario = precioCalculado.precio;
      const factor = precioCalculado.factor;
      
      console.log(`💰 Precio calculado para ${cantidad} unidades:`, {
        precio_unitario: precioUnitario,
        factor: factor,
        unidad: precioCalculado.unidad_medida_id,
        subtotal: Math.round(cantidad * precioUnitario)
      });
      
      // Verificar si ya existe en el carrito
      const itemExistente = carrito.find(item => item.producto_id === productoSeleccionado.id);
      
      if (itemExistente) {
        // Actualizar cantidad y recalcular precio
        const nuevosItems = carrito.map(item => {
          if (item.producto_id === productoSeleccionado.id) {
            const nuevaCantidadFloat = item.cantidad + cantidad;
            const nuevaCantidad = item.tipo_venta_codigo === 'UNITARIO' 
              ? Math.round(nuevaCantidadFloat) 
              : nuevaCantidadFloat;
            
            // Recalcular precio con la nueva cantidad
            const nuevoPrecioCalculado = calcularPrecioSegunCantidad(precios, nuevaCantidad);
            const nuevoPrecioUnitario = nuevoPrecioCalculado ? nuevoPrecioCalculado.precio : precioUnitario;
            
            return {
              ...item,
              cantidad: nuevaCantidad,
              precio_unitario: nuevoPrecioUnitario,
              subtotal: Math.round(nuevaCantidad * nuevoPrecioUnitario)
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
          cantidad: cantidad,
          precio_unitario: precioUnitario,
          subtotal: Math.round(cantidad * precioUnitario),
          peso_bruto: productoSeleccionado.peso_bruto ?? null,
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
      const EMAIL_ANONIMO = 'anonimo@pos.local';
      let datosCliente = {
        nombre: cliente.es_anonimo ? 'Cliente Anónimo' : cliente.nombre || 'Sin nombre',
        email: cliente.es_anonimo ? EMAIL_ANONIMO : cliente.email || '',
        telefono: cliente.es_anonimo ? '000000000' : cliente.telefono || '',
        direccion: cliente.es_anonimo ? 'Dirección no especificada' : cliente.direccion || '',
        // Campos tributarios
        rut: cliente.rut || undefined,
        razon_social: cliente.razon_social || undefined,
        giro: cliente.giro || undefined,
        es_empresa: cliente.es_empresa || false
      };

      // Si el cliente ya tiene ID, significa que fue seleccionado de la búsqueda
      if (cliente.id) {
        clienteId = cliente.id;
        console.log('✅ Usando cliente existente (seleccionado):', clienteId, cliente.nombre);
      } else {
        // Antes de crear, verificar si el email ya existe en la lista de clientes
        let clienteExistente = null;
        
        if (cliente.es_anonimo) {
          // Buscar cliente anónimo existente
          clienteExistente = clientes.find(c => c.email === EMAIL_ANONIMO);
          if (clienteExistente) {
            console.log('✅ Reutilizando cliente anónimo existente (ID:', clienteExistente.id, ')');
          }
        } else if (datosCliente.email && datosCliente.email.trim() !== '') {
          clienteExistente = clientes.find(c => 
            c.email && c.email.toLowerCase() === datosCliente.email.toLowerCase()
          );
        }
        
        if (clienteExistente) {
          // Cliente encontrado en la lista - usar ese cliente
          clienteId = clienteExistente.id;
          console.log('✅ Cliente encontrado por email:', clienteExistente.nombre, '(ID:', clienteId, ')');
          console.log('📧 Email coincidente:', datosCliente.email);
        } else {
          // Crear nuevo cliente

          console.log('📝 Creando nuevo cliente:', datosCliente);
          
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

          console.log('✅ Cliente nuevo creado:', clienteCreado);
          
          // Recargar lista de clientes para operaciones futuras
          await recargarClientes();
        }
      }

      // 2. Crear pedido
      const itemsPedido = carrito.map(item => ({
        producto_id: item.producto_id,
        sku: item.sku, // Agregar SKU requerido por el backend
        cantidad: item.cantidad, // Respetar cantidad según tipo de producto
        precio_unitario_venta: item.precio_unitario
      }));
      
      // Obtener BOLETA por defecto si no hay tipo documento seleccionado
      let tipoDocFinal = tipoDocumentoId;
      
      // IMPORTANTE: Siempre validar que el ID corresponda al tipo correcto
      console.log('🔍 Validando tipo de documento antes de crear pedido...');
      const tiposResp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/config/tipos-documento`);
      const tiposDoc = await tiposResp.json();
      
      console.log('📋 Tipos de documento disponibles:', tiposDoc);
      
      const documentoDefault = tiposDoc.find((t: any) => t.codigo === CODIGO_DOCUMENTO_POS_DEFAULT);
      const factura = tiposDoc.find((t: any) => t.codigo === 'FAC');
      
      console.log('🧾 IDs en base de datos:', {
        [`Documento POS (${CODIGO_DOCUMENTO_POS_DEFAULT})`]: documentoDefault?.id,
        'FACTURA (FAC)': factura?.id,
        'Todos los tipos': tiposDoc.map((t: any) => `${t.codigo}=${t.id} (${t.nombre})`)
      });
      
      if (!documentoDefault) {
        console.error('❌ ERROR: No se encontró el tipo de documento configurado:', CODIGO_DOCUMENTO_POS_DEFAULT);
        console.error('Tipos disponibles:', tiposDoc.map((t: any) => t.codigo).join(', '));
        throw new Error(`No se encontró el tipo de documento '${CODIGO_DOCUMENTO_POS_DEFAULT}'. Verifica la configuración en el código.`);
      }
      
      if (!tipoDocFinal) {
        console.warn('⚠️ No hay tipoDocumentoId, usando documento por defecto:', documentoDefault.nombre);
        tipoDocFinal = documentoDefault.id;
      } else {
        // Verificar que el ID seleccionado sea el correcto
        const tipoSeleccionado = tiposDoc.find((t: any) => t.id === tipoDocFinal);
        console.log('🔎 Tipo seleccionado:', tipoSeleccionado);
        
        if (tipoSeleccionado?.codigo === 'FAC') {
          console.warn('⚠️⚠️⚠️ ADVERTENCIA: El tipo seleccionado es FACTURA');
          console.warn('Si no quieres factura, cámbialo manualmente en la pantalla');
        } else if (tipoSeleccionado?.codigo !== CODIGO_DOCUMENTO_POS_DEFAULT && tipoSeleccionado?.codigo !== 'FAC') {
          console.warn('⚠️ Tipo inesperado:', tipoSeleccionado?.codigo);
        }
      }
      
      console.log('🧾 Tipo documento FINAL a usar:', tipoDocFinal, `(${tiposDoc.find((t: any) => t.id === tipoDocFinal)?.nombre})`);
      
      const pedidoData = {
        cliente_id: clienteId,
        cliente_nombre: datosCliente.nombre,
        cliente_email: datosCliente.email,
        cliente_telefono: datosCliente.telefono,
        direccion_entrega: datosCliente.direccion,
        local_id: localId,
        medio_pago_id: medioPagoId,
        tipo_pedido_id: 1, // PRODUCTOS
        tipo_documento_tributario_id: tipoDocFinal,
        // Campos tributarios del cliente
        cliente_rut: datosCliente.rut,
        cliente_razon_social: datosCliente.razon_social,
        cliente_giro: datosCliente.giro,
        cliente_es_empresa: datosCliente.es_empresa,
        notas: notas || undefined,
        puntos_usar: 0,
        requiere_delivery: !cliente.es_anonimo && !!cliente.id && requiereDelivery,
        canal_venta_id: canalVentaId,
        costo_delivery: requiereDelivery && costoDeliveryFinal !== null ? costoDeliveryFinal : undefined,
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
        puntos_ganados: puntosEstimados?.total_puntos || 0,
        costo_delivery: requiereDelivery ? costoDeliveryFinal : undefined,
        // Información del tenant para el footer
        tenant_nombre: tenantConfig?.branding.nombre_comercial || tenantConfig?.tenant.nombre || 'Tienda',
        tenant_sitio: tenantConfig?.tenant.dominio_principal || tenantConfig?.footer?.email || undefined
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
    setRequiereDelivery(false);
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
              {locales.find(l => l.id === localId)?.direccion && (
                <span className="text-xs text-slate-400">
                  📍 {locales.find(l => l.id === localId)?.direccion}
                </span>
              )}
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
      
      {/* Banner de advertencia - Caja no abierta */}
      {!cajaAbierta && errorCaja && (
        <div className="bg-red-900/30 border-b-4 border-red-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-200">⚠️ Caja no abierta</h3>
                <p className="text-red-300 mt-1">{errorCaja}</p>
                <p className="text-sm text-red-200 mt-2">
                  Para crear pedidos, primero debes abrir un turno de caja.
                </p>
              </div>
            </div>
            
            {/* Botón para abrir caja directamente desde el POS */}
            <button
              onClick={() => setShowAbrirCajaModal(true)}
              className="flex-shrink-0 inline-flex items-center space-x-2 px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              <span>Abrir Caja</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Banner de información - Caja abierta */}
      {cajaAbierta && infoCaja?.turno && (
        <div className="bg-green-900/30 border-b-4 border-green-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-green-200">✅ Caja abierta</h3>
                <div className="mt-1 space-y-1">
                  <p className="text-green-300 text-sm">
                    <span className="font-medium">Local:</span> {infoCaja.local_nombre}
                  </p>
                  <p className="text-green-300 text-sm">
                    <span className="font-medium">Operador:</span> {infoCaja.turno.vendedor_nombre}
                  </p>
                  <p className="text-green-300 text-sm">
                    <span className="font-medium">Apertura:</span> {new Date(infoCaja.turno.fecha_apertura).toLocaleString('es-CL', {
                      day: '2-digit',
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-green-300 text-sm">
                    <span className="font-medium">Monto inicial:</span> ${infoCaja.turno.monto_inicial.toLocaleString('es-CL')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Botón para ir a gestión de caja */}
            <a
              href="/admin/caja"
              className="flex-shrink-0 inline-flex items-center space-x-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Gestionar Caja</span>
            </a>
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
            cajaAbierta={cajaAbierta}
            unidadesMedida={unidadesMedida}
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
            clientes={clientes}
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
            onClienteCreado={recargarClientes}
            canalesVenta={canalesVenta}
            canalVentaId={canalVentaId}
            setCanalVentaId={setCanalVentaId}
            requiereDelivery={requiereDelivery}
            setRequiereDelivery={setRequiereDelivery}
            onCostoDeliveryCalculado={setCostoDeliveryFinal}
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

      {/* Modal: Abrir Caja directamente desde el POS */}
      {showAbrirCajaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl border border-slate-600">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Abrir Turno de Caja
              </h3>
              <button
                onClick={() => setShowAbrirCajaModal(false)}
                className="text-slate-400 hover:text-white transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAbrirCajaDirecto} className="space-y-4">
              {/* Local */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Local</label>
                <div className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-cyan-400 font-semibold">
                  🏪 {locales.find(l => l.id === localId)?.nombre ?? `Local #${localId}`}
                </div>
              </div>

              {/* Monto inicial */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Monto Inicial <span className="text-slate-500 font-normal">(efectivo en caja)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={montoInicialCaja}
                  onChange={e => setMontoInicialCaja(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                  placeholder="0"
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Observaciones <span className="text-slate-500 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={observacionesApertura}
                  onChange={e => setObservacionesApertura(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-400 resize-none"
                  placeholder="Ej: Apertura turno mañana..."
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={abriendo}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-semibold transition-colors"
                >
                  {abriendo ? 'Abriendo...' : '🔓 Abrir Caja'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAbrirCajaModal(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}