import { useEffect, useState } from "react";
import { getProductos, Producto } from "@/lib/api/productos";

export function useProductosList() {
  const [productos, setProductos] = useState<Producto[]>([]);
  useEffect(() => {
    getProductos().then(setProductos);
  }, []);
  return productos;
}
