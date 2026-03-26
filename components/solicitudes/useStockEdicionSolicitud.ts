import { useEffect, useState } from "react";
import { getStockProductoLocal } from "@/lib/api/inventario";

export function useStockEdicionSolicitud(items: { producto_id: number }[], localOrigenId: number) {
  const [stockMap, setStockMap] = useState<Record<number, number>>({});
  useEffect(() => {
    if (!localOrigenId || items.length === 0) {
      setStockMap({});
      return;
    }
    let cancelled = false;
    const validItems = items.filter(item => item.producto_id > 0);
    if (validItems.length === 0) return;
    Promise.all(
      validItems.map(async (item) => {
        const stock = await getStockProductoLocal(item.producto_id, localOrigenId);
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
  }, [items, localOrigenId]);
  return stockMap;
}
