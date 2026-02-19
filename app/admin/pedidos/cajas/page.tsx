'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/auth';
import { crearCheque, type ChequeCreate } from '@/lib/api/pedidos';
import { 
  getMediosPago, 
  getBancos, 
  getEstadosCheque, 
  type MedioPago, 
  type Banco, 
  type EstadoCheque 
} from '@/lib/api/maestras';

// Tipos TypeScript simplificados
interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
}

interface ProveedorConStock {
  proveedor_id: number;
  proveedor_nombre: string;
  precio_kg: number;
  stock_cajas: number;
  peso_promedio_kg: number;
  cantidad_solicitada: number;
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

interface ProductoAgrupado {
  id: number;
  nombre: string;
  sku: string;
  proveedores: ProveedorConStock[];
}

export default function PedidoCajasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  // Datos para formularios
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [currentUser, setCurrentUser] = useState<{ local_defecto_id?: number } | null>(null);
  const [productosAgrupados, setProductosAgrupados] = useState<ProductoAgrupado[]>([]);
  
  // Estado del pedido simplificado
  const [clienteId, setClienteId] = useState<number>(0);
  const [notas, setNotas] = useState('');
  
  // Estados para medios de pago y cheques
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [estadosCheque, setEstadosCheque] = useState<EstadoCheque[]>([]);
  const [medioPagoId, setMedioPagoId] = useState<number>(0);
  const [cheques, setCheques] = useState<ChequeFormulario[]>([]);
  const [mostrarCheques, setMostrarCheques] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Detectar si el medio de pago permite cheques
  useEffect(() => {
    const medioSeleccionado = mediosPago.find(m => m.id === medioPagoId);
    setMostrarCheques(medioSeleccionado?.permite_cheque || false);
    if (!medioSeleccionado?.permite_cheque) {
      setCheques([]);
    }
  }, [medioPagoId, mediosPago]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      const headers = AuthService.getAuthHeaders();

      // Cargar perfil del usuario, clientes, precios, stock, pesos promedio y medios de pago
      const [userRes, clientesRes, preciosRes, stockRes, pesoPromedioRes, mediosData, bancosData, estadosData] = await Promise.all([
        fetch(`${API_URL}/api/auth/users/me`, { headers }),
        fetch(`${API_URL}/api/clientes/`, { headers }),
        fetch(`${API_URL}/api/precios-proveedor/`, { headers }),
        fetch(`${API_URL}/api/stock-cajas/resumen`, { headers }),
        fetch(`${API_URL}/api/stock-cajas/peso-promedio`, { headers }),
        getMediosPago(),
        getBancos(),
        getEstadosCheque()
      ]);

      if (!userRes.ok || !clientesRes.ok || !preciosRes.ok || !stockRes.ok || !pesoPromedioRes.ok) {
        throw new Error('Error al cargar datos');
      }

      const [userData, clientesData, preciosData, stockData, pesoPromedioData] = await Promise.all([
        userRes.json(),
        clientesRes.json(),
        preciosRes.json(),
        stockRes.json(),
        pesoPromedioRes.json()
      ]);

      // Combinar precios con stock y peso promedio real - AGRUPADO POR PRODUCTO
      const productosMap = new Map<number, ProductoAgrupado>();
      
      preciosData.forEach((precio: any) => {
        // Buscar stock para este producto y proveedor
        const stockInfo = stockData.productos_con_stock.find((stock: any) => 
          stock.producto_id === precio.producto_id && stock.proveedor_id === precio.proveedor_id
        );
        
        // Buscar peso promedio real para este producto y proveedor
        const pesoInfo = pesoPromedioData.find((peso: any) => 
          peso.producto_id === precio.producto_id && peso.proveedor_id === precio.proveedor_id
        );
        
        // Solo procesar si tiene stock
        if (stockInfo && stockInfo.cajas_disponibles > 0) {
          const proveedorInfo: ProveedorConStock = {
            proveedor_id: precio.proveedor_id,
            proveedor_nombre: precio.proveedor_nombre,
            precio_kg: precio.precio_kg,
            stock_cajas: stockInfo.cajas_disponibles,
            peso_promedio_kg: pesoInfo ? pesoInfo.peso_promedio_kg : 25.0,
            cantidad_solicitada: 0
          };
          
          // Si el producto ya existe, agregar el proveedor
          if (productosMap.has(precio.producto_id)) {
            const producto = productosMap.get(precio.producto_id)!;
            producto.proveedores.push(proveedorInfo);
          } else {
            // Crear nuevo producto
            const nuevoProducto: ProductoAgrupado = {
              id: precio.producto_id,
              nombre: precio.producto_nombre,
              sku: precio.producto_sku || '',
              proveedores: [proveedorInfo]
            };
            productosMap.set(precio.producto_id, nuevoProducto);
          }
        }
      });
      
      const productosAgrupadosData = Array.from(productosMap.values());

      setCurrentUser(userData);
      setClientes(clientesData);
      setProductosAgrupados(productosAgrupadosData);
      setMediosPago(mediosData);
      setBancos(bancosData);
      setEstadosCheque(estadosData);

    } catch (err) {
      alert('Error al cargar datos: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const actualizarCantidad = (productoId: number, proveedorId: number, cantidad: number) => {
    setProductosAgrupados(productos =>
      productos.map(producto => {
        if (producto.id === productoId) {
          return {
            ...producto,
            proveedores: producto.proveedores.map(proveedor => {
              if (proveedor.proveedor_id === proveedorId) {
                // No permitir cantidad mayor al stock
                const cantidadFinal = Math.min(cantidad, proveedor.stock_cajas);
                return {
                  ...proveedor,
                  cantidad_solicitada: cantidadFinal
                };
              }
              return proveedor;
            })
          };
        }
        return producto;
      })
    );
  };

  const calcularTotal = () => {
    return productosAgrupados
      .flatMap(producto => producto.proveedores)
      .filter(proveedor => proveedor.cantidad_solicitada > 0)
      .reduce((total, proveedor) => {
        // Usar el peso promedio REAL de las cajas en inventario
        return total + (proveedor.cantidad_solicitada * proveedor.peso_promedio_kg * proveedor.precio_kg);
      }, 0);
  };

  // Funciones para manejar cheques
  const agregarCheque = () => {
    const nuevoCheque: ChequeFormulario = {
      id: `cheque_${Date.now()}`,
      numero_cheque: '',
      banco_id: 0,
      monto: 0,
      fecha_vencimiento: '',
      librador_nombre: '',
      librador_rut: '',
      observaciones: ''
    };
    setCheques([...cheques, nuevoCheque]);
  };

  const eliminarCheque = (id: string) => {
    setCheques(cheques.filter(c => c.id !== id));
  };

  const actualizarCheque = (id: string, campo: keyof ChequeFormulario, valor: any) => {
    setCheques(cheques.map(c => 
      c.id === id ? { ...c, [campo]: valor } : c
    ));
  };

  const confirmarPedido = async () => {
    if (clienteId === 0) {
      alert('Debe seleccionar un cliente');
      return;
    }

    const productosConCantidad = productosAgrupados
      .flatMap(producto => 
        producto.proveedores
          .filter(proveedor => proveedor.cantidad_solicitada > 0)
          .map(proveedor => ({
            id: producto.id,
            nombre: producto.nombre,
            sku: producto.sku,
            precio_kg: proveedor.precio_kg,
            proveedor_id: proveedor.proveedor_id,
            proveedor_nombre: proveedor.proveedor_nombre,
            stock_cajas: proveedor.stock_cajas,
            peso_promedio_kg: proveedor.peso_promedio_kg,
            cantidad_solicitada: proveedor.cantidad_solicitada
          }))
      );
    
    if (productosConCantidad.length === 0) {
      alert('Debe seleccionar al menos un producto');
      return;
    }

    if (medioPagoId === 0) {
      alert('Debe seleccionar un medio de pago');
      return;
    }

    // Validar cheques si el medio los requiere
    const medioSeleccionado = mediosPago.find(m => m.id === medioPagoId);
    if (medioSeleccionado?.permite_cheque && cheques.length === 0) {
      alert('Debe agregar al menos un cheque para este medio de pago');
      return;
    }

    if (!confirm('¿Confirmar el pedido de cajas?')) {
      return;
    }

    setSaving(true);
    try {
      // Crear array de items para el pedido - formato compatible con backoffice
      const items = productosConCantidad.map(producto => ({
        sku: producto.sku,
        producto_id: producto.id,
        cantidad: producto.cantidad_solicitada, // Cantidad en cajas
        precio_unitario_venta: producto.peso_promedio_kg * producto.precio_kg // Precio por caja basado en peso promedio
      }));

      // Obtener headers de autenticación primero
      const headers = AuthService.getAuthHeaders();
      
      // Obtener datos del cliente seleccionado
      const cliente = clientes.find(c => c.id === clienteId);
      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      // Para pedidos de backoffice, usar el local WEB (Tienda Online)
      // Esto permite confirmar pedidos sin tener caja abierta
      // Buscar el local WEB del tenant actual
      const localesResponse = await fetch(`${API_URL}/api/locales/`, { headers });
      if (!localesResponse.ok) {
        throw new Error('Error al cargar locales');
      }
      const locales = await localesResponse.json();
      const localWeb = locales.find((l: any) => l.codigo === 'WEB');
      
      if (!localWeb) {
        throw new Error('No se encontró el local WEB. Contacte al administrador.');
      }

      const pedidoData = {
        cliente_id: clienteId,
        cliente_nombre: cliente.nombre,
        cliente_email: cliente.email,
        cliente_telefono: cliente.telefono || '',
        direccion_entrega: cliente.direccion || '',
        local_id: localWeb.id, // Usar local WEB en lugar de local físico
        medio_pago_id: medioPagoId,
        tipo_pedido_id: 2, // CAJAS_VARIABLES - Pedido de cajas de carne
        items: items,
        notas: notas || `Pedido de cajas variables - ${new Date().toLocaleDateString()}`
      };

      const response = await fetch(`${API_URL}/api/pedidos/backoffice`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(pedidoData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al crear pedido');
      }

      const pedidoCreado = await response.json();

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
            pedido_id: pedidoCreado.pedido_id,
            estado_id: estadoPendiente.id
          };
          
          return crearCheque(chequeData);
        });
        
        await Promise.all(promesasCheques);
      }
      alert(`✅ Pedido creado exitosamente\n\nID: ${pedidoCreado.pedido_id}\nNúmero: ${pedidoCreado.numero_pedido}\nTotal: $${pedidoCreado.monto_total?.toLocaleString('es-CL') || 0}`);
      
      // Limpiar formulario
      setClienteId(0);
      setMedioPagoId(0);
      setNotas('');
      setCheques([]);
      setProductosAgrupados(productos => 
        productos.map(producto => ({
          ...producto,
          proveedores: producto.proveedores.map(proveedor => ({
            ...proveedor,
            cantidad_solicitada: 0
          }))
        }))
      );

    } catch (err) {
      alert('Error al crear pedido: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-400">Cargando datos...</p>
        </div>
      </div>
    );
  }

  const totalPedido = calcularTotal();
  const totalCajas = productosAgrupados.flatMap(p => p.proveedores).reduce((sum, proveedor) => sum + proveedor.cantidad_solicitada, 0);
  const totalPesoReal = productosAgrupados.flatMap(p => p.proveedores).reduce((sum, proveedor) => 
    sum + (proveedor.cantidad_solicitada * proveedor.peso_promedio_kg), 0
  );

  return (
    <div className="space-y-6">
      {/* Estilos globales para ocultar flechas de inputs number */}
      <style jsx global>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">📦 Pedido de Cajas Variables</h1>
          <p className="text-gray-400 mt-2">
            Seleccione la cantidad de cajas que necesita de cada corte de carne
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded transition-colors"
        >
          ← Volver
        </button>
      </div>

      {/* Información del cliente */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">👤 Cliente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cliente *
            </label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(Number(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
            >
              <option value={0}>Seleccionar cliente...</option>
              {clientes.map(cliente => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre} - {cliente.email}
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
              className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
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
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notas del Pedido
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Notas opcionales del pedido..."
              className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Lista de productos con stock */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">🥩 Cortes Disponibles con Stock</h3>
        
        {productosAgrupados.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">No hay productos con stock y precio configurado</div>
            <p className="text-sm text-gray-500">
              Asegúrese de que haya stock disponible y precios configurados por proveedor
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {productosAgrupados.map((producto) => (
              <div key={producto.id} 
                   className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                
                {/* Cabecera del producto */}
                <div className="mb-4">
                  <h4 className="font-bold text-white text-xl mb-1">{producto.nombre}</h4>
                  <p className="text-sm text-gray-400">{producto.sku}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {producto.proveedores.length} proveedor{producto.proveedores.length !== 1 ? 'es' : ''} disponible{producto.proveedores.length !== 1 ? 's' : ''}
                  </p>
                </div>
                
                {/* Proveedores para este producto */}
                <div className="space-y-3">
                  {producto.proveedores.map((proveedor) => (
                    <div key={proveedor.proveedor_id} 
                         className="bg-slate-600 rounded-lg p-4 border border-slate-500">
                      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 items-center">
                        
                        {/* Información del proveedor */}
                        <div className="lg:col-span-2">
                          <h5 className="font-semibold text-primary text-lg">{proveedor.proveedor_nombre}</h5>
                          <p className="text-xs text-gray-400">Peso promedio: {proveedor.peso_promedio_kg.toFixed(2)} kg/caja</p>
                        </div>
                        
                        {/* Precio */}
                        <div className="text-center">
                          <div className="text-lg font-bold text-white">
                            ${proveedor.precio_kg.toLocaleString('es-CL')}
                          </div>
                          <div className="text-xs text-gray-400">por kg</div>
                        </div>
                        
                        {/* Stock disponible */}
                        <div className="text-center">
                          <div className="text-lg font-bold text-emerald-400">
                            {proveedor.stock_cajas}
                          </div>
                          <div className="text-xs text-gray-400">cajas disp.</div>
                        </div>
                        
                        {/* Controles de cantidad - TABLET FRIENDLY */}
                        <div className="lg:col-span-2">
                          <div className="flex items-center justify-center space-x-3">
                            <button
                              type="button"
                              onClick={() => actualizarCantidad(producto.id, proveedor.proveedor_id, proveedor.cantidad_solicitada - 1)}
                              className="w-12 h-12 bg-slate-500 hover:bg-slate-400 text-white rounded-lg text-2xl font-bold transition-colors"
                              disabled={proveedor.cantidad_solicitada === 0}
                            >
                              -
                            </button>
                            
                            <div className="text-center min-w-[60px]">
                              <div className="text-2xl font-bold text-white">{proveedor.cantidad_solicitada}</div>
                              <div className="text-xs text-gray-400">cajas</div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => actualizarCantidad(producto.id, proveedor.proveedor_id, proveedor.cantidad_solicitada + 1)}
                              className="w-12 h-12 bg-primary hover:bg-primary/80 text-white rounded-lg text-2xl font-bold transition-colors"
                              disabled={proveedor.cantidad_solicitada >= proveedor.stock_cajas}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        
                        {/* Precio estimado */}
                        <div className="text-center">
                          {proveedor.cantidad_solicitada > 0 ? (
                            <div>
                              <div className="text-lg font-bold text-yellow-400">
                                ${(proveedor.cantidad_solicitada * proveedor.peso_promedio_kg * proveedor.precio_kg).toLocaleString('es-CL')}
                              </div>
                              <div className="text-xs text-gray-400">
                                ({(proveedor.cantidad_solicitada * proveedor.peso_promedio_kg).toFixed(1)} kg est.)
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">-</div>
                          )}
                        </div>
                        
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección de cheques (si el medio de pago lo permite) */}
      {mostrarCheques && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">💳 Cheques</h3>
            <button
              type="button"
              onClick={agregarCheque}
              className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg transition-colors"
            >
              + Agregar Cheque
            </button>
          </div>

          {cheques.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">⚠️ Debe agregar al menos un cheque para este medio de pago</div>
              <button
                type="button"
                onClick={agregarCheque}
                className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Agregar Primer Cheque
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cheques.map((cheque, index) => (
                <div key={cheque.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-white">Cheque #{index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => eliminarCheque(cheque.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Número de Cheque *</label>
                      <input
                        type="text"
                        value={cheque.numero_cheque}
                        onChange={(e) => actualizarCheque(cheque.id, 'numero_cheque', e.target.value)}
                        placeholder="Número del cheque"
                        className="w-full bg-slate-600 border border-slate-500 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Banco *</label>
                      <select
                        value={cheque.banco_id}
                        onChange={(e) => actualizarCheque(cheque.id, 'banco_id', Number(e.target.value))}
                        className="w-full bg-slate-600 border border-slate-500 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                        required
                      >
                        <option value={0}>Seleccionar banco...</option>
                        {bancos.map(banco => (
                          <option key={banco.id} value={banco.id}>{banco.nombre}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Monto *</label>
                      <input
                        type="number"
                        min="0"
                        value={cheque.monto}
                        onChange={(e) => actualizarCheque(cheque.id, 'monto', Number(e.target.value))}
                        placeholder="0"
                        className="w-full bg-slate-600 border border-slate-500 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Fecha Vencimiento *</label>
                      <input
                        type="date"
                        value={cheque.fecha_vencimiento}
                        onChange={(e) => actualizarCheque(cheque.id, 'fecha_vencimiento', e.target.value)}
                        className="w-full bg-slate-600 border border-slate-500 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Librador *</label>
                      <input
                        type="text"
                        value={cheque.librador_nombre}
                        onChange={(e) => actualizarCheque(cheque.id, 'librador_nombre', e.target.value)}
                        placeholder="Nombre del librador"
                        className="w-full bg-slate-600 border border-slate-500 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">RUT Librador</label>
                      <input
                        type="text"
                        value={cheque.librador_rut}
                        onChange={(e) => actualizarCheque(cheque.id, 'librador_rut', e.target.value)}
                        placeholder="12345678-9"
                        className="w-full bg-slate-600 border border-slate-500 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm text-gray-300 mb-1">Observaciones</label>
                    <textarea
                      value={cheque.observaciones}
                      onChange={(e) => actualizarCheque(cheque.id, 'observaciones', e.target.value)}
                      placeholder="Observaciones adicionales..."
                      rows={2}
                      className="w-full bg-slate-600 border border-slate-500 text-white rounded px-3 py-2 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resumen del pedido */}
      {totalCajas > 0 && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">📋 Resumen del Pedido</h3>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{totalCajas}</div>
              <div className="text-sm text-gray-400">Total Cajas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{totalPesoReal.toFixed(1)} kg</div>
              <div className="text-sm text-gray-400">Peso Real</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">${totalPedido.toLocaleString('es-CL')}</div>
              <div className="text-sm text-gray-400">Total Estimado</div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={() => {
                setProductosAgrupados(productos => 
                  productos.map(p => ({ ...p, cantidad_solicitada: 0 }))
                );
              }}
              className="bg-slate-600 hover:bg-slate-500 text-white px-8 py-3 rounded-lg transition-colors font-medium text-base"
            >
              🗑️ Vaciar Carrito
            </button>
            <button
              onClick={confirmarPedido}
              disabled={saving || clienteId === 0}
              className="bg-primary hover:bg-primary-dark disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 font-bold px-10 py-3 rounded-lg transition-colors text-base"
            >
              {saving ? '⏳ Procesando...' : '✅ Confirmar Pedido'}
            </button>
          </div>
        </div>
      )}

      {/* Nota informativa */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-400">ℹ️</div>
          <div>
            <h4 className="text-sm font-medium text-blue-400 mb-1">Información Importante</h4>
            <p className="text-xs text-blue-300">
              • Los precios y pesos mostrados son REALES basados en el peso promedio de las cajas en inventario<br/>
              • Al confirmar el pedido, se asignarán automáticamente las cajas con fecha de vencimiento más próxima<br/>
              • El peso final será el peso real de las cajas asignadas (puede variar ligeramente del promedio)<br/>
              • El stock se descontará automáticamente una vez confirmado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}