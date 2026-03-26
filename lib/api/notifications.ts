import { AuthService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown> | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

async function authHeaders() {
  const token = AuthService.getToken();
  return { Authorization: `Bearer ${token}` };
}

export async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch(`${API_URL}/api/notifications/`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Error al cargar notificaciones');
  return res.json();
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await fetch(`${API_URL}/api/notifications/count`, {
    headers: await authHeaders(),
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.unread;
}

export async function markNotificationRead(id: number): Promise<void> {
  await fetch(`${API_URL}/api/notifications/${id}/read`, {
    method: 'PATCH',
    headers: await authHeaders(),
  });
}

export function createNotificationStream(token: string): EventSource {
  return new EventSource(`${API_URL}/api/notifications/stream?token=${token}`);
}
