import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function AdminPage() {
  // Obtener el token del usuario
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) {
    redirect('/login');
  }

  // Obtener menú permitido desde la API
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  // En server components, no hay window, así que usa headers
  const currentHostname = cookieStore.get('host')?.value || 'localhost';
  const res = await fetch(`${apiUrl}/api/auth/menu`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Forwarded-Host': currentHostname
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    redirect('/login');
  }
  const menu = await res.json();
  if (!Array.isArray(menu) || menu.length === 0) {
    // Si no tiene ningún menú permitido, redirigir a login o mostrar error
    redirect('/login');
  }
  // Redirigir al primer menú permitido
  redirect(menu[0].href);
}
