// Componentes de las etapas del POS
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { PlusIcon, MinusIcon, XMarkIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { getPrecioProductoLocal } from '@/lib/api/precios';

// ============= ETAPA 1: SELECCIÓN DE PRODUCTOS =============

interface EtapaProductosProps {
  productos: any[];
  productoSeleccionado: any;
  setProductoSeleccionado: (producto: any) => void;
  cantidadInput: string;
  setCantidadInput: (cantidad: string) => void;
  agregarAlCarrito: () => void;
  carrito: any[];
  onSiguiente: () => void;
  localId: number | null;
  loadingProductos?: boolean;
  cajaAbierta?: boolean;
  unidadesMedida?: any[];
}

export function EtapaProductos({
  productos,
  productoSeleccionado,
  setProductoSeleccionado,
  cantidadInput,
  setCantidadInput,
  agregarAlCarrito,
  carrito,
  onSiguiente,
  localId,
  loadingProductos = false,
  cajaAbierta = true,
  unidadesMedida = []
}: EtapaProductosProps) {
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');
  const [preciosProducto, setPreciosProducto] = useState<any[]>([]);
  const [loadingPrecios, setLoadingPrecios] = useState(false);
  
  // Cargar precios cuando se selecciona un producto
  useEffect(() => {
    if (productoSeleccionado && localId) {
      cargarPreciosProducto();
    } else {
      setPreciosProducto([]);
    }
  }, [productoSeleccionado?.id, localId]);
  
  const cargarPreciosProducto = async () => {
    if (!productoSeleccionado || !localId) return;
    
    setLoadingPrecios(true);
    try {
      const precios = await getPrecioProductoLocal(productoSeleccionado.id, localId);
      setPreciosProducto(precios || []);
    } catch (error) {
      console.error('Error cargando precios:', error);
      setPreciosProducto([]);
    } finally {
      setLoadingPrecios(false);
    }
  };
  
  // Obtener nombre de unidad
  const getNombreUnidad = (unidadId: number) => {
    const unidad = unidadesMedida.find(u => u.id === unidadId);
    return unidad?.nombre || 'Unidad';
  };
  
  // Obtener factor de unidad
  const getFactorUnidad = (unidadId: number) => {
    const unidad = unidadesMedida.find(u => u.id === unidadId);
    return unidad?.factor_conversion || 1;
  };
  
  // Calcular precio y subtotal según cantidad
  const calcularPrecioYSubtotal = (cantidad: number) => {
    if (!preciosProducto || preciosProducto.length === 0 || cantidad <= 0) {
      return { precioUnitario: productoSeleccionado?.precio_local || 0, subtotal: 0, nombreUnidad: 'unidad', factor: 1 };
    }

    // Ordenar precios por factor (mayor a menor)
    const preciosOrdenados = [...preciosProducto].sort((a, b) => {
      const factorA = getFactorUnidad(a.unidad_medida_id);
      const factorB = getFactorUnidad(b.unidad_medida_id);
      return factorB - factorA;
    });

    // Buscar el mejor precio para esta cantidad
    for (const precio of preciosOrdenados) {
      const factor = getFactorUnidad(precio.unidad_medida_id);
      if (cantidad >= factor) {
        const nombreUnidad = getNombreUnidad(precio.unidad_medida_id);
        // El monto_precio es el precio UNITARIO para este tier
        const precioUnitario = precio.monto_precio;
        const subtotal = Math.round(cantidad * precioUnitario);
        return { precioUnitario, factor, subtotal, nombreUnidad };
      }
    }

    // Si no aplica ningún precio por volumen, usar el unitario
    const precioUnitario = preciosOrdenados[preciosOrdenados.length - 1];
    const factor = getFactorUnidad(precioUnitario.unidad_medida_id);
    return {
      precioUnitario: precioUnitario.monto_precio,
      factor,
      subtotal: Math.round(cantidad * precioUnitario.monto_precio),
      nombreUnidad: getNombreUnidad(precioUnitario.unidad_medida_id)
    };
  };
  
  // Obtener categorías únicas
  const categorias = Array.from(new Set(productos.map(p => p.categoria_nombre).filter(Boolean)));
  
  // Filtrar productos
  const productosFiltrados = productos.filter(producto => {
    const cumpleBusqueda = !busqueda || 
      producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      producto.sku.toLowerCase().includes(busqueda.toLowerCase());
    
    const cumpleCategoria = !filtroCategoria || producto.categoria_nombre === filtroCategoria;
    
    return cumpleBusqueda && cumpleCategoria;
  });
  
  // Incrementar/decrementar cantidad
  const incrementarCantidad = () => {
    const actual = parseFloat(cantidadInput) || 0;
    const incremento = productoSeleccionado?.tipo_venta_codigo === 'PESO_SUELTO' ? 0.1 : 1;
    setCantidadInput((actual + incremento).toString());
  };
  
  const decrementarCantidad = () => {
    const actual = parseFloat(cantidadInput) || 0;
    const decremento = productoSeleccionado?.tipo_venta_codigo === 'PESO_SUELTO' ? 0.1 : 1;
    if (actual > 0) {
      setCantidadInput(Math.max(0, actual - decremento).toString());
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Panel izquierdo: Filtros y productos */}
      <div className="lg:col-span-2 space-y-4">
        {/* Filtros */}
        <div className="bg-slate-800 rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Buscar producto
              </label>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre o SKU..."
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg text-white placeholder-slate-400"
              />
            </div>
            
            {/* Filtro por categoría */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Categoría
              </label>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg text-white"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(categoria => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Grid de productos */}
        {loadingProductos ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mr-3"></div>
            <span className="text-slate-400">Actualizando productos...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{productosFiltrados.map(producto => (
            <div
              key={producto.id}
              onClick={() => setProductoSeleccionado(producto)}
              className={`bg-slate-800 rounded-lg shadow-sm border-2 cursor-pointer transition-all transform hover:scale-105 ${
                productoSeleccionado?.id === producto.id
                  ? 'border-teal-500 bg-teal-900/20'
                  : 'border-slate-600 hover:border-teal-400'
              }`}
            >
              <div className="p-3">
                {/* Imagen del producto */}
                <div className="aspect-square bg-slate-700 rounded-lg mb-2 flex items-center justify-center">
                  {producto.imagen_url ? (
                    <Image
                      src={`${process.env.NEXT_PUBLIC_API_URL}${producto.imagen_url}?t=${Date.now()}`}
                      alt={producto.nombre}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        // Si la imagen falla, ocultar el elemento Image y mostrar placeholder
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                        }
                      }}
                    />
                  ) : (
                    <div className="text-slate-500 text-xs text-center">
                      Sin imagen
                    </div>
                  )}
                  
                  {/* Placeholder de respaldo (oculto inicialmente) */}
                  {producto.imagen_url && (
                    <div className="text-slate-500 text-xs text-center hidden">
                      Sin imagen
                    </div>
                  )}
                </div>
                
                {/* Información del producto */}
                <div className="text-center">
                  <h3 className="font-medium text-white text-sm mb-1 line-clamp-2">
                    {producto.nombre}
                  </h3>
                  
                  <p className="text-xs text-slate-400 mb-1">
                    SKU: {producto.sku}
                  </p>
                  
                  {/* Precio y tipo de venta */}
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-teal-400">
                      {producto.precio_local > 0 
                        ? `$${producto.precio_local.toLocaleString()}${producto.tipo_venta_codigo === 'PESO_SUELTO' ? '/kg' : ''}`
                        : 'Sin precio'
                      }
                    </p>
                    
                    <p className="text-xs text-slate-400">
                      {producto.tipo_venta_codigo === 'PESO_SUELTO' ? 'Por kg' : 'Por unidad'}
                    </p>
                    
                    {/* Stock disponible del local específico */}
                    <p className={`text-xs ${(producto.stock_local || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      Stock local: {producto.stock_local || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
      
      {/* Panel derecho: Producto seleccionado y cantidad */}
      <div className="space-y-4">
        {/* Producto seleccionado */}
        {productoSeleccionado && (
          <div className="bg-slate-800 rounded-lg shadow-sm p-4">
            <h3 className="font-bold text-lg text-white mb-4">Producto Seleccionado</h3>
            
            <div className="space-y-4">
              {/* Información del producto */}
              <div className="border-b border-slate-700 pb-4">
                <h4 className="font-medium text-white">{productoSeleccionado.nombre}</h4>
                <p className="text-sm text-slate-400">SKU: {productoSeleccionado.sku}</p>
                <p className="text-lg font-bold text-teal-400">
                  ${productoSeleccionado.precio_local?.toLocaleString() || 'Sin precio'} 
                  <span className="text-sm font-normal text-slate-400">
                    /{productoSeleccionado.tipo_venta_codigo === 'PESO_SUELTO' ? 'kg' : 'unidad'}
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  Stock disponible: {productoSeleccionado.stock_local || 0}
                </p>
              </div>
              
              {/* Rangos de precios por cantidad (si aplica) */}
              {productoSeleccionado.tipo_venta_codigo !== 'PESO_SUELTO' && preciosProducto.length > 0 && (
                <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                  <h5 className="text-sm font-semibold text-blue-400 mb-2">💰 Precios por volumen</h5>
                  {loadingPrecios ? (
                    <p className="text-xs text-slate-400">Cargando precios...</p>
                  ) : (
                    <>
                      <div className="space-y-2 text-xs">
                        {preciosProducto
                          .sort((a, b) => getFactorUnidad(a.unidad_medida_id) - getFactorUnidad(b.unidad_medida_id))
                          .map((precio, index, array) => {
                            const factor = Math.round(getFactorUnidad(precio.unidad_medida_id));
                            const nombreUnidad = getNombreUnidad(precio.unidad_medida_id);
                            const precioUnitario = precio.monto_precio; // Ahora es precio por unidad
                            
                            // Determinar el rango
                            let rangoTexto = '';
                            if (factor === 1) {
                              // Primera opción: desde 1 hasta antes del siguiente factor
                              const nextFactor = index < array.length - 1 
                                ? Math.round(getFactorUnidad(array[index + 1].unidad_medida_id))
                                : null;
                              const hasta = nextFactor ? nextFactor - 1 : 5;
                              rangoTexto = `1-${hasta} unidades:`;
                            } else {
                              // Otras opciones: desde el factor en adelante
                              rangoTexto = `${factor}+ unidades (${nombreUnidad}):`;
                            }
                            
                            return (
                              <div key={precio.id} className="flex justify-between items-center">
                                <span className="text-slate-300">{rangoTexto}</span>
                                <span className={`font-bold ${
                                  factor === 1 ? 'text-white' : 
                                  factor === 6 ? 'text-emerald-400' : 
                                  'text-amber-400'
                                }`}>
                                  ${Math.round(precioUnitario).toLocaleString()} c/u
                                </span>
                              </div>
                            );
                          })}
                      </div>
                      <p className="text-xs text-blue-300 mt-2 italic">
                        💡 El precio se ajusta automáticamente según la cantidad
                      </p>
                    </>
                  )}
                </div>
              )}
              
              {/* Input de cantidad/peso */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {productoSeleccionado.tipo_venta_codigo === 'PESO_SUELTO' ? 'Peso (kg)' : 'Cantidad'}
                </label>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={decrementarCantidad}
                    className="w-10 h-10 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center"
                    type="button"
                  >
                    <MinusIcon className="w-5 h-5" />
                  </button>
                  
                  <input
                    type="number"
                    value={cantidadInput}
                    onChange={(e) => setCantidadInput(e.target.value)}
                    placeholder="0"
                    min="0"
                    step={productoSeleccionado.tipo_venta_codigo === 'PESO_SUELTO' ? '0.1' : '1'}
                    className="flex-1 text-center text-xl font-bold p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white"
                  />
                  
                  <button
                    onClick={incrementarCantidad}
                    className="w-10 h-10 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center"
                    type="button"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Subtotal */}
                {cantidadInput && parseFloat(cantidadInput) > 0 && (() => {
                  const cantidad = parseFloat(cantidadInput);
                  const { subtotal, precioUnitario, factor, nombreUnidad } = calcularPrecioYSubtotal(cantidad);
                  
                  if (subtotal === 0) return null;
                  
                  return (
                    <div className="mt-3 p-3 bg-teal-900/20 border border-teal-500/30 rounded-lg">
                      <p className="text-sm text-slate-400">Subtotal:</p>
                      <p className="text-xl font-bold text-teal-400">
                        ${subtotal.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-400">
                        {factor > 1 ? (
                          `${cantidad} unid × $${precioUnitario.toLocaleString()} (precio ${nombreUnidad})`
                        ) : (
                          `${cantidad} unid × $${precioUnitario.toLocaleString()}`
                        )}
                      </p>
                    </div>
                  );
                })()}
                
                {cantidadInput && parseFloat(cantidadInput) > 0 && (!productoSeleccionado.precio_local || productoSeleccionado.precio_local === 0) && (
                  <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400">Sin precio configurado para este local</p>
                  </div>
                )}
              </div>
              
              {/* Botón agregar al carrito */}
              <button
                onClick={agregarAlCarrito}
                disabled={!cajaAbierta || !cantidadInput || parseFloat(cantidadInput) <= 0}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                title={!cajaAbierta ? 'Caja no abierta - No se pueden crear pedidos' : ''}
              >
                <PlusIcon className="w-5 h-5" />
                <span>{!cajaAbierta ? '🔒 Caja Cerrada' : 'Agregar al Carrito'}</span>
              </button>
              
              {!cajaAbierta && (
                <p className="text-xs text-red-400 text-center mt-2">
                  ⚠️ Debes abrir un turno de caja antes de agregar productos
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Resumen del carrito y botón siguiente */}
        <div className="bg-slate-800 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-white">Carrito</h3>
            <div className="flex items-center space-x-2 text-teal-400">
              <ShoppingCartIcon className="w-5 h-5" />
              <span className="font-medium">{carrito.length} items</span>
            </div>
          </div>
          
          {carrito.length > 0 ? (
            <>
              {/* Lista resumida del carrito */}
              <div className="space-y-2 mb-4">
                {carrito.slice(0, 3).map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="truncate text-slate-300">{item.nombre}</span>
                    <span className="font-medium text-white">${item.subtotal.toLocaleString()}</span>
                  </div>
                ))}
                {carrito.length > 3 && (
                  <p className="text-xs text-slate-500 text-center">
                    +{carrito.length - 3} productos más...
                  </p>
                )}
              </div>
              
              {/* Total */}
              <div className="border-t border-slate-700 pt-3 mb-4">
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-white">Total:</span>
                  <span className="text-teal-400">
                    ${carrito.reduce((total, item) => total + item.subtotal, 0).toLocaleString()}
                  </span>
                </div>
              </div>
              
              {/* Botón siguiente */}
              <button
                onClick={onSiguiente}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Ver Carrito Completo →
              </button>
            </>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <ShoppingCartIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Carrito vacío</p>
              <p className="text-sm">Selecciona productos para agregar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Los componentes EtapaCarrito y EtapaFinalizacion se crearán en el siguiente archivo...