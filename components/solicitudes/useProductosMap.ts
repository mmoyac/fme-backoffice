import { useEffect, useState } from "react";
import { getProductos } from "@/lib/api/productos";

export function useProductosMap() {
  const [productosMap, setProductosMap] = useState<Record<number, { id: number; nombre: string }>>({});
  useEffect(() => {
    getProductos().then((productos) => {
      const map: Record<number, { id: number; nombre: string }> = {};
      productos.forEach((p) => { map[p.id] = { id: p.id, nombre: p.nombre }; });
      setProductosMap(map);
    });
  }, []);
  return productosMap;
}
