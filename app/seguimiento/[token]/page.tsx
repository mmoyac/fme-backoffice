import { notFound } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ORDEN_ESTADOS = ['PENDIENTE', 'CONFIRMADO', 'EN_PREPARACION', 'EN_RUTA', 'ENTREGADO'];
const ETIQUETAS = ['Recibido', 'Confirmado', 'En preparación', 'En ruta', 'Entregado'];

const DESPACHO_CONFIG: Record<string, { icono: string; color: string }> = {
  entregado: { icono: '✅', color: '#22c55e' },
  en_ruta:   { icono: '🚚', color: '#f59e0b' },
  listo:     { icono: '📦', color: '#3b82f6' },
  pendiente: { icono: '⏳', color: '#94a3b8' },
};

interface DespachoData {
  estado: string;
  label: string;
  descripcion: string;
}

interface ItemData {
  producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface SeguimientoData {
  numero_pedido: string;
  fecha_pedido: string;
  cliente_nombre: string;
  monto_total: number;
  estado_codigo: string;
  estado_nombre: string;
  color_estado: string;
  tiene_delivery: boolean;
  despacho: DespachoData | null;
  items: ItemData[];
}

export default async function SeguimientoPage({
  params,
}: {
  params: { token: string };
}) {
  const res = await fetch(
    `${API_URL}/api/pedidos/seguimiento-data/${params.token}`,
    { cache: 'no-store' }
  );

  if (!res.ok) return notFound();

  const data: SeguimientoData = await res.json();

  const pasoActual = ORDEN_ESTADOS.indexOf(data.estado_codigo);

  return (
    <div className="min-h-screen bg-slate-900 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-xl">
        {/* Encabezado */}
        <div className="bg-slate-800 rounded-t-xl px-6 py-5 text-center border-b border-slate-700">
          <h1 className="text-xl font-bold text-white">Seguimiento de Pedido</h1>
          <p className="text-teal-400 font-mono text-sm mt-1">{data.numero_pedido}</p>
        </div>

        <div className="bg-slate-800 rounded-b-xl px-6 py-6 space-y-6">
          {/* Info básica */}
          <div className="text-sm text-slate-400 space-y-1">
            <p>Fecha: <span className="text-white font-medium">{data.fecha_pedido}</span></p>
            <p>Cliente: <span className="text-white font-medium">{data.cliente_nombre}</span></p>
          </div>

          {/* Progreso */}
          <div className="relative flex justify-between">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-600 z-0" />
            {ETIQUETAS.map((etiqueta, i) => {
              const completado = i < pasoActual;
              const actual = i === pasoActual;
              return (
                <div key={i} className="flex flex-col items-center z-10 flex-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: completado ? '#22c55e' : actual ? '#14b8a6' : '#334155',
                      color: 'white',
                    }}
                  >
                    {completado ? '✓' : i + 1}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 text-center leading-tight">
                    {etiqueta}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Estado despacho */}
          {data.despacho && (() => {
            const cfg = DESPACHO_CONFIG[data.despacho!.estado] ?? DESPACHO_CONFIG.pendiente;
            return (
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 flex items-start gap-3">
                <span className="text-2xl">{cfg.icono}</span>
                <div>
                  <p className="font-semibold text-sm" style={{ color: cfg.color }}>
                    {data.despacho!.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{data.despacho!.descripcion}</p>
                </div>
              </div>
            );
          })()}

          {/* Detalle productos */}
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Detalle del pedido</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left pb-2 font-normal">Producto</th>
                  <th className="text-center pb-2 font-normal">Cant.</th>
                  <th className="text-right pb-2 font-normal">Precio</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, i) => (
                  <tr key={i} className="border-b border-slate-700/50">
                    <td className="py-2 text-slate-200">{item.producto}</td>
                    <td className="py-2 text-center text-slate-300">{item.cantidad}</td>
                    <td className="py-2 text-right text-slate-200">
                      ${item.subtotal.toLocaleString('es-CL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right mt-3 font-bold text-white">
              Total: ${data.monto_total.toLocaleString('es-CL')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
