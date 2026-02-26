import { useEffect, useState } from "react";
import { getEstadosEnrolamiento } from "@/lib/api/recepcion";

export interface EstadoEnrolamiento {
  id: number;
  nombre: string;
  codigo: string;
}

export function useEstadosEnrolamientoMap() {
  const [estadosMap, setEstadosMap] = useState<Record<number, EstadoEnrolamiento>>({});
  useEffect(() => {
    getEstadosEnrolamiento().then((estados) => {
      const map: Record<number, EstadoEnrolamiento> = {};
      estados.forEach((e: EstadoEnrolamiento) => { map[e.id] = e; });
      setEstadosMap(map);
    });
  }, []);
  return estadosMap;
}
