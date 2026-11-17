// Filtros compartidos entre las pestañas de Inventario: se mantienen al cambiar de pestaña.
export interface FiltroCompartido {
  busqueda: string;               // texto de búsqueda por nombre o SKU
  setBusqueda: (v: string) => void;
  local: number;                  // 0 = todos los locales
  setLocal: (v: number) => void;
}

// Respaldo para cuando una pestaña se usa sin la página contenedora
export const FILTRO_VACIO: FiltroCompartido = {
  busqueda: '',
  setBusqueda: () => {},
  local: 0,
  setLocal: () => {},
};
