'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (AuthService.isAuthenticated()) {
      router.push('/admin/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
        <p className="mt-4 text-slate-400">Redirigiendo...</p>
      </div>
    </main>
  );
}

