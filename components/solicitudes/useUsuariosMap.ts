declare global {
  interface Window {
    solicitudIds?: number[];
  }
}
import { useEffect, useState } from "react";

export interface Usuario {
  id: number;
  nombre_completo: string;
}

export function useUsuariosMap() {
  const [usuariosMap, setUsuariosMap] = useState<Record<number, Usuario>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const headers = require('../../lib/auth').AuthService.getAuthHeaders();
    // IDs a consultar: solicitante y finalizador
    const ids = window.solicitudIds || [];
    if (ids.length === 0) return;
    Promise.all(ids.map(id =>
      fetch(`${API_URL}/api/admin/users/${id}`, { headers })
        .then(async res => {
          if (!res.ok) return null;
          try { return await res.json(); } catch { return null; }
        })
    )).then((usuarios) => {
      const map: Record<number, Usuario> = {};
      usuarios.forEach(u => { if (u) map[u.id] = u; });
      setUsuariosMap(map);
    }).catch(err => setError('Error al cargar usuarios'));
  }, []);
  return { usuariosMap, error };

  return usuariosMap;
}
