import { useEffect, useState } from "react";

export interface Usuario {
  id: number;
  nombre_completo: string;
}

export function useUsuariosMap(ids: number[]) {
  const [usuariosMap, setUsuariosMap] = useState<Record<number, Usuario>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validIds = ids.filter(Boolean);
    if (validIds.length === 0) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const { AuthService } = require('../../lib/auth');
    const headers = AuthService.getAuthHeaders();
    setLoading(true);
    Promise.all(validIds.map(id =>
      fetch(`${API_URL}/api/admin/users/${id}`, { headers })
        .then(async res => {
          if (!res.ok) return null;
          try { return await res.json(); } catch { return null; }
        })
    )).then((usuarios) => {
      const map: Record<number, Usuario> = {};
      usuarios.forEach(u => { if (u) map[u.id] = u; });
      setUsuariosMap(map);
    }).catch(() => setError('Error al cargar usuarios'))
      .finally(() => setLoading(false));
  }, [ids.join(',')]);

  return { usuariosMap, loading, error };
}
