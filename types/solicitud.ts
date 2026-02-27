export interface ItemSolicitudTransferencia {
  solicitud_item_id: number;
  producto_id: number;
  cantidad_solicitada: number;
  cantidad_aprobada?: number;
  movimiento_inventario_id?: number;
}

export interface SolicitudTransferencia {
  solicitud_id: number;
  tenant_id: number;
  local_origen_id: number;
  local_destino_id: number;
  usuario_solicitante_id: number;
  usuario_finalizador_id?: number;
  estado_id: number;
  nota?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  items: ItemSolicitudTransferencia[];
}

export interface ItemSolicitudTransferenciaCreate {
  producto_id: number;
  cantidad_solicitada: number;
  cantidad_aprobada?: number;
}

export interface SolicitudTransferenciaCreate {
  tenant_id: number;
  local_origen_id: number;
  local_destino_id: number;
  usuario_solicitante_id: number;
  usuario_finalizador_id?: number;
  estado_id: number;
  nota?: string;
  items: ItemSolicitudTransferenciaCreate[];
}

export interface SolicitudTransferenciaUpdate {
  estado_id?: number;
  nota?: string;
  usuario_finalizador_id?: number;
  items?: ItemSolicitudTransferenciaCreate[];
}
