// Formulario para crear/editar solicitudes de transferencia

import { SolicitudTransferencia, SolicitudTransferenciaCreate } from "../../types/solicitud";
import React, { useState, useEffect } from "react";
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
  const [items, setItems] = useState<{ producto_id: number; cantidad_solicitada: number }[]>(
    solicitud?.items?.map(i => ({ producto_id: i.producto_id, cantidad_solicitada: i.cantidad_solicitada })) || []
  );
  const [nota, setNota] = useState<string>(solicitud?.nota || "");
  const stockMap = useStockEdicionSolicitud(items, Number(localOrigen));

  useEffect(() => {
    // Cargar locales
    getLocales().then(setLocales).catch(() => setLocales([]));
    // Cargar estados de enrolamiento
    getEstadosEnrolamiento().then((data) => {
      setEstados(data);
      // Buscar el id del estado PENDIENTE
      const pendiente = data.find((e: any) => e.codigo === "PENDIENTE");
      setEstado(solicitud?.estado_id || pendiente?.id || (data[0]?.id ?? 1));
    });
    // Si estamos editando, inicializar items
    if (solicitud?.items) {
      setItems(solicitud.items.map(i => ({ producto_id: i.producto_id, cantidad_solicitada: i.cantidad_solicitada })));
    } else {
      setItems([]);
    }
  }, [solicitud]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localOrigen || !localDestino) {
      setError("Debes seleccionar ambos locales.");
      return;
    }
    if (localOrigen === localDestino) {
      setError("El local origen y destino deben ser distintos.");
      return;
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
    onSubmit({
      tenant_id: (user as any)?.tenant_id || 1,
      usuario_solicitante_id: user?.id || 1,
      local_origen_id: Number(localOrigen),
      local_destino_id: Number(localDestino),
      estado_id: Number(estado),
      items,
      nota: nota.trim() || undefined,
    });
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="bg-red-500/10 text-red-400 px-3 py-2 rounded mb-2 text-sm">{error}</div>}
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-1">Local Origen (a quien solicitas)</label>
        <select
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
          value={localOrigen}
          onChange={e => setLocalOrigen(e.target.value)}
        >
          <option value="">Selecciona un local</option>
          {locales
            .filter(l => l.id !== localDestino && l.codigo !== 'WEB') // Excluir mi local y la tienda online
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
      {/* El campo de estado se oculta en crear y editar */}

      {/* Nota u observaciones */}
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-1">Nota u observaciones</label>
        <textarea
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px]"
          value={nota}
          onChange={e => setNota(e.target.value)}
          maxLength={500}
          placeholder="Agrega una nota opcional para el local origen..."
        />
      </div>
      {/* Productos y cantidades */}
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-1">Productos solicitados</label>
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
                >
                  <option value="">Producto</option>
                  {productos
                    .filter(p =>
                      // Mostrar el producto si no está seleccionado en otra fila, o si es el de esta fila
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
                >✕</button>
              </div>
            );
          })}
          <button
            type="button"
            className="mt-2 px-3 py-1 rounded bg-slate-600 text-gray-200 hover:bg-slate-500 text-xs"
            onClick={() => setItems(items => [...items, { producto_id: 0, cantidad_solicitada: 1 }])}
          >
            + Agregar producto
          </button>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button
          type="button"
          className="px-4 py-2 rounded bg-slate-600 text-gray-200 hover:bg-slate-500 transition-colors"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded bg-primary text-slate-900 font-semibold hover:bg-primary-dark transition-colors"
          disabled={submitting}
        >
          {solicitud ? "Actualizar" : "Crear"}
        </button>
      </div>
    </form>
  );
};

export default SolicitudForm;
