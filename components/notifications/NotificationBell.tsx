'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/auth';
import {
  createNotificationStream,
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  type Notification,
} from '@/lib/api/notifications';

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar conteo inicial
  useEffect(() => {
    fetchUnreadCount().then(setUnread).catch(() => {});
  }, []);

  // Conectar SSE para recibir notificaciones en tiempo real
  useEffect(() => {
    const token = AuthService.getToken();
    if (!token) return;

    const es = createNotificationStream(token);

    es.onmessage = (event) => {
      try {
        const notif: Notification = JSON.parse(event.data);
        setNotifications((prev) => [notif, ...prev]);
        setUnread((prev) => prev + 1);
      } catch {
        // ignorar mensajes malformados
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((prev) => !prev);
    if (!open && notifications.length === 0) {
      setLoading(true);
      try {
        const data = await fetchNotifications();
        setNotifications(data);
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleClick(notif: Notification) {
    if (!notif.read_at) {
      await markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnread((prev) => Math.max(0, prev - 1));
    }
    setOpen(false);
    if (notif.action_url) {
      router.push(notif.action_url);
    }
  }

  function timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return `hace ${Math.floor(diff / 86400)} d`;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón campanita */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        title="Notificaciones"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Notificaciones</span>
            {unread > 0 && (
              <span className="text-xs text-slate-400">{unread} sin leer</span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-700/50">
            {loading && (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">Cargando...</div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="px-4 py-8 text-center text-slate-400 text-sm">
                <div className="text-3xl mb-2">🔔</div>
                Sin notificaciones
              </div>
            )}

            {!loading && notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors flex gap-3 items-start ${
                  !notif.read_at ? 'bg-slate-700/20' : ''
                }`}
              >
                {/* Dot no leída */}
                <div className="mt-1.5 flex-shrink-0">
                  {!notif.read_at ? (
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-transparent" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!notif.read_at ? 'text-white font-medium' : 'text-slate-300'}`}>
                    {notif.title}
                  </p>
                  {notif.body && (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notif.body}</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1">{timeAgo(notif.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
