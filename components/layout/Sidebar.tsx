'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { useTenant } from '@/lib/TenantContext';
import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';

interface MenuItem {
  nombre: string;
  href: string;
  icon: string;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { config } = useTenant();
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
        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

        const res = await fetch(`${apiUrl}/api/auth/menu`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Forwarded-Host': currentHostname
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
    <div className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 text-white transform transition-transform duration-300 ease-in-out
      md:relative md:translate-x-0 md:inset-auto md:h-auto md:min-h-screen
      ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
    `}>
      <div className="p-4 flex flex-col h-full">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {config?.branding.nombre_comercial || config?.tenant.nombre || 'Backoffice'}
            </h1>
            <p className="text-sm text-gray-400">Panel de Administración</p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto md:overflow-visible">
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
                  onClick={() => onClose && onClose()} // Close sidebar on mobile when link clicked
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

      </div>
    </div>
  );
}
