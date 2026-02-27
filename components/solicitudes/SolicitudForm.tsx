// Formulario para crear/editar solicitudes de transferencia

import { SolicitudTransferencia, SolicitudTransferenciaCreate } from "../../types/solicitud";
import React, { useState, useEffect } from "react";
import { generarPDFSolicitudHTML } from "./generarPDFSolicitudHTML";
import SolicitudPDFResumen from "./SolicitudPDFResumen";
import { useAuth } from "@/lib/AuthProvider";
import { getEstadosEnrolamiento } from "@/lib/api/recepcion";
import { getLocales, Local } from "@/lib/api/locales";
import { useProductosList } from "./useProductosList";
import { useStockEdicionSolicitud } from "./useStockEdicionSolicitud";

interface Props {
  solicitud?: SolicitudTransferencia | null;
  onSubmit: (data: SolicitudTransferenciaCreate) => void;
  onCancel: () => void;
}

const SolicitudForm: React.FC<Props> = ({ solicitud, onSubmit, onCancel }) => {

  const { user } = useAuth();
  const [locales, setLocales] = useState<Local[]>([]);
  const [localOrigen, setLocalOrigen] = useState(solicitud?.local_origen_id || "");
  // El local de destino es el local_defecto_id del usuario autenticado
  const localDestino = user?.local_defecto_id || "";
  const [estados, setEstados] = useState<{ id: number; nombre: string; codigo: string }[]>([]);
  // Estado por defecto: PENDIENTE (buscar por código)
  const [estado, setEstado] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const productos = useProductosList();
  // Para PDF
  const [localesMap, setLocalesMap] = useState<Record<number, any>>({});
  const [productosMap, setProductosMap] = useState<Record<number, any>>({});
  const [items, setItems] = useState<{ producto_id: number; cantidad_solicitada: number; cantidad_aprobada?: number }[]>(
    solicitud?.items?.map(i => ({ producto_id: i.producto_id, cantidad_solicitada: i.cantidad_solicitada, cantidad_aprobada: i.cantidad_aprobada })) || []
  );
  const [nota, setNota] = useState<string>(solicitud?.nota || "");
  const [showConfirmFinalizar, setShowConfirmFinalizar] = useState(false);
  const stockMap = useStockEdicionSolicitud(items, Number(localOrigen));

  // Estados
  const ESTADO_PENDIENTE = estados.find(e => e.codigo === "PENDIENTE")?.id;
  const ESTADO_EN_PROCESO = estados.find(e => e.codigo === "EN_PROCESO")?.id;
  const ESTADO_FINALIZADO = estados.find(e => e.codigo === "FINALIZADO")?.id;

  // Determinar rol del usuario respecto a la solicitud
  const esLocalDestino = solicitud ? user?.local_defecto_id === solicitud.local_destino_id : true;
  const esLocalOrigen = solicitud ? user?.local_defecto_id === solicitud.local_origen_id : false;
  const estadoActual = solicitud?.estado_id || estado;

  useEffect(() => {
    // Cargar locales
    getLocales().then(ls => {
      setLocales(ls);
      const map: Record<number, any> = {};
      ls.forEach(l => { map[l.id] = l; });
      setLocalesMap(map);
    }).catch(() => setLocales([]));
    // Cargar estados de enrolamiento
    getEstadosEnrolamiento().then((data) => {
      setEstados(data);
      // Buscar el id del estado PENDIENTE
      const pendiente = data.find((e: any) => e.codigo === "PENDIENTE");
      setEstado(solicitud?.estado_id || pendiente?.id || (data[0]?.id ?? 1));
    });
    // Si estamos editando, inicializar items
    if (solicitud?.items) {
      setItems(solicitud.items.map(i => ({
        producto_id: i.producto_id,
        cantidad_solicitada: i.cantidad_solicitada,
        cantidad_aprobada: i.cantidad_aprobada
      })));
    } else {
      setItems([]);
    }
    // Map de productos para PDF
    const mapProd: Record<number, any> = {};
    productos.forEach(p => { mapProd[p.id] = p; });
    setProductosMap(mapProd);
  }, [solicitud, productos]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Solo validar locales al crear (no al editar)
    if (!solicitud) {
      if (!localOrigen || !localDestino) {
        setError("Debes seleccionar ambos locales.");
        return;
      }
      if (localOrigen === localDestino) {
        setError("El local origen y destino deben ser distintos.");
        return;
      }
    }
    if (items.length === 0) {
      setError("Debes agregar al menos un producto.");
      return;
    }
    if (items.some(i => !i.producto_id || i.cantidad_solicitada === undefined || i.cantidad_solicitada === null || isNaN(i.cantidad_solicitada) || i.cantidad_solicitada <= 0)) {
      setError("Todos los productos deben tener cantidad mayor a cero.");
      return;
    }
    // Validar productos duplicados
    const productosSet = new Set<number>();
    for (const i of items) {
      if (productosSet.has(i.producto_id)) {
        setError("No puedes agregar el mismo producto más de una vez.");
        return;
      }
      productosSet.add(i.producto_id);
    }
    setError("");
    setSubmitting(true);
    // Si es edición EN_PROCESO, validar cantidad_aprobada <= stock
    if (solicitud && estadoActual === ESTADO_EN_PROCESO && esLocalOrigen) {
      for (const i of items) {
        const stock = stockMap[i.producto_id];
        if (typeof i.cantidad_aprobada === 'number' && typeof stock === 'number' && i.cantidad_aprobada > stock) {
          setError(`La cantidad aprobada para el producto ${productos.find(p => p.id === i.producto_id)?.nombre || i.producto_id} no puede superar el stock actual (${stock}).`);
          setSubmitting(false);
          return;
        }
      }
      onSubmit({
        estado_id: Number(estado),
        items: items.map(i => ({ producto_id: i.producto_id, cantidad_solicitada: i.cantidad_solicitada, cantidad_aprobada: i.cantidad_aprobada })),
        nota: nota.trim() || undefined,
        tenant_id: (user as any)?.tenant_id || 1,
        usuario_solicitante_id: user?.id || 1,
        local_origen_id: Number(localOrigen),
        local_destino_id: Number(localDestino),
      });
    } else {
      onSubmit({
        tenant_id: (user as any)?.tenant_id || 1,
        usuario_solicitante_id: user?.id || 1,
        local_origen_id: Number(localOrigen),
        local_destino_id: Number(localDestino),
        estado_id: Number(estado),
        items,
        nota: nota.trim() || undefined,
      });
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="bg-red-500/10 text-red-400 px-3 py-2 rounded mb-2 text-sm">{error}</div>}
      {/* Mostrar campos de local origen/destino solo al crear */}
      {!solicitud && (
        <>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Local Origen (a quien solicitas)</label>
            <select
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
              value={localOrigen}
              onChange={e => setLocalOrigen(e.target.value)}
            >
              <option value="">Selecciona un local</option>
              {locales
                .filter(l => l.id !== localDestino && l.codigo !== 'WEB')
                .map(l => (
                  <option key={l.id} value={l.id}>{l.nombre} ({l.codigo})</option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Local Destino (mi local)</label>
            <input
              type="text"
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-gray-400 focus:outline-none"
              value={locales.find(l => l.id === Number(localDestino))?.nombre || localDestino}
              readOnly
            />
          </div>
        </>
      )}

      {/* Estado y acciones según rol y estado */}
      {solicitud && esLocalOrigen && estadoActual === ESTADO_PENDIENTE && (
        <div className="bg-slate-800 p-3 rounded flex flex-col gap-2 mb-2">
          <div className="text-xs text-gray-400 mb-1">Esta solicitud está pendiente. Haz clic en <b>Comenzar atención</b> para iniciar el proceso y poder editar cantidades aprobadas.</div>
          <button
            type="button"
            className="px-4 py-2 rounded bg-primary text-slate-900 font-semibold hover:bg-primary-dark transition-colors"
            onClick={async () => {
              setSubmitting(true);
              // Llamar a onSubmit solo para cambiar el estado a EN_PROCESO
              await onSubmit({
                ...solicitud,
                estado_id: ESTADO_EN_PROCESO ?? 1,
                items: solicitud.items.map(i => ({ producto_id: i.producto_id, cantidad_solicitada: i.cantidad_solicitada }))
              });
              setSubmitting(false);
            }}
            disabled={submitting}
          >
            Comenzar atención
          </button>
        </div>
      )}
      {solicitud && esLocalOrigen && estadoActual === ESTADO_EN_PROCESO && (
        <div className="bg-slate-800 p-3 rounded mb-2">
          <div className="mb-2 text-xs text-gray-400">Como local origen, puedes aprobar cantidades y finalizar la solicitud.</div>
        </div>
      )}

      {/* Nota u observaciones */}
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-1">Nota u observaciones</label>
        <textarea
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px]"
          value={nota}
          onChange={e => setNota(e.target.value)}
          maxLength={500}
          placeholder="Agrega una nota opcional para el local origen..."
            disabled={!!solicitud && estadoActual === ESTADO_FINALIZADO}
        />
      </div>

      {/* Productos y cantidades */}
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-1">Productos solicitados</label>
        {/* Tabla de productos en edición EN_PROCESO */}
        {solicitud && estadoActual === ESTADO_EN_PROCESO ? (
          <table className="min-w-full bg-slate-700 rounded">
            <thead>
              <tr>
                <th className="px-2 py-1 text-xs text-gray-300">Producto</th>
                <th className="px-2 py-1 text-xs text-gray-300">Cantidad solicitada</th>
                <th className="px-2 py-1 text-xs text-gray-300">Stock actual</th>
                {esLocalOrigen && <th className="px-2 py-1 text-xs text-green-300">Cantidad aprobada</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const stock = stockMap[item.producto_id];
                return (
                  <tr key={idx}>
                    <td className="px-2 py-1 text-gray-200">{productos.find(p => p.id === item.producto_id)?.nombre || item.producto_id}</td>
                    <td className="px-2 py-1 text-gray-200 text-center">{item.cantidad_solicitada}</td>
                    <td className="px-2 py-1 text-blue-300 text-center">{typeof stock === 'number' ? stock : '-'}</td>
                    {esLocalOrigen && (
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min={0}
                          className="w-24 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-green-300"
                          placeholder="Cantidad aprobada"
                          value={item.cantidad_aprobada ?? ""}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setItems(items => items.map((it, i) => i === idx ? { ...it, cantidad_aprobada: val } : it));
                          }}
                          disabled={solicitud && estadoActual === ESTADO_FINALIZADO}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => {
              const stock = stockMap[item.producto_id];
              const suficiente = typeof stock === 'number' && item.cantidad_solicitada <= stock;
              return (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-gray-200"
                    value={item.producto_id || ""}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setItems(items => items.map((it, i) => i === idx ? { ...it, producto_id: val } : it));
                    }}
                    disabled={!!solicitud && estadoActual === ESTADO_FINALIZADO}
                  >
                    <option value="">Producto</option>
                    {productos
                      .filter(p =>
                        !items.some((it, i) => i !== idx && it.producto_id === p.id)
                      )
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-gray-200"
                    placeholder="Cantidad"
                    value={item.cantidad_solicitada || ""}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setItems(items => items.map((it, i) => i === idx ? { ...it, cantidad_solicitada: val } : it));
                    }}
                    disabled={!!solicitud && estadoActual === ESTADO_FINALIZADO}
                  />
                  {typeof stock === 'number' && (
                    <span className={suficiente ? "text-green-400 ml-2 text-xs" : "text-red-400 ml-2 text-xs"}>
                      [Stock: {stock}] {suficiente ? "✔" : "⚠"}
                    </span>
                  )}
                  <button
                    type="button"
                    className="text-red-400 hover:text-red-300 px-2"
                    onClick={() => setItems(items => items.filter((_, i) => i !== idx))}
                    title="Quitar"
                    disabled={!!solicitud && estadoActual === ESTADO_FINALIZADO}
                  >✕</button>
                </div>
              );
            })}
            {/* Solo permitir agregar productos si no está finalizado ni en proceso */}
            {!solicitud || (estadoActual !== ESTADO_FINALIZADO && estadoActual !== ESTADO_EN_PROCESO) ? (
              <button
                type="button"
                className="mt-2 px-3 py-1 rounded bg-slate-600 text-gray-200 hover:bg-slate-500 text-xs"
                onClick={() => setItems(items => [...items, { producto_id: 0, cantidad_solicitada: 1 }])}
              >
                + Agregar producto
              </button>
            ) : null}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-6 items-center">
        {/* Botón PDF si está finalizada */}
        {solicitud && estadoActual === ESTADO_FINALIZADO && (
          <button
            type="button"
            className="px-3 py-2 rounded bg-slate-500 text-white hover:bg-slate-400 text-xs mr-2"
            onClick={async () => {
              // Crear un div temporal oculto
              const tempDiv = document.createElement('div');
              tempDiv.style.position = 'fixed';
              tempDiv.style.left = '-9999px';
              tempDiv.style.top = '0';
              tempDiv.style.background = '#fff';
              tempDiv.style.zIndex = '99999';
              tempDiv.style.width = '700px';
              tempDiv.style.padding = '32px';
              document.body.appendChild(tempDiv);
              const ReactDOM = await import('react-dom');
              ReactDOM.render(
                <SolicitudPDFResumen solicitud={solicitud} localesMap={localesMap} productosMap={productosMap} />,
                tempDiv
              );
              await generarPDFSolicitudHTML(tempDiv, solicitud.solicitud_id);
              ReactDOM.unmountComponentAtNode(tempDiv);
              document.body.removeChild(tempDiv);
            }}
          >
            Descargar PDF
          </button>
        )}
        <button
          type="button"
          className="px-4 py-2 rounded bg-slate-600 text-gray-200 hover:bg-slate-500 transition-colors"
          onClick={onCancel}
        >
          Cancelar
        </button>
        {solicitud && esLocalOrigen && estadoActual === ESTADO_EN_PROCESO && (
          <button
            type="button"
            className="px-4 py-2 rounded bg-green-500 text-slate-900 font-semibold hover:bg-green-600 transition-colors"
            onClick={() => setShowConfirmFinalizar(true)}
            disabled={submitting}
          >
            Finalizar solicitud
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 rounded bg-primary text-slate-900 font-semibold hover:bg-primary-dark transition-colors"
          disabled={submitting || (!!solicitud && estadoActual === ESTADO_FINALIZADO)}
        >
          {solicitud ? "Actualizar" : "Crear"}
        </button>
      </div>

      {/* Popup de confirmación para finalizar */}
      {showConfirmFinalizar && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full shadow-xl">
            <div className="text-lg font-bold text-white mb-2">¿Finalizar solicitud?</div>
            <div className="text-gray-300 mb-4">Esta acción transferirá el inventario y marcará la solicitud como finalizada. ¿Deseas continuar?</div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                className="px-4 py-2 rounded bg-slate-600 text-gray-200 hover:bg-slate-500"
                onClick={() => setShowConfirmFinalizar(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded bg-green-500 text-slate-900 font-semibold hover:bg-green-600"
                onClick={async () => {
                  setShowConfirmFinalizar(false);
                  setEstado(ESTADO_FINALIZADO ?? null);
                  // Disparar submit para guardar y finalizar
                  setTimeout(() => {
                    document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                  }, 100);
                }}
              >
                Confirmar y finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default SolicitudForm;
