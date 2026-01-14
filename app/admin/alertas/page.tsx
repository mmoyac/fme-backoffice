'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';

export default function AlertasPage() {
  const { user } = useAuth();

  const alertasDisponibles = [
    {
      titulo: "Productos sin Precio Configurado",
      descripcion: "Productos que han llegado en enrolamientos pero no tienen precio configurado por proveedor",
      icono: "💰",
      href: "/admin/alertas/productos-sin-precio",
      prioridad: "alta",
      color: "orange"
    },
    // Futuras alertas
    {
      titulo: "Stock Bajo",
      descripcion: "Productos con inventario por debajo del mínimo requerido",
      icono: "📉",
      href: "/admin/alertas/stock-bajo",
      prioridad: "media",
      color: "yellow",
      proximamente: true
    },
    {
      titulo: "Productos Próximos a Vencer",
      descripcion: "Lotes con fecha de vencimiento próxima",
      icono: "⏰",
      href: "/admin/alertas/productos-vencimiento",
      prioridad: "alta",
      color: "red",
      proximamente: true
    },
    {
      titulo: "Enrolamientos Pendientes",
      descripcion: "Vehículos esperando ser procesados",
      icono: "🚚",
      href: "/admin/alertas/enrolamientos-pendientes",
      prioridad: "media",
      color: "blue",
      proximamente: true
    }
  ];

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return 'text-red-400 bg-red-600/20 border-red-600/30';
      case 'media': return 'text-yellow-400 bg-yellow-600/20 border-yellow-600/30';
      case 'baja': return 'text-green-400 bg-green-600/20 border-green-600/30';
      default: return 'text-gray-400 bg-gray-600/20 border-gray-600/30';
    }
  };

  const getColorClasses = (color: string) => {
    const colors = {
      orange: 'from-orange-600/20 to-orange-600/5 border-orange-600/30 hover:border-orange-500/50',
      yellow: 'from-yellow-600/20 to-yellow-600/5 border-yellow-600/30 hover:border-yellow-500/50',
      red: 'from-red-600/20 to-red-600/5 border-red-600/30 hover:border-red-500/50',
      blue: 'from-blue-600/20 to-blue-600/5 border-blue-600/30 hover:border-blue-500/50',
      gray: 'from-gray-600/20 to-gray-600/5 border-gray-600/30 hover:border-gray-500/50'
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Alertas del Sistema</h1>
          <p className="text-gray-400 mt-2">
            Monitor de notificaciones y eventos que requieren atención
          </p>
        </div>
      </div>

      {/* Información del usuario */}
      <div className="bg-slate-700/50 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">👤</div>
          <div>
            <div className="text-white font-medium">
              {user?.nombre_completo || 'Usuario'}
            </div>
            <div className="text-gray-400 text-sm">
              Revisando alertas del sistema • {new Date().toLocaleDateString('es-CL')}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de alertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {alertasDisponibles.map((alerta, index) => (
          <div
            key={index}
            className={`
              relative overflow-hidden
              bg-gradient-to-br ${getColorClasses(alerta.color)}
              border rounded-lg p-6
              transition-all duration-300
              ${alerta.proximamente 
                ? 'opacity-60 cursor-not-allowed' 
                : 'hover:scale-[1.02] hover:shadow-lg cursor-pointer'
              }
            `}
          >
            {/* Contenido principal */}
            {alerta.proximamente ? (
              <div>
                {/* Badge de próximamente */}
                <div className="absolute top-4 right-4">
                  <span className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded-full">
                    Próximamente
                  </span>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="text-4xl opacity-50">{alerta.icono}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-white opacity-50">
                        {alerta.titulo}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getPrioridadColor(alerta.prioridad)}`}>
                        {alerta.prioridad}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm opacity-75">
                      {alerta.descripcion}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <Link href={alerta.href} className="block">
                <div className="flex items-start space-x-4">
                  <div className="text-4xl">{alerta.icono}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-white group-hover:text-primary transition-colors">
                        {alerta.titulo}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getPrioridadColor(alerta.prioridad)}`}>
                        {alerta.prioridad}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      {alerta.descripcion}
                    </p>
                    
                    <div className="flex items-center space-x-2 text-primary text-sm font-medium">
                      <span>Ver alertas</span>
                      <span>→</span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Efecto de brillo */}
            {!alerta.proximamente && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                            -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            )}
          </div>
        ))}
      </div>

      {/* Información adicional */}
      <div className="bg-slate-800 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">💡</div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">¿Cómo funcionan las alertas?</h3>
            <div className="text-gray-300 space-y-2 text-sm">
              <p>
                • <strong className="text-white">Prioridad Alta:</strong> Requieren atención inmediata (productos sin precio, vencimientos próximos)
              </p>
              <p>
                • <strong className="text-white">Prioridad Media:</strong> Situaciones que necesitan revisión (stock bajo, enrolamientos pendientes)
              </p>
              <p>
                • <strong className="text-white">Prioridad Baja:</strong> Información general para optimización
              </p>
              <p className="mt-3 text-gray-400">
                Las alertas se actualizan automáticamente cada vez que accedes al sistema.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}