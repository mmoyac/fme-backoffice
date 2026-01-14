// Componente para la etapa de revisión del carrito
import { XMarkIcon, PencilIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface EtapaCarritoProps {
  carrito: any[];
  eliminarDelCarrito: (itemId: string) => void;
  totalCarrito: number;
  onAnterior: () => void;
  onSiguiente: () => void;
}

export function EtapaCarrito({
  carrito,
  eliminarDelCarrito,
  totalCarrito,
  onAnterior,
  onSiguiente
}: EtapaCarritoProps) {

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Revisar Carrito</h2>
        <p className="text-slate-400">Verifica los productos y cantidades antes de continuar</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de productos en el carrito */}
        <div className="lg:col-span-2 space-y-4">
          {carrito.length > 0 ? (
            carrito.map((item) => (
              <div key={item.id} className="bg-slate-800 rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  {/* Información del producto */}
                  <div className="flex-1">
                    <h3 className="font-medium text-white mb-1">{item.nombre}</h3>
                    <p className="text-sm text-slate-400 mb-2">SKU: {item.sku}</p>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-slate-300">
                        {item.tipo_venta_codigo === 'PESO_SUELTO' ? 'Peso:' : 'Cantidad:'} 
                        <span className="font-medium ml-1">
                          {item.cantidad} {item.tipo_venta_codigo === 'PESO_SUELTO' ? 'kg' : 'unid.'}
                        </span>
                      </span>
                      
                      <span className="text-slate-300">
                        Precio: <span className="font-medium">${item.precio_unitario.toLocaleString()}</span>
                      </span>
                    </div>
                  </div>
                  
                  {/* Subtotal y acciones */}
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-teal-400">
                        ${item.subtotal.toLocaleString()}
                      </p>
                    </div>
                    
                    {/* Botones de acción */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          // TODO: Implementar edición de cantidad
                          console.log('Editar item:', item.id);
                        }}
                        className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Editar cantidad"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => eliminarDelCarrito(item.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Eliminar producto"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-slate-800 rounded-lg shadow-sm p-8 text-center">
              <p className="text-slate-400 text-lg">El carrito está vacío</p>
              <p className="text-slate-500 text-sm mt-2">Agrega productos desde la etapa anterior</p>
            </div>
          )}
        </div>
        
        {/* Panel lateral: Resumen y navegación */}
        <div className="space-y-4">
          {/* Resumen del pedido */}
          <div className="bg-slate-800 rounded-lg shadow-sm p-6">
            <h3 className="font-bold text-lg text-white mb-4">Resumen del Pedido</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Productos:</span>
                <span className="font-medium text-white">{carrito.length} items</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal:</span>
                <span className="font-medium text-white">${totalCarrito.toLocaleString()}</span>
              </div>
              
              <div className="border-t border-slate-700 pt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-white">Total:</span>
                  <span className="text-teal-400">${totalCarrito.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Botones de navegación */}
          <div className="space-y-3">
            <button
              onClick={onAnterior}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>← Volver a Productos</span>
            </button>
            
            <button
              onClick={onSiguiente}
              disabled={carrito.length === 0}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <span>Finalizar Pedido</span>
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}