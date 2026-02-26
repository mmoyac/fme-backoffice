import { useEffect, useState } from "react";
import { getStockProductoLocal } from "@/lib/api/inventario";

export function useStockProductosLocal(productos: { producto_id: number }[], localId: number) {
  const [stockMap, setStockMap] = useState<Record<number, number>>({});
  useEffect(() => {
    if (!localId || productos.length === 0) {
      setStockMap({});
      return;
    }
    let cancelled = false;
    Promise.all(
      productos.map(async (item) => {
        const stock = await getStockProductoLocal(item.producto_id, localId);
        return { producto_id: item.producto_id, stock };
      })
    ).then(results => {
      if (!cancelled) {
        const map: Record<number, number> = {};
        results.forEach(r => { map[r.producto_id] = r.stock; });
        setStockMap(map);
      }
    });
    return () => { cancelled = true; };
  }, [productos, localId]);
  return stockMap;
}
