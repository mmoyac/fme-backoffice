'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerPedido, actualizarPedido, Pedido, descargarBoleta } from '@/lib/api/pedidos';
import { descargarFactura } from '@/lib/api/facturas';
import { obtenerNotaCreditoPorPedido, NotaCredito } from '@/lib/api/notas_credito';
import { crearDevolucion, obtenerDevolucionesPedido, Devolucion } from '@/lib/api/devoluciones';
import { obtenerPreventa, PreventaOut, ItemPreventaOut } from '@/lib/api/preventa';
import { getLocales, Local } from '@/lib/api/locales';
import { getInventarios, Inventario } from '@/lib/api/inventario';
import { obtenerPedidoConCheques, actualizarCheque, obtenerEstadosCheque, PedidoConCheques, Cheque, EstadoCheque } from '@/lib/api/cheques';
import { getMediosPago, MedioPago } from '@/lib/api/maestras';
import { AuthService } from '@/lib/auth';

export default function DetallePedidoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [locales, setLocales] = useState<Local[]>([]);
  const [inventarios, setInventarios] = useState<Inventario[]>([]);
  const [localSeleccionado, setLocalSeleccionado] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [notasAdmin, setNotasAdmin] = useState('');
  const [mostrarSelectorLocal, setMostrarSelectorLocal] = useState(false);
  
  // Estados para medios de pago
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
  const [medioPagoSeleccionado, setMedioPagoSeleccionado] = useState<number | null>(null);
  const [guardandoMedioPago, setGuardandoMedioPago] = useState(false);

  // Estados para cheques
  const [pedidoConCheques, setPedidoConCheques] = useState<PedidoConCheques | null>(null);
  const [estadosCheque, setEstadosCheque] = useState<EstadoCheque[]>([]);
  const [actualizandoCheque, setActualizandoCheque] = useState<number | null>(null);
  const [generandoBoleta, setGenerandoBoleta] = useState(false);
  const [generandoFactura, setGenerandoFactura] = useState(false);
  const [notaCredito, setNotaCredito] = useState<NotaCredito | null>(null);
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [mostrarModalDevolucion, setMostrarModalDevolucion] = useState(false);
  const [devolucionItems, setDevolucionItems] = useState<Record<number, number>>({});
  const [devolucionLocalDestino, setDevolucionLocalDestino] = useState<number | null>(null);
  const [devolucionMotivo, setDevolucionMotivo] = useState('');
  const [registrandoDevolucion, setRegistrandoDevolucion] = useState(false);
  const [errorDevolucion, setErrorDevolucion] = useState('');

  // Estados para confirmación de cajas variables
  const [mostrarConfirmacionCajas, setMostrarConfirmacionCajas] = useState(false);
  const [cajasDisponibles, setCajasDisponibles] = useState<any[]>([]);
  const [cargandoCajas, setCargandoCajas] = useState(false);

  // Datos reales de preventa (asignaciones con peso/precio_kg)
  const [preventaData, setPreventaData] = useState<PreventaOut | null>(null);

  const estados = [
    { value: 'PENDIENTE', label: 'Pendiente', color: 'bg-yellow-500' },
    { value: 'CONFIRMADO', label: 'Confirmado', color: 'bg-blue-500' },
    { value: 'EN_PREPARACION', label: 'En Preparación', color: 'bg-purple-500' },
    { value: 'ENTREGADO', label: 'Entregado', color: 'bg-green-500' },
    { value: 'CANCELADO', label: 'Cancelado', color: 'bg-red-500' },
  ];

  useEffect(() => {
    cargarPedido();
    cargarLocales();
    cargarInventarios();
    cargarEstadosCheque();
    cargarMediosPago();
  }, [params.id]);

  const cargarEstadosCheque = async () => {
    try {
      const data = await obtenerEstadosCheque();
      setEstadosCheque(data);
    } catch (err) {
      console.error('Error al cargar estados de cheque:', err);
    }
  };
  
  const cargarMediosPago = async () => {
    try {
      const data = await getMediosPago();
      setMediosPago(data.filter(m => m.activo));
    } catch (err) {
      console.error('Error al cargar medios de pago:', err);
    }
  };

  const cargarCheques = async () => {
    try {
      const data = await obtenerPedidoConCheques(Number(params.id));
      setPedidoConCheques(data);
    } catch (err) {
      console.error('Error al cargar cheques:', err);
    }
  };

  const cargarInventarios = async () => {
    try {
      const data = await getInventarios();
      setInventarios(data);
    } catch (err) {
      console.error('Error al cargar inventarios:', err);
    }
  };

  const cargarLocales = async () => {
    try {
      const data = await getLocales();
      // Filtrar solo locales físicos (excluir Tienda Online)
      const localesFisicos = data.filter(local => local.codigo !== 'WEB');
      setLocales(localesFisicos);
    } catch (err) {
      console.error('Error al cargar locales:', err);
    }
  };

  const obtenerCajasParaPedido = async () => {
    if (!pedido || !pedido.items) return [];

    setCargandoCajas(true);
    try {
      const token = AuthService.getToken();
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // Si el pedido está PENDIENTE, obtener los lotes YA ASIGNADOS
      if (pedido.estado === 'PENDIENTE') {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/stock-cajas/lotes-asignados-pedido/${pedido.id}`,
            { headers }
          );

          if (response.ok) {
            const data = await response.json();
            
            if (data.tiene_lotes_asignados && data.items.length > 0) {
              // Formatear lotes asignados para el modal
              const cajasPorItem = data.items.map((item: any) => ({
                producto: item.producto_nombre,
                cantidad_requerida: item.lotes.length,
                lotes_disponibles: item.lotes.length,
                lotes_especificos: item.lotes.map((lote: any) => ({
                  codigo_lote: lote.lote_codigo,
                  peso_kg: lote.peso_kg,
                  precio_kg: lote.precio_kg,
                  precio_total: lote.precio_total,
                  fecha_vencimiento: lote.fecha_vencimiento,
                  proveedor_nombre: item.proveedor_nombre,
                  estado: lote.vendido ? 'Vendido' : (lote.disponible_venta ? 'Disponible' : 'Reservado')
                })),
                proveedor: item.proveedor_nombre,
                precio_estimado: item.lotes.reduce((sum: number, l: any) => sum + l.precio_total, 0),
                precio_real: item.lotes.reduce((sum: number, l: any) => sum + l.precio_total, 0)
              }));

              (cajasPorItem as any).totalPrecioEstimado = data.total_precio;
              (cajasPorItem as any).totalPrecioReal = data.total_precio;
              (cajasPorItem as any).diferenciaPrecio = 0; // Ya están asignados
              (cajasPorItem as any).lotesYaAsignados = true;

              return cajasPorItem;
            }
          }
        } catch (error) {
          console.error('Error al obtener lotes asignados:', error);
        }
      }

      // Si no está PENDIENTE o no tiene lotes asignados, buscar lotes disponibles (flujo original)
      const cajasPorItem = [];
      let totalPrecioEstimado = 0;
      let totalPrecioReal = 0;

      for (const item of pedido.items) {
        const precioEstimadoItem = item.precio_unitario_venta * item.cantidad;
        totalPrecioEstimado += precioEstimadoItem;

        try {
          // Llamar al endpoint de lotes específicos disponibles
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/stock-cajas/lotes-disponibles/${item.producto_id}?cantidad_requerida=${item.cantidad}`,
            { headers }
          );

          if (response.ok) {
            const lotesData = await response.json();
            console.log(`Datos de lotes para producto ${item.producto_id}:`, lotesData);

            // Validar que la respuesta tenga los datos esperados
            if (lotesData.lotes && lotesData.lotes.length > 0) {
              const precioRealItem = lotesData.lotes.reduce((total: number, lote: any) => total + lote.precio_total, 0);
              totalPrecioReal += precioRealItem;

              cajasPorItem.push({
                producto: item.producto?.nombre || `Producto ID ${item.producto_id}`,
                cantidad_requerida: item.cantidad,
                lotes_disponibles: lotesData.cajas_disponibles,
                lotes_especificos: lotesData.lotes,
                proveedor: lotesData.lotes[0]?.proveedor_nombre || 'Sin proveedor',
                precio_estimado: precioEstimadoItem,
                precio_real: precioRealItem
              });
            } else if (lotesData.error) {
              cajasPorItem.push({
                producto: item.producto?.nombre || `Producto ID ${item.producto_id}`,
                cantidad_requerida: item.cantidad,
                error: lotesData.error,
                precio_estimado: precioEstimadoItem,
                precio_real: 0
              });
            } else {
              cajasPorItem.push({
                producto: item.producto?.nombre || `Producto ID ${item.producto_id}`,
                cantidad_requerida: item.cantidad,
                error: 'No hay lotes disponibles para este producto',
                precio_estimado: precioEstimadoItem,
                precio_real: 0
              });
            }
          } else {
            const errorData = await response.json();
            cajasPorItem.push({
              producto: item.producto?.nombre || `Producto ID ${item.producto_id}`,
              cantidad_requerida: item.cantidad,
              error: errorData.detail || 'No hay lotes suficientes disponibles',
              precio_estimado: precioEstimadoItem,
              precio_real: 0
            });
          }
        } catch (itemError) {
          console.error(`Error para producto ${item.producto_id}:`, itemError);
          cajasPorItem.push({
            producto: item.producto?.nombre || `Producto ID ${item.producto_id}`,
            cantidad_requerida: item.cantidad,
            error: 'Error al consultar lotes disponibles',
            precio_estimado: precioEstimadoItem,
            precio_real: 0
          });
        }
      }

      // Agregar información de precios totales
      (cajasPorItem as any).totalPrecioEstimado = totalPrecioEstimado;
      (cajasPorItem as any).totalPrecioReal = totalPrecioReal;
      (cajasPorItem as any).diferenciaPrecio = totalPrecioReal - totalPrecioEstimado;
      (cajasPorItem as any).lotesYaAsignados = false;

      return cajasPorItem;
    } catch (error) {
      console.error('Error al obtener cajas:', error);
      return [];
    } finally {
      setCargandoCajas(false);
    }
  };

  const confirmarCajasYProceder = async () => {
    if (!pedido) return;

    try {
      setGuardando(true);
      const updateData: any = { estado: 'CONFIRMADO' };

      // Si hay local seleccionado, incluirlo
      if (localSeleccionado) {
        updateData.local_despacho_id = localSeleccionado;
      }

      const actualizado = await actualizarPedido(pedido.id, updateData);
      setPedido(actualizado);
      setMostrarConfirmacionCajas(false);
      setCajasDisponibles([]);
    } catch (err: any) {
      setError(err.message || 'Error al confirmar el pedido');
      console.error(err);
    } finally {
      setGuardando(false);
    }
  };

  const cargarPedido = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await obtenerPedido(Number(params.id));
      setPedido(data);
      setNotasAdmin(data.notas_admin || '');
      setLocalSeleccionado(data.local_despacho_id || null);

      // Si es CAJAS_VARIABLES y no está pendiente, cargar datos reales de preventa
      if (data.tipo_pedido_codigo === 'CAJAS_VARIABLES' && data.estado !== 'PENDIENTE') {
        try {
          const preventa = await obtenerPreventa(Number(params.id));
          setPreventaData(preventa);
        } catch {
          // Si falla no bloqueamos la carga del pedido
        }
      }

      // Si el pedido permite cheques, cargar información de cheques
      if (data.permite_cheque) {
        cargarCheques();
      }

      // Si el pedido está cancelado, cargar nota de crédito si existe
      if (data.estado === 'CANCELADO') {
        const nota = await obtenerNotaCreditoPorPedido(Number(params.id));
        setNotaCredito(nota);
      }

      // Si el pedido está entregado, cargar devoluciones si existen
      if (data.estado === 'ENTREGADO') {
        const devs = await obtenerDevolucionesPedido(Number(params.id));
        setDevoluciones(devs);
      }
    } catch (err) {
      setError('Error al cargar el pedido');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstado = async (nuevoEstado: string) => {
    if (!pedido) return;

    // Si va a confirmar un pedido de cajas variables, mostrar confirmación especial
    if (nuevoEstado === 'CONFIRMADO' && pedido.tipo_pedido_codigo === 'CAJAS_VARIABLES') {
      const cajas = await obtenerCajasParaPedido();
      setCajasDisponibles(cajas);
      setMostrarConfirmacionCajas(true);
      return;
    }

    // Si va a confirmar y no hay local de despacho, mostrar selector
    if (nuevoEstado === 'CONFIRMADO' && !pedido.local_despacho_id && !localSeleccionado) {
      setMostrarSelectorLocal(true);
      return;
    }

    try {
      setGuardando(true);
      const updateData: any = { estado: nuevoEstado };

      // Si está confirmando y hay local seleccionado, incluirlo
      if (nuevoEstado === 'CONFIRMADO' && localSeleccionado) {
        updateData.local_despacho_id = localSeleccionado;
      }

      const actualizado = await actualizarPedido(pedido.id, updateData);
      setPedido(actualizado);
      setMostrarSelectorLocal(false);
      if (nuevoEstado === 'CANCELADO') {
        const nota = await obtenerNotaCreditoPorPedido(pedido.id);
        setNotaCredito(nota);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cambiar el estado');
      console.error(err);
    } finally {
      setGuardando(false);
    }
  };

  const togglePagado = async () => {
    if (!pedido) return;
    // Las facturas solo se pueden pagar desde el módulo de Facturas
    if (pedido.tipo_documento_tributario_id === 1) return;

    try {
      setGuardando(true);
      const actualizado = await actualizarPedido(pedido.id, { pagado: !pedido.pagado });
      setPedido(actualizado);
    } catch (err) {
      setError('Error al actualizar el estado de pago');
      console.error(err);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstadoCheque = async (chequeId: number, nuevoEstadoId: number) => {
    try {
      setActualizandoCheque(chequeId);
      await actualizarCheque(chequeId, { estado_id: nuevoEstadoId });

      // Recargar información de cheques y pedido
      await Promise.all([cargarCheques(), cargarPedido()]);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el cheque');
      console.error(err);
    } finally {
      setActualizandoCheque(null);
    }
  };

  const handleDescargarBoleta = async () => {
    if (!pedido) return;

    try {
      setGenerandoBoleta(true);
      await descargarBoleta(pedido.id);
    } catch (err: any) {
      setError(err.message || 'Error al generar la boleta');
      console.error(err);
    } finally {
      setGenerandoBoleta(false);
    }
  };

  const handleDescargarFactura = async () => {
    if (!pedido) return;

    try {
      setGenerandoFactura(true);
      await descargarFactura(pedido.id, pedido.numero_pedido);
    } catch (err: any) {
      setError(err.message || 'Error al generar la factura');
      console.error(err);
    } finally {
      setGenerandoFactura(false);
    }
  };

  const registrarDevolucion = async () => {
    if (!pedido || !devolucionLocalDestino) return;
    const items = pedido.items
      ?.filter(item => (devolucionItems[item.id] || 0) > 0)
      .map(item => ({
        item_pedido_id: item.id,
        cantidad_devuelta: devolucionItems[item.id],
        local_destino_id: devolucionLocalDestino,
      }));
    if (!items || items.length === 0) {
      setErrorDevolucion('Debes seleccionar al menos un producto a devolver.');
      return;
    }
    try {
      setRegistrandoDevolucion(true);
      await crearDevolucion(pedido.id, { motivo: devolucionMotivo, items });
      const devs = await obtenerDevolucionesPedido(pedido.id);
      setDevoluciones(devs);
      setMostrarModalDevolucion(false);
      setDevolucionItems({});
      setDevolucionMotivo('');
      setDevolucionLocalDestino(null);
    } catch (err: any) {
      setErrorDevolucion(err.message || 'Error al registrar la devolución');
    } finally {
      setRegistrandoDevolucion(false);
    }
  };

  const guardarNotasAdmin = async () => {
    if (!pedido) return;

    try {
      setGuardando(true);
      const actualizado = await actualizarPedido(pedido.id, { notas_admin: notasAdmin });
      setPedido(actualizado);
    } catch (err) {
      setError('Error al guardar las notas');
      console.error(err);
    } finally {
      setGuardando(false);
    }
  };
  
  const guardarMedioPago = async () => {
    if (!pedido || !medioPagoSeleccionado) return;

    try {
      setGuardandoMedioPago(true);
      const actualizado = await actualizarPedido(pedido.id, { medio_pago_id: medioPagoSeleccionado });
      setPedido(actualizado);
      setMedioPagoSeleccionado(null); // Limpiar selección después de guardar
    } catch (err) {
      setError('Error al guardar el medio de pago');
      console.error(err);
    } finally {
      setGuardandoMedioPago(false);
    }
  };

  // Obtener stock disponible de un producto en un local
  const getStockProductoLocal = (productoId: number, localId: number): number => {
    const inv = inventarios.find(
      i => i.producto_id === productoId && i.local_id === localId
    );
    return inv?.cantidad_stock || 0;
  };

  // Verificar si un local tiene stock suficiente para todos los productos del pedido
  const localTieneStockSuficiente = (localId: number): boolean => {
    if (!pedido?.items) return false;

    return pedido.items.every(item => {
      const stockDisponible = getStockProductoLocal(item.producto_id, localId);
      return stockDisponible >= item.cantidad;
    });
  };

  // Obtener detalles de stock de un local para el pedido
  const getDetalleStockLocal = (localId: number) => {
    if (!pedido?.items) return [];

    return pedido.items.map(item => ({
      producto: item.producto?.nombre || 'Producto',
      requerido: item.cantidad,
      disponible: getStockProductoLocal(item.producto_id, localId),
      suficiente: getStockProductoLocal(item.producto_id, localId) >= item.cantidad
    }));
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-400 mt-4">Cargando pedido...</p>
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
        {error || 'Pedido no encontrado'}
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={() => router.push('/admin/pedidos')}
            className="text-gray-400 hover:text-white mb-2 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a Pedidos
          </button>
          <h1 className="text-3xl font-bold text-white">
            Pedido #{pedido.numero_pedido}
          </h1>
          <p className="text-gray-400 mt-1">{formatFecha(pedido.fecha_pedido)}</p>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3">
          {pedido.estado === 'ENTREGADO' && (
            <button
              onClick={() => { setMostrarModalDevolucion(true); setErrorDevolucion(''); }}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              Registrar Devolución
            </button>
          )}
          {pedido.tipo_documento_tributario_id === 1 ? (
            <button
              onClick={handleDescargarFactura}
              disabled={generandoFactura}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {generandoFactura ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar Factura
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleDescargarBoleta}
              disabled={generandoBoleta}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {generandoBoleta ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar Boleta
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items del Pedido */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Productos</h2>

            <div className="space-y-3">
              {pedido.items?.map((item) => {
                // Para CAJAS_VARIABLES con picking completado, mostrar datos reales
                const preventaItem: ItemPreventaOut | undefined = preventaData?.items.find(
                  (pi) => pi.id === item.id
                );
                const tieneAsignaciones = preventaItem && preventaItem.asignaciones.length > 0;

                if (pedido.tipo_pedido_codigo === 'CAJAS_VARIABLES' && tieneAsignaciones && preventaItem) {
                  const pesoTotal = preventaItem.asignaciones.reduce((s, a) => s + a.peso_real, 0);
                  const montoReal = preventaItem.asignaciones.reduce((s, a) => s + a.monto_real, 0);
                  const precioKgPromedio = pesoTotal > 0 ? montoReal / pesoTotal : 0;

                  return (
                    <div key={item.id} className="p-4 bg-slate-700 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-white font-semibold">{item.producto?.nombre}</p>
                          <p className="text-sm text-gray-400">SKU: {item.producto?.sku}</p>
                          {preventaItem.proveedor_nombre && (
                            <p className="text-sm text-gray-400">Proveedor: {preventaItem.proveedor_nombre}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold text-lg">${montoReal.toLocaleString('es-CL')}</p>
                          <p className="text-sm text-gray-400">{pesoTotal.toFixed(2)} kg · ${Math.round(precioKgPromedio).toLocaleString('es-CL')}/kg</p>
                        </div>
                      </div>
                      {/* Detalle por lote */}
                      <div className="space-y-1 border-t border-slate-600 pt-2">
                        <p className="text-xs text-gray-500 mb-1">{preventaItem.asignaciones.length} caja(s) asignada(s):</p>
                        {preventaItem.asignaciones.map((a) => (
                          <div key={a.id} className="flex items-center gap-2 text-xs text-gray-300 bg-slate-800 rounded px-2 py-1">
                            <span className="font-mono text-gray-400">#{a.codigo_lote}</span>
                            <span className="text-gray-500">·</span>
                            <span>{a.peso_real.toFixed(2)} kg</span>
                            <span className="text-gray-500">·</span>
                            <span>${a.precio_kg.toLocaleString('es-CL')}/kg</span>
                            <span className="ml-auto font-semibold text-white">${a.monto_real.toLocaleString('es-CL')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                // Ítem normal (PRODUCTOS) o CAJAS_VARIABLES pendiente/sin asignaciones
                return (
                  <div key={item.id} className="flex justify-between items-center p-4 bg-slate-700 rounded-lg">
                    <div className="flex-1">
                      <p className="text-white font-semibold">{item.producto?.nombre}</p>
                      <p className="text-sm text-gray-400">SKU: {item.producto?.sku}</p>
                      <p className="text-sm text-gray-400">
                        Cantidad: {item.cantidad} {pedido.tipo_pedido_codigo === 'CAJAS_VARIABLES' ? 'caja(s)' : 'un.'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">
                        ${item.precio_unitario_venta.toLocaleString('es-CL')}
                      </p>
                      <p className="text-sm text-gray-400">
                        Subtotal: ${(item.cantidad * item.precio_unitario_venta).toLocaleString('es-CL')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-600">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-white">Total</span>
                <span className="text-2xl font-bold text-primary">
                  ${pedido.total.toLocaleString('es-CL')}
                </span>
              </div>
            </div>
          </div>

          {/* Notas del Cliente */}
          {pedido.notas && (
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-3">Notas del Cliente</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{pedido.notas}</p>
            </div>
          )}

          {/* Notas Internas */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-3">Notas Internas (Admin)</h2>
            <textarea
              value={notasAdmin}
              onChange={(e) => setNotasAdmin(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 min-h-[100px] focus:ring-2 focus:ring-primary"
              placeholder="Agrega notas internas sobre este pedido..."
            />
            <button
              onClick={guardarNotasAdmin}
              disabled={guardando}
              className="mt-3 bg-primary hover:bg-primary-light text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar Notas'}
            </button>
          </div>
        </div>

        {/* Columna Lateral */}
        <div className="space-y-6">
          {/* Estado del Pedido */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Estado del Pedido</h2>

            {/* Selector de Local (solo si va a confirmar y no tiene local asignado) */}
            {mostrarSelectorLocal && (
              <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg">
                <p className="text-yellow-500 font-semibold mb-3">Seleccione el local de despacho:</p>

                {/* Lista de locales con stock */}
                <div className="space-y-3 mb-4">
                  {locales.map((local) => {
                    const tieneSuficiente = localTieneStockSuficiente(local.id);
                    const detalleStock = getDetalleStockLocal(local.id);

                    return (
                      <div
                        key={local.id}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${localSeleccionado === local.id
                          ? 'border-primary bg-primary/10'
                          : tieneSuficiente
                            ? 'border-slate-600 bg-slate-700 hover:border-slate-500'
                            : 'border-red-500/30 bg-red-500/5 opacity-60'
                          }`}
                        onClick={() => tieneSuficiente && setLocalSeleccionado(local.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              checked={localSeleccionado === local.id}
                              onChange={() => setLocalSeleccionado(local.id)}
                              disabled={!tieneSuficiente}
                              className="w-4 h-4"
                            />
                            <div>
                              <p className="text-white font-semibold">{local.nombre}</p>
                              <p className="text-xs text-gray-400">{local.codigo}</p>
                            </div>
                          </div>
                          {tieneSuficiente ? (
                            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                              ✓ Stock OK
                            </span>
                          ) : (
                            <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                              Sin stock
                            </span>
                          )}
                        </div>

                        {/* Detalle de stock por producto */}
                        <div className="text-xs space-y-1 ml-6">
                          {detalleStock.map((detalle, idx) => (
                            <div
                              key={idx}
                              className={`flex justify-between ${detalle.suficiente ? 'text-gray-400' : 'text-red-400'
                                }`}
                            >
                              <span>{detalle.producto}</span>
                              <span>
                                {detalle.disponible} / {detalle.requerido} unidades
                                {!detalle.suficiente && ' ⚠️'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => cambiarEstado('CONFIRMADO')}
                    disabled={!localSeleccionado || guardando}
                    className="flex-1 bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {guardando ? 'Confirmando...' : 'Confirmar Pedido'}
                  </button>
                  <button
                    onClick={() => setMostrarSelectorLocal(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Modal de confirmación para cajas variables */}
            {mostrarConfirmacionCajas && (
              <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500 rounded-lg">
                <p className="text-blue-500 font-semibold mb-3">
                  Confirmación de Asignación de Cajas Variables
                </p>

                {cargandoCajas ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-sm text-gray-400 mt-2">Calculando cajas necesarias...</p>
                  </div>
                ) : (
                  <div className="space-y-3 mb-4">
                    <p className="text-sm text-gray-300 mb-3">
                      Al confirmar este pedido se entregarán las siguientes cajas específicas:
                    </p>

                    {cajasDisponibles.map((caja, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border ${caja.error
                          ? 'border-red-500/30 bg-red-500/5'
                          : 'border-slate-600 bg-slate-700'
                          }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-white font-semibold">{caja.producto}</p>
                            <p className="text-sm text-gray-400">
                              Cantidad requerida: {caja.cantidad_requerida} cajas
                            </p>
                            {!caja.error && (
                              <>
                                <p className="text-sm text-gray-400">
                                  Proveedor: {caja.proveedor}
                                </p>
                                <p className="text-sm font-semibold text-green-400">
                                  Precio total: ${caja.lotes_especificos?.reduce((total: number, lote: any) => total + lote.precio_total, 0).toLocaleString('es-CL')}
                                </p>
                              </>
                            )}
                          </div>

                          {caja.error ? (
                            <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                              ⚠️ Sin stock
                            </span>
                          ) : (
                            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                              ✓ Disponible
                            </span>
                          )}
                        </div>

                        {!caja.error && caja.lotes_especificos && (
                          <div className="space-y-2 border-t border-slate-600 pt-3">
                            <p className="text-xs font-semibold text-gray-300 mb-2">
                              Lotes específicos a entregar:
                            </p>
                            {caja.lotes_especificos.map((lote: any, loteIdx: number) => (
                              <div
                                key={loteIdx}
                                className="bg-slate-800 rounded-md p-2 text-xs"
                              >
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-gray-400">Lote:</span>
                                    <span className="text-white font-mono ml-2">#{lote.codigo_lote}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Peso:</span>
                                    <span className="text-white font-semibold ml-2">{lote.peso_kg} kg</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">$/kg:</span>
                                    <span className="text-white ml-2">${lote.precio_kg?.toLocaleString('es-CL')}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Total:</span>
                                    <span className="text-green-400 font-semibold ml-2">${lote.precio_total?.toLocaleString('es-CL')}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Vencimiento:</span>
                                    <span className="text-yellow-400 ml-2">{new Date(lote.fecha_vencimiento).toLocaleDateString('es-CL')}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Lote Proveedor:</span>
                                    <span className="text-gray-200 ml-2 font-mono">{lote.lote_proveedor}</span>
                                  </div>
                                </div>
                              </div>
                            ))}

                            <div className="border-t border-slate-600 pt-2 mt-3">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Resumen:</span>
                                <div className="text-right">
                                  <div className="text-white">
                                    {caja.lotes_especificos.reduce((total: number, lote: any) => total + lote.peso_kg, 0).toFixed(2)} kg total
                                  </div>
                                  <div className="text-green-400 font-bold">
                                    ${caja.lotes_especificos.reduce((total: number, lote: any) => total + lote.precio_total, 0).toLocaleString('es-CL')} CLP
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {caja.error && (
                          <p className="text-red-400 text-sm mt-2">{caja.error}</p>
                        )}
                      </div>
                    ))}

                    {/* Resumen de precios total */}
                    {cajasDisponibles.length > 0 && !cajasDisponibles.some(caja => caja.error) && (
                      <div className="border-t border-slate-600 pt-4 mt-6">
                        <div className="bg-slate-800 rounded-lg p-4">
                          <h4 className="text-white font-semibold mb-3">Resumen de Precios Total:</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Precio Estimado Original:</span>
                              <div className="text-white font-mono text-lg">
                                ${(pedido?.total || 0).toLocaleString('es-CL')}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-400">Precio Real (Lotes Específicos):</span>
                              <div className="text-green-400 font-mono text-lg font-bold">
                                ${cajasDisponibles
                                  .filter(caja => !caja.error && caja.lotes_especificos)
                                  .reduce((total: number, caja) =>
                                    total + (caja.lotes_especificos?.reduce((loteTotal: number, lote: any) => loteTotal + lote.precio_total, 0) || 0), 0)
                                  .toLocaleString('es-CL')}
                              </div>
                            </div>
                          </div>

                          {/* Mostrar diferencia si existe */}
                          {(() => {
                            const precioOriginal = pedido?.total || 0;
                            const precioReal = cajasDisponibles
                              .filter(caja => !caja.error && caja.lotes_especificos)
                              .reduce((total: number, caja) =>
                                total + (caja.lotes_especificos?.reduce((loteTotal: number, lote: any) => loteTotal + lote.precio_total, 0) || 0), 0);

                            const diferencia = precioReal - precioOriginal;

                            if (Math.abs(diferencia) > 0.01) {
                              return (
                                <div className={`mt-3 p-3 rounded-lg text-center ${diferencia > 0
                                  ? 'bg-red-500/10 border border-red-500/30'
                                  : 'bg-green-500/10 border border-green-500/30'
                                  }`}>
                                  <span className={`font-semibold ${diferencia > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {diferencia > 0 ? 'Incremento' : 'Descuento'}: ${Math.abs(diferencia).toLocaleString('es-CL')}
                                  </span>
                                  <div className="text-xs text-gray-400 mt-1">
                                    El precio del pedido se actualizará automáticamente
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={confirmarCajasYProceder}
                        disabled={guardando || cajasDisponibles.some(caja => caja.error)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                      >
                        {guardando ? 'Confirmando...' : 'Confirmar Asignación'}
                      </button>
                      <button
                        onClick={() => {
                          setMostrarConfirmacionCajas(false);
                          setCajasDisponibles([]);
                        }}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Info de inventario */}
            {pedido.inventario_descontado && pedido.local_despacho_id && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500 rounded-lg text-sm">
                <p className="text-green-500">
                  ✓ Inventario descontado del local: {locales.find(l => l.id === pedido.local_despacho_id)?.nombre || `ID ${pedido.local_despacho_id}`}
                </p>
              </div>
            )}

            <div className="space-y-2">
              {estados.map((estado) => (
                <button
                  key={estado.value}
                  onClick={() => cambiarEstado(estado.value)}
                  disabled={guardando || pedido.estado === estado.value}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${pedido.estado === estado.value
                    ? `${estado.color} text-white font-semibold`
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    } disabled:opacity-50`}
                >
                  {estado.label}
                  {pedido.estado === estado.value && ' ✓'}
                </button>
              ))}
            </div>
          </div>

          {/* Estado de Pago */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Estado de Pago</h2>

            {pedido.permite_cheque ? (
              <div className="space-y-3">
                <div className={`w-full px-4 py-3 rounded-lg font-semibold text-center ${pedido.pagado
                  ? 'bg-green-500 text-white'
                  : 'bg-yellow-500/20 border border-yellow-500 text-yellow-400'
                  }`}>
                  {pedido.pagado ? '✓ Pagado' : '⏳ Pendiente de Cheques'}
                </div>

                <p className="text-sm text-gray-400 text-center">
                  {pedido.pagado
                    ? 'Todos los cheques han sido cobrados'
                    : 'El pago se marcará automáticamente cuando todos los cheques estén cobrados'
                  }
                </p>
              </div>
            ) : pedido.tipo_documento_tributario_id === 1 ? (
              <div className="space-y-3">
                <div className={`w-full px-4 py-3 rounded-lg font-semibold text-center ${pedido.pagado
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500/20 border border-blue-500 text-blue-400'
                  }`}>
                  {pedido.pagado ? '✓ Pagado' : '⏳ Pendiente de Pago'}
                </div>
                <p className="text-sm text-gray-400 text-center">
                  Este pedido tiene factura. El pago debe registrarse desde el módulo de{' '}
                  <a href="/admin/cobranzas" className="text-blue-400 hover:underline font-medium">
                    Cobranzas
                  </a>.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className={`w-full px-4 py-3 rounded-lg font-semibold text-center ${pedido.pagado
                  ? 'bg-green-500 text-white'
                  : 'bg-yellow-500/20 border border-yellow-500 text-yellow-400'
                  }`}>
                  {pedido.pagado ? '✓ Pagado' : '⏳ Pendiente de Pago'}
                </div>
                {!pedido.pagado && (
                  <p className="text-sm text-gray-400 text-center">
                    El pago debe registrarse desde el módulo de{' '}
                    <a href="/admin/cobranzas" className="text-blue-400 hover:underline font-medium">
                      Cobranzas
                    </a>.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Gestión de Cheques */}
          {pedido.permite_cheque && (
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Gestión de Cheques</h2>

              {/* Resumen de cheques */}
              {pedidoConCheques?.resumen_cheques && (
                <div className="bg-slate-700 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Total Cheques</p>
                      <p className="text-white font-semibold">{pedidoConCheques.resumen_cheques.total_cheques}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Monto Total</p>
                      <p className="text-white font-semibold">${pedidoConCheques.resumen_cheques.monto_total_cheques.toLocaleString('es-CL')}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Pendientes</p>
                      <p className="text-yellow-400 font-semibold">{pedidoConCheques.resumen_cheques.cheques_pendientes}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Cobrados</p>
                      <p className="text-green-400 font-semibold">{pedidoConCheques.resumen_cheques.cheques_cobrados}</p>
                    </div>
                  </div>

                  {pedidoConCheques.resumen_cheques.todos_cobrados && (
                    <div className="mt-3 p-3 bg-green-500/10 border border-green-500 rounded-lg">
                      <p className="text-green-400 font-semibold text-center">
                        ✅ Todos los cheques están cobrados
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Lista de cheques */}
              {!pedidoConCheques ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-gray-400 mt-2">Cargando cheques...</p>
                </div>
              ) : pedidoConCheques.cheques.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No hay cheques registrados</p>
              ) : (
                <div className="space-y-3">
                  {pedidoConCheques.cheques.map((cheque) => (
                    <div key={cheque.id} className="bg-slate-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-white font-semibold">Cheque #{cheque.numero_cheque}</p>
                          <p className="text-sm text-gray-400">{cheque.banco?.nombre || 'Banco no especificado'}</p>
                          <p className="text-lg text-primary font-bold">${cheque.monto.toLocaleString('es-CL')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Vencimiento</p>
                          <p className="text-sm text-white">{new Date(cheque.fecha_vencimiento).toLocaleDateString('es-CL')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-400">Estado:</label>
                        <select
                          value={cheque.estado_id}
                          onChange={(e) => cambiarEstadoCheque(cheque.id, parseInt(e.target.value))}
                          disabled={actualizandoCheque === cheque.id}
                          className="bg-slate-600 text-white rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-primary"
                        >
                          {estadosCheque.map((estado) => (
                            <option key={estado.id} value={estado.id}>
                              {estado.nombre}
                            </option>
                          ))}
                        </select>

                        {actualizandoCheque === cheque.id && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        )}
                      </div>

                      {cheque.librador_nombre && (
                        <p className="text-sm text-gray-400 mt-2">
                          Librador: {cheque.librador_nombre}
                        </p>
                      )}

                      {cheque.observaciones && (
                        <p className="text-sm text-gray-400 mt-1">
                          Observaciones: {cheque.observaciones}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Información del Cliente */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Cliente</h2>
            <div className="space-y-3 text-gray-300">
              <div>
                <p className="text-sm text-gray-400">Nombre</p>
                <p className="font-semibold">{pedido.cliente?.nombre}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="font-semibold">{pedido.cliente?.email}</p>
              </div>
              {pedido.cliente?.telefono && (
                <div>
                  <p className="text-sm text-gray-400">Teléfono</p>
                  <p className="font-semibold">{pedido.cliente.telefono}</p>
                </div>
              )}
              {pedido.cliente?.direccion && (
                <div>
                  <p className="text-sm text-gray-400">Dirección</p>
                  <p className="font-semibold">{pedido.cliente.direccion}</p>
                  {pedido.cliente.comuna && (
                    <p className="text-sm text-gray-400 mt-1">{pedido.cliente.comuna}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Medio de Pago */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Medio de Pago</h2>
            
            {pedido.medio_pago_id ? (
              // Mostrar medio de pago asignado
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">{pedido.medio_pago_nombre}</p>
                    <p className="text-sm text-gray-400">Código: {pedido.medio_pago_codigo}</p>
                  </div>
                  <div className="text-green-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ) : pedido.tipo_documento_tributario_id === 1 ? (
              // Factura: el medio de pago se asigna desde el módulo de Cobranzas
              <p className="text-sm text-gray-400 text-center py-2">
                El medio de pago se registra desde el módulo de{' '}
                <a href="/admin/cobranzas" className="text-blue-400 hover:underline font-medium">
                  Cobranzas
                </a>.
              </p>
            ) : (
              // Mostrar selector para asignar medio de pago
              <div className="space-y-3">
                <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4">
                  <p className="text-yellow-500 font-semibold mb-1">⚠️ Sin medio de pago asignado</p>
                  <p className="text-sm text-gray-400">
                    Este pedido fue creado sin pago. Asigna el medio de pago cuando el cliente realice el pago.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Seleccionar medio de pago
                  </label>
                  <select
                    value={medioPagoSeleccionado || ''}
                    onChange={(e) => setMedioPagoSeleccionado(Number(e.target.value))}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Seleccionar...</option>
                    {mediosPago.map(medio => (
                      <option key={medio.id} value={medio.id}>
                        {medio.nombre} {medio.permite_cheque && '(Permite cheques)'}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={guardarMedioPago}
                  disabled={!medioPagoSeleccionado || guardandoMedioPago}
                  className="w-full bg-primary hover:bg-primary-light text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {guardandoMedioPago ? 'Guardando...' : 'Asignar Medio de Pago'}
                </button>
              </div>
            )}
          </div>

          {/* Devoluciones */}
          {devoluciones.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-6 border border-orange-500/30">
              <h2 className="text-xl font-bold text-white mb-4">Devoluciones</h2>
              <div className="space-y-4">
                {devoluciones.map(dev => (
                  <div key={dev.id} className="bg-slate-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-white font-semibold">Devolución #{dev.id}</span>
                        <span className="ml-3 bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs">{dev.estado}</span>
                      </div>
                      <span className="text-gray-400 text-sm">{new Date(dev.fecha_devolucion).toLocaleDateString('es-CL')}</span>
                    </div>
                    {dev.motivo && <p className="text-gray-300 text-sm mb-3">{dev.motivo}</p>}
                    <div className="space-y-1">
                      {dev.items?.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-400">Producto #{item.producto_id}</span>
                          <span className="text-white">{item.cantidad_devuelta} unidades</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nota de Crédito */}
          {notaCredito && (
            <div className="bg-slate-800 rounded-lg p-6 border border-red-500/30">
              <h2 className="text-xl font-bold text-white mb-4">Nota de Crédito</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Tipo</span>
                  <span className="text-white">{notaCredito.tipo_documento?.nombre ?? `ID ${notaCredito.tipo_documento_id}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Monto</span>
                  <span className="text-white font-mono">${Number(notaCredito.monto).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fecha emisión</span>
                  <span className="text-white">{new Date(notaCredito.fecha_emision).toLocaleDateString('es-CL')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Estado SII</span>
                  <span className={`font-semibold ${notaCredito.estado_sii === 'APROBADO' ? 'text-green-400' : notaCredito.estado_sii === 'RECHAZADO' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {notaCredito.estado_sii}
                  </span>
                </div>
                {notaCredito.folio_sii && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Folio SII</span>
                    <span className="text-cyan-400 font-mono">{notaCredito.folio_sii}</span>
                  </div>
                )}
                {notaCredito.motivo && (
                  <div>
                    <span className="text-gray-400">Motivo</span>
                    <p className="text-white mt-1">{notaCredito.motivo}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Modal Devolución */}

    {mostrarModalDevolucion && pedido && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg space-y-5">
          <h2 className="text-xl font-bold text-white">Registrar Devolución</h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Productos a devolver</label>
            <div className="space-y-3">
              {pedido.items?.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{item.producto?.nombre || item.producto_nombre || `Producto #${item.producto_id}`}</p>
                    <p className="text-gray-400 text-xs">SKU: {item.producto?.sku ?? '—'} · Comprado: {item.cantidad}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <input
                      type="number"
                      min={0}
                      max={item.cantidad}
                      step={1}
                      placeholder="0"
                      value={devolucionItems[item.id] || ''}
                      onChange={e => {
                        const val = Math.min(Number(e.target.value), item.cantidad)
                        setDevolucionItems(prev => ({ ...prev, [item.id]: val < 0 ? 0 : val }))
                      }}
                      className="w-24 bg-slate-600 border border-slate-500 text-white rounded-lg px-3 py-1.5 text-sm text-right"
                    />
                    <span className="text-gray-500 text-xs">máx. {item.cantidad}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Local de destino del stock</label>
            <select
              value={devolucionLocalDestino || ''}
              onChange={e => setDevolucionLocalDestino(Number(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
            >
              <option value="">Seleccionar local...</option>
              {locales.map(l => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Motivo (opcional)</label>
            <textarea
              value={devolucionMotivo}
              onChange={e => setDevolucionMotivo(e.target.value)}
              rows={2}
              placeholder="Ej: Producto defectuoso, arrepentimiento de compra..."
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {errorDevolucion && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">
              {errorDevolucion}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setMostrarModalDevolucion(false); setErrorDevolucion(''); }}
              className="flex-1 bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={registrarDevolucion}
              disabled={registrandoDevolucion || !devolucionLocalDestino}
              className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold"
            >
              {registrandoDevolucion ? 'Registrando...' : 'Confirmar Devolución'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
