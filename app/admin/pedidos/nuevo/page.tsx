'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  crearPedido, 
  crearCheque, 
  type PedidoCreate, 
  type ChequeCreate, 
  type ItemPedidoCreate 
} from '@/lib/api/pedidos';
import { getClientes, type Cliente } from '@/lib/api/clientes';
import { getProductos, type Producto } from '@/lib/api/productos';
import { getLocales, type Local } from '@/lib/api/locales';
import { 
  getMediosPago, 
  getBancos, 
  getEstadosCheque, 
  type MedioPago, 
  type Banco, 
  type EstadoCheque 
} from '@/lib/api/maestras';
import { getStockProductoLocal } from '@/lib/api/inventario';
import { getPrecioProductoLocal } from '@/lib/api/precios';

interface ItemFormulario {
  id: string;
  producto_id: number;
  sku: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  stock_disponible?: number;
  subtotal: number;
}

interface ChequeFormulario {
  id: string;
  numero_cheque: string;
  banco_id: number;
  monto: number;
  fecha_vencimiento: string;
  librador_nombre: string;
  librador_rut: string;
  observaciones: string;
}

export default function NuevoPedidoPage() {
  const router = useRouter();
  
  // Estados de datos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [estadosCheque, setEstadosCheque] = useState<EstadoCheque[]>([]);
  
  // Estado del formulario
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Datos del pedido
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [localId, setLocalId] = useState<number>(0);
  const [medioPagoId, setMedioPagoId] = useState<number>(0);
  const [notas, setNotas] = useState('');
  
  // Estados para sistema de puntos
  const [puntosDisponibles, setPuntosDisponibles] = useState<number>(0);
  const [puntosAUsar, setPuntosAUsar] = useState<number>(0);
  const [mostrarSeccionPuntos, setMostrarSeccionPuntos] = useState<boolean>(false);
  
  // Items del pedido
  const [items, setItems] = useState<ItemFormulario[]>([]);
  
  // Cheques (solo si el medio de pago permite)
  const [cheques, setCheques] = useState<ChequeFormulario[]>([]);
  const [mostrarCheques, setMostrarCheques] = useState(false);
  
  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const [
          clientesData,
          productosData,
          localesData,
          mediosData,
          bancosData,
          estadosData
        ] = await Promise.all([
          getClientes(),
          getProductos(),
          getLocales(),
          getMediosPago(),
          getBancos(),
          getEstadosCheque()
        ]);
        
        setClientes(clientesData);
        setProductos(productosData.filter(p => p.es_vendible && p.activo));
        setLocales(localesData.filter(l => l.activo));
        setMediosPago(mediosData.filter(m => m.activo));
        setBancos(bancosData.filter(b => b.activo));
        setEstadosCheque(estadosData);
        
        // Seleccionar local WEB por defecto
        const localWeb = localesData.find(l => l.codigo === 'WEB');
        if (localWeb) {
          setLocalId(localWeb.id);
        }
      } catch (err) {
        setError('Error al cargar datos iniciales');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, []);
  
  // Detectar si el medio de pago permite cheques
  useEffect(() => {
    const medioPago = mediosPago.find(m => m.id === medioPagoId);
    setMostrarCheques(medioPago?.permite_cheque || false);
    if (!medioPago?.permite_cheque) {
      setCheques([]);
    }
  }, [medioPagoId, mediosPago]);
  
  // Funciones para manejar items
  const agregarItem = () => {
    const nuevoItem: ItemFormulario = {
      id: Date.now().toString(),
      producto_id: 0,
      sku: '',
      nombre: '',
      cantidad: 1,
      precio_unitario: 0,
      stock_disponible: undefined,
      subtotal: 0
    };
    setItems([...items, nuevoItem]);
  };
  
  const actualizarItem = async (id: string, campo: string, valor: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const itemActualizado = { ...item, [campo]: valor };
        
        // Calcular subtotal
        itemActualizado.subtotal = itemActualizado.cantidad * itemActualizado.precio_unitario;
        
        return itemActualizado;
      }
      return item;
    }));

    // Si se cambió el producto, obtener stock y precio del local seleccionado
    if (campo === 'producto_id' && valor > 0 && localId) {
      const producto = productos.find(p => p.id === valor);
      if (producto) {
        try {
          const [stock, precio] = await Promise.all([
            getStockProductoLocal(valor, localId as number),
            getPrecioProductoLocal(valor, localId as number)
          ]);
          
          setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
              return {
                ...item,
                sku: producto.sku,
                nombre: producto.nombre,
                stock_disponible: stock,
                precio_unitario: precio,
                subtotal: item.cantidad * precio
              };
            }
            return item;
          }));
        } catch (error) {
          console.warn('Error obteniendo stock/precio:', error);
          // Solo actualizar SKU y nombre si hay error
          setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
              return {
                ...item,
                sku: producto.sku,
                nombre: producto.nombre,
                stock_disponible: 0,
                precio_unitario: 0,
                subtotal: 0
              };
            }
            return item;
          }));
        }
      }
    }
  };

  // Efecto para actualizar stock y precios cuando cambie el local
  useEffect(() => {
    if (localId && items.length > 0) {
      const actualizarStockYPrecios = async () => {
        const itemsActualizados = await Promise.all(
          items.map(async (item) => {
            if (item.producto_id > 0) {
              try {
                const [stock, precio] = await Promise.all([
                  getStockProductoLocal(item.producto_id, localId as number),
                  getPrecioProductoLocal(item.producto_id, localId as number)
                ]);
                
                return {
                  ...item,
                  stock_disponible: stock,
                  precio_unitario: precio,
                  subtotal: item.cantidad * precio
                };
              } catch (error) {
                return { ...item, stock_disponible: 0, precio_unitario: 0, subtotal: 0 };
              }
            }
            return item;
          })
        );
        setItems(itemsActualizados);
      };
      
      actualizarStockYPrecios();
    }
  }, [localId]);
  
  const eliminarItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };
  
  // Funciones para manejar cheques
  const agregarCheque = () => {
    // Calcular monto faltante
    const totalPedido = calcularTotal();
    const totalCheques = cheques.reduce((sum, c) => sum + c.monto, 0);
    const montoFaltante = Math.max(0, totalPedido - totalCheques);
    
    const nuevoCheque: ChequeFormulario = {
      id: Date.now().toString(),
      numero_cheque: '',
      banco_id: 0,
      monto: montoFaltante, // Auto-completar con monto faltante
      fecha_vencimiento: '',
      librador_nombre: clienteSeleccionado?.nombre || '',
      librador_rut: '',
      observaciones: ''
    };
    setCheques([...cheques, nuevoCheque]);
  };
  
  const actualizarCheque = (id: string, campo: string, valor: any) => {
    setCheques(cheques.map(cheque => 
      cheque.id === id ? { ...cheque, [campo]: valor } : cheque
    ));
  };
  
  const eliminarCheque = (id: string) => {
    setCheques(cheques.filter(cheque => cheque.id !== id));
  };
  
  // Calcular subtotal antes de descuento
  const calcularSubtotal = () => {
    return items.reduce((total, item) => {
      return total + item.subtotal;
    }, 0);
  };
  
  // Calcular descuento por puntos
  const calcularDescuentoPuntos = () => {
    return puntosAUsar; // $1 por punto
  };
  
  // Calcular puntos ganados estimados por esta compra
  const calcularPuntosGanados = () => {
    let totalPuntos = 0;
    
    for (const item of items) {
      if (item.producto_id > 0) {
        const producto = productos.find(p => p.id === item.producto_id);
        if (producto && producto.categoria_puntos_fidelidad) {
          // Puntos por categoría × cantidad comprada
          totalPuntos += producto.categoria_puntos_fidelidad * item.cantidad;
        }
      }
    }
    
    return totalPuntos;
  };
  
  // Calcular total final
  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    const descuento = calcularDescuentoPuntos();
    return Math.max(0, subtotal - descuento);
  };
  
  // Validar formulario
  const validarFormulario = () => {
    if (!clienteSeleccionado) {
      throw new Error('Debe seleccionar un cliente');
    }
    
    if (localId === 0) {
      throw new Error('Debe seleccionar un local');
    }
    
    if (medioPagoId === 0) {
      throw new Error('Debe seleccionar un medio de pago');
    }
    
    if (items.length === 0) {
      throw new Error('Debe agregar al menos un item');
    }
    
    for (const item of items) {
      if (item.producto_id === 0) {
        throw new Error('Todos los items deben tener un producto seleccionado');
      }
      if (item.cantidad <= 0) {
        throw new Error('Todos los items deben tener cantidad mayor a 0');
      }
      if (item.precio_unitario <= 0) {
        throw new Error('Todos los items deben tener precio mayor a 0');
      }
    }
    
    // Validaciones para puntos
    if (puntosAUsar > 0) {
      if (puntosAUsar > puntosDisponibles) {
        throw new Error(`Solo puede usar hasta ${puntosDisponibles} puntos disponibles`);
      }
      
      const subtotal = calcularSubtotal();
      if (puntosAUsar > subtotal) {
        throw new Error(`No puede usar más puntos que el subtotal del pedido ($${subtotal.toLocaleString('es-CL')})`);
      }
    }
    
    // Validaciones específicas para cheques
    if (mostrarCheques) {
      // Si el medio de pago permite cheques, debe haber al menos uno
      if (cheques.length === 0) {
        throw new Error('Debe agregar al menos un cheque para este medio de pago');
      }
      
      const totalCheques = cheques.reduce((sum, c) => sum + c.monto, 0);
      const total = calcularTotal();
      
      // La suma de cheques debe igualar al total del pedido
      if (Math.abs(totalCheques - total) > 0.01) {
        throw new Error(`La suma de los cheques ($${totalCheques.toLocaleString('es-CL')}) debe ser igual al total del pedido ($${total.toLocaleString('es-CL')})`);
      }
      
      // Validar cada cheque individualmente
      for (const cheque of cheques) {
        if (!cheque.numero_cheque.trim()) {
          throw new Error('Todos los cheques deben tener número');
        }
        if (cheque.banco_id === 0) {
          throw new Error('Todos los cheques deben tener banco seleccionado');
        }
        if (cheque.monto <= 0) {
          throw new Error('Todos los cheques deben tener monto mayor a 0');
        }
        if (!cheque.fecha_vencimiento) {
          throw new Error('Todos los cheques deben tener fecha de vencimiento');
        }
        if (!cheque.librador_nombre.trim()) {
          throw new Error('Todos los cheques deben tener nombre del librador');
        }
      }
    }
  };
  
  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Validar formulario
      validarFormulario();
      
      // Preparar datos del pedido
      const itemsPedido: ItemPedidoCreate[] = items.map(item => ({
        sku: item.sku,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario_venta: item.precio_unitario
      }));
      
      const pedidoData: PedidoCreate = {
        cliente_id: clienteSeleccionado!.id,
        cliente_nombre: clienteSeleccionado!.nombre,
        cliente_email: clienteSeleccionado!.email || '',
        cliente_telefono: clienteSeleccionado!.telefono || '',
        direccion_entrega: clienteSeleccionado!.direccion || '',
        local_id: localId,
        medio_pago_id: medioPagoId,
        notas: notas.trim() || undefined,
        items: itemsPedido,
        puntos_usar: puntosAUsar > 0 ? puntosAUsar : undefined
      };
      
      // Crear pedido
      const response = await crearPedido(pedidoData);
      
      // Si hay cheques, crearlos
      if (mostrarCheques && cheques.length > 0) {
        const estadoPendiente = estadosCheque.find(e => e.codigo === 'PENDIENTE');
        if (!estadoPendiente) {
          throw new Error('No se encontró el estado PENDIENTE para cheques');
        }
        
        const promesasCheques = cheques.map(cheque => {
          const chequeData: ChequeCreate & { pedido_id: number, estado_id: number } = {
            numero_cheque: cheque.numero_cheque,
            banco_id: cheque.banco_id,
            monto: cheque.monto,
            fecha_emision: new Date().toISOString(),
            fecha_vencimiento: new Date(cheque.fecha_vencimiento).toISOString(),
            librador_nombre: cheque.librador_nombre,
            librador_rut: cheque.librador_rut || undefined,
            observaciones: cheque.observaciones || undefined,
            pedido_id: response.pedido_id,
            estado_id: estadoPendiente.id
          };
          
          return crearCheque(chequeData);
        });
        
        await Promise.all(promesasCheques);
      }
      
      setSuccess(`Pedido ${response.numero_pedido} creado exitosamente`);
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        router.push('/admin/pedidos');
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Error al crear el pedido');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && clientes.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Nuevo Pedido</h1>
        <Link 
          href="/admin/pedidos"
          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          ← Volver
        </Link>
      </div>
      
      {/* Mensajes */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Información del Pedido</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cliente *
              </label>
              <select
                value={clienteSeleccionado?.id || ''}
                onChange={(e) => {
                  const cliente = clientes.find(c => c.id === Number(e.target.value));
                  setClienteSeleccionado(cliente || null);
                  
                  // Cargar información de puntos del cliente
                  if (cliente && cliente.puntos_disponibles !== undefined) {
                    setPuntosDisponibles(cliente.puntos_disponibles);
                    setMostrarSeccionPuntos(cliente.puntos_disponibles > 0);
                  } else {
                    setPuntosDisponibles(0);
                    setMostrarSeccionPuntos(false);
                  }
                  
                  // Resetear puntos a usar
                  setPuntosAUsar(0);
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary"
                required
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre} - {cliente.email}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Local */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Local *
              </label>
              <select
                value={localId}
                onChange={(e) => setLocalId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary"
                required
              >
                <option value={0}>Seleccionar local...</option>
                {locales.map(local => (
                  <option key={local.id} value={local.id}>
                    {local.nombre}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Medio de pago */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Medio de Pago *
              </label>
              <select
                value={medioPagoId}
                onChange={(e) => setMedioPagoId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary"
                required
              >
                <option value={0}>Seleccionar medio de pago...</option>
                {mediosPago.map(medio => (
                  <option key={medio.id} value={medio.id}>
                    {medio.nombre} {medio.permite_cheque && '(Permite cheques)'}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notas
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary"
                rows={3}
                placeholder="Notas adicionales del pedido..."
              />
            </div>
          </div>
        </div>
        
        {/* Sección de Puntos */}
        {mostrarSeccionPuntos && clienteSeleccionado && (
          <div className="bg-slate-800 rounded-lg p-6 border border-yellow-500/30">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              💰 Sistema de Puntos
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Puntos Disponibles</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {puntosDisponibles} pts
                </p>
                <p className="text-xs text-gray-500">
                  Valor: ${puntosDisponibles.toLocaleString('es-CL')}
                </p>
              </div>
              
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Puntos a Ganar</p>
                <p className="text-2xl font-bold text-green-400">
                  +{calcularPuntosGanados()} pts
                </p>
                <p className="text-xs text-gray-500">
                  Con esta compra
                </p>
              </div>
              
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Descuento Aplicado</p>
                <p className="text-2xl font-bold text-red-400">
                  -${calcularDescuentoPuntos().toLocaleString('es-CL')}
                </p>
                <p className="text-xs text-gray-500">
                  {puntosAUsar} puntos canjeados
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ¿Cuántos puntos desea canjear?
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max={Math.min(puntosDisponibles, calcularSubtotal())}
                    value={puntosAUsar}
                    onChange={(e) => {
                      const valor = Math.max(0, Math.min(
                        Number(e.target.value) || 0, 
                        puntosDisponibles,
                        calcularSubtotal()
                      ));
                      setPuntosAUsar(valor);
                    }}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => setPuntosAUsar(Math.min(puntosDisponibles, calcularSubtotal()))}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors"
                  >
                    Usar Máximo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPuntosAUsar(0)}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                  >
                    No Usar
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Máximo: {Math.min(puntosDisponibles, calcularSubtotal())} puntos 
                  (limitado por puntos disponibles o subtotal del pedido)
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Items del pedido */}
        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Items del Pedido</h2>
            <button
              type="button"
              onClick={agregarItem}
              className="bg-primary hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              + Agregar Item
            </button>
          </div>
          
          {items.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No hay items agregados</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-slate-700 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    {/* Producto */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Producto *
                      </label>
                      <select
                        value={item.producto_id}
                        onChange={(e) => actualizarItem(item.id, 'producto_id', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-primary"
                        required
                      >
                        <option value={0}>Seleccionar producto...</option>
                        {productos.map(producto => (
                          <option key={producto.id} value={producto.id}>
                            {producto.nombre} ({producto.sku})
                          </option>
                        ))}
                      </select>
                      {/* Mostrar stock disponible */}
                      {item.stock_disponible !== undefined && (
                        <div className={`mt-1 text-xs ${
                          item.stock_disponible > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          Stock: {item.stock_disponible} disponibles
                          {item.cantidad > item.stock_disponible && item.stock_disponible > 0 && (
                            <span className="text-red-400 ml-2">⚠️ Supera stock</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Cantidad */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Cantidad *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={item.stock_disponible || undefined}
                        value={item.cantidad}
                        onChange={(e) => actualizarItem(item.id, 'cantidad', Number(e.target.value))}
                        className={`w-full px-3 py-2 bg-slate-600 border rounded-lg text-white focus:outline-none focus:border-primary ${
                          item.stock_disponible && item.cantidad > item.stock_disponible 
                            ? 'border-red-500' 
                            : 'border-slate-500'
                        }`}
                        required
                      />
                    </div>
                    
                    {/* Precio */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Precio Unitario *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precio_unitario}
                        onChange={(e) => actualizarItem(item.id, 'precio_unitario', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    
                    {/* Subtotal */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Subtotal
                      </label>
                      <div className="w-full px-3 py-2 bg-slate-600 rounded-lg text-white font-semibold">
                        ${item.subtotal.toLocaleString('es-CL')}
                      </div>
                    </div>
                    
                    {/* Eliminar */}
                    <div>
                      <button
                        type="button"
                        onClick={() => eliminarItem(item.id)}
                        className="w-full bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  
                  {/* Subtotal */}
                  <div className="mt-3 text-right">
                    <span className="text-gray-300">
                      Subtotal: <span className="font-semibold text-white">
                        ${(item.cantidad * item.precio_unitario).toLocaleString('es-CL')}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Total general */}
              <div className="bg-slate-900 p-4 rounded-lg">
                <div className="text-right">
                  <span className="text-xl font-bold text-white">
                    Total: ${calcularTotal().toLocaleString('es-CL')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Cheques (solo si el medio de pago permite) */}
        {mostrarCheques && (
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Cheques</h2>
              <button
                type="button"
                onClick={agregarCheque}
                className="bg-primary hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                + Agregar Cheque
              </button>
            </div>
            
            {cheques.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No hay cheques agregados</p>
            ) : (
              <div className="space-y-4">
                {cheques.map((cheque) => (
                  <div key={cheque.id} className="bg-slate-700 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Primera fila */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Número de Cheque *
                        </label>
                        <input
                          type="text"
                          value={cheque.numero_cheque}
                          onChange={(e) => actualizarCheque(cheque.id, 'numero_cheque', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-primary"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Banco *
                        </label>
                        <select
                          value={cheque.banco_id}
                          onChange={(e) => actualizarCheque(cheque.id, 'banco_id', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-primary"
                          required
                        >
                          <option value={0}>Seleccionar banco...</option>
                          {bancos.map(banco => (
                            <option key={banco.id} value={banco.id}>
                              {banco.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Monto *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cheque.monto}
                          onChange={(e) => actualizarCheque(cheque.id, 'monto', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-primary"
                          required
                        />
                      </div>
                      
                      {/* Segunda fila */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Fecha de Vencimiento *
                        </label>
                        <input
                          type="date"
                          value={cheque.fecha_vencimiento}
                          onChange={(e) => actualizarCheque(cheque.id, 'fecha_vencimiento', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-primary"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Librador *
                        </label>
                        <input
                          type="text"
                          value={cheque.librador_nombre}
                          onChange={(e) => actualizarCheque(cheque.id, 'librador_nombre', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-primary"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          RUT Librador
                        </label>
                        <input
                          type="text"
                          value={cheque.librador_rut}
                          onChange={(e) => actualizarCheque(cheque.id, 'librador_rut', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-primary"
                          placeholder="11.111.111-1"
                        />
                      </div>
                      
                      {/* Observaciones y eliminar */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Observaciones
                        </label>
                        <input
                          type="text"
                          value={cheque.observaciones}
                          onChange={(e) => actualizarCheque(cheque.id, 'observaciones', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-primary"
                          placeholder="Observaciones adicionales..."
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => eliminarCheque(cheque.id)}
                          className="w-full bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Resumen de cheques */}
                <div className="bg-slate-900 p-4 rounded-lg">
                  {cheques.length === 0 ? (
                    <p className="text-red-400 text-center">
                      ⚠️ Debe agregar al menos un cheque para este medio de pago
                    </p>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-white">
                        <span>Total Cheques: ${cheques.reduce((sum, c) => sum + c.monto, 0).toLocaleString('es-CL')}</span>
                        <span>Total Pedido: ${calcularTotal().toLocaleString('es-CL')}</span>
                      </div>
                      {Math.abs(cheques.reduce((sum, c) => sum + c.monto, 0) - calcularTotal()) > 0.01 ? (
                        <p className="text-red-400 text-sm mt-2">
                          ⚠️ Los montos no coinciden. Diferencia: ${Math.abs(cheques.reduce((sum, c) => sum + c.monto, 0) - calcularTotal()).toLocaleString('es-CL')}
                        </p>
                      ) : (
                        <p className="text-green-400 text-sm mt-2">
                          ✅ Los montos coinciden
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Resumen del Pedido */}
        {items.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6 border border-primary/30">
            <h2 className="text-xl font-semibold text-white mb-4">📋 Resumen del Pedido</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información del Cliente */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-white mb-2">Cliente</h3>
                {clienteSeleccionado && (
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                    <p className="text-white font-semibold">{clienteSeleccionado.nombre}</p>
                    <p className="text-gray-400 text-sm">{clienteSeleccionado.email}</p>
                    <div className="pt-2 border-t border-slate-600">
                      <p className="text-gray-400 text-sm">Puntos actuales: {puntosDisponibles}</p>
                      <p className="text-gray-400 text-sm">Puntos a ganar: +{calcularPuntosGanados()}</p>
                      {puntosAUsar > 0 && (
                        <p className="text-yellow-400 text-sm">Puntos a canjear: -{puntosAUsar}</p>
                      )}
                      <p className="text-green-400 text-sm">
                        Puntos después: {puntosDisponibles - puntosAUsar + calcularPuntosGanados()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Desglose de Precios */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-white mb-2">Desglose</h3>
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subtotal:</span>
                    <span className="text-white">${calcularSubtotal().toLocaleString('es-CL')}</span>
                  </div>
                  
                  {puntosAUsar > 0 && (
                    <div className="flex justify-between text-yellow-400">
                      <span>Descuento puntos ({puntosAUsar} pts):</span>
                      <span>-${calcularDescuentoPuntos().toLocaleString('es-CL')}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-slate-600 pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-white">Total:</span>
                      <span className="text-primary">${calcularTotal().toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                  
                  {puntosAUsar > 0 && (
                    <div className="text-green-400 text-sm text-center mt-2">
                      💰 Ahorro: ${calcularDescuentoPuntos().toLocaleString('es-CL')} por canje de puntos
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Botones */}
        <div className="flex justify-end gap-4">
          <Link
            href="/admin/pedidos"
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || items.length === 0}
            className="px-6 py-2 bg-primary hover:bg-teal-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando...' : 'Crear Pedido'}
          </button>
        </div>
      </form>
    </div>
  );
}