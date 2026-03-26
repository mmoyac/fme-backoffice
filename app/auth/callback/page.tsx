'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function OAuthCallbackInner() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
            const messages: Record<string, string> = {
                cancelled: 'Cancelaste el inicio de sesión con Google.',
                token_exchange_failed: 'Error al comunicarse con Google. Intenta nuevamente.',
                userinfo_failed: 'No se pudo obtener el perfil de Google.',
                invalid_userinfo: 'Google no entregó un perfil válido.',
                tenant_not_found: 'No se encontró una cuenta asociada a este dominio.',
                tenant_inactive: 'La cuenta de esta organización está suspendida.',
                user_inactive: 'Tu cuenta de usuario está desactivada.',
                user_not_registered: 'Tu cuenta de Google no está registrada en el sistema. Contacta al administrador.',
                google_timeout: 'Tiempo de espera agotado al contactar Google. Intenta nuevamente.',
                google_unreachable: 'No se pudo conectar con Google. Intenta nuevamente.',
            };
            setErrorMsg(messages[error] || `Error de autenticación: ${error}`);
            setStatus('error');
            return;
        }

        if (token) {
            localStorage.setItem('fme_auth_token', token);
            window.location.href = '/admin/dashboard';
            return;
        }

        setErrorMsg('Respuesta inválida del servidor de autenticación.');
        setStatus('error');
    }, [searchParams]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-300 text-sm">Iniciando sesión con Google...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
                <div className="text-4xl">🚫</div>
                <h2 className="text-lg font-semibold text-white">Error al iniciar sesión</h2>
                <p className="text-sm text-slate-400">{errorMsg}</p>
                <a
                    href="/login"
                    className="inline-block mt-4 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg text-sm transition-colors"
                >
                    Volver al login
                </a>
            </div>
        </div>
    );
}

export default function OAuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <OAuthCallbackInner />
        </Suspense>
    );
}
