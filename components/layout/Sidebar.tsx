'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';

interface MenuItem {
  nombre: string;
  href: string;
  icon: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMenu() {
      if (!user) return;
      try {
        const token = AuthService.getToken();
        // Usar fetch directo o un helper si existe. 
        // Usaremos el NEXT_PUBLIC_API_URL del environment
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        const res = await fetch(`${apiUrl}/api/auth/menu`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          const data = await res.json();
          setMenuItems(data);
        } else {
          console.error('Error fetching menu:', res.statusText);
        }
      } catch (error) {
        console.error('Error fetching menu:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMenu();
  }, [user]);

  return (
    <div className="w-64 bg-slate-800 min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Masas Estación</h1>
        <p className="text-sm text-gray-400">Backoffice</p>
      </div>

      <nav className="space-y-2 flex-1">
        {loading ? (
          // Skeleton loader simple
          [1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-slate-700/50 rounded-lg animate-pulse" />
          ))
        ) : (
          menuItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                  ? 'bg-primary text-slate-900 font-semibold'
                  : 'text-gray-300 hover:bg-slate-700'
                  }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.nombre}</span>
              </Link>
            );
          })
        )}
      </nav>

      {/* User Info & Logout */}
      <div className="mt-auto pt-4 border-t border-slate-700">
        {user && (
          <div className="mb-3 px-4 py-2">
            <p className="text-xs text-slate-500">Sesión iniciada como:</p>
            <p className="text-sm text-white font-medium truncate">{user.nombre_completo}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
            {user.role && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-amber-500 border border-slate-600 uppercase tracking-wider">
                {user.role.nombre}
              </span>
            )}
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <span className="text-xl">🚪</span>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}

