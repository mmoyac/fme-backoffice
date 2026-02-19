'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/auth';
import { useTenant } from '@/lib/TenantContext';
import { useAuth } from '@/lib/AuthProvider';

export default function LoginPage() {
    const router = useRouter();
    const { config, loading: tenantLoading } = useTenant();
    const { loading: authLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        console.log('🔑 Login: Iniciando sesión con:', email);

        try {
            await AuthService.login({ username: email, password });
            console.log('✅ Login: Token obtenido exitosamente');
            
            // Esperar un momento para que el AuthProvider actualice el estado
            await new Promise(resolve => setTimeout(resolve, 100));
            
            router.push('/admin/dashboard');
        } catch (err: any) {
            console.error('❌ Login: Error en autenticación:', err.message);
            setError(err.message || 'Error al iniciar sesión');
            setLoading(false);
        }
    };

    // Detectar si es un error de cuenta suspendida
    const isSuspendedError = error.toLowerCase().includes('suspend') || error.toLowerCase().includes('suspendida');

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>

            <div className="relative z-10 w-full max-w-md px-6">
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8">
                    {/* Logo/Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mb-4 shadow-lg">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {tenantLoading ? 'Cargando...' : (config?.branding.nombre_comercial || config?.tenant.nombre || 'Backoffice')}
                        </h1>
                        <p className="text-slate-400">Panel de Administración</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className={`mb-6 p-4 rounded-lg border ${
                            isSuspendedError 
                                ? 'bg-red-900/30 border-red-600/50' 
                                : 'bg-red-500/10 border-red-500/50'
                        }`}>
                            <div className="flex items-start space-x-3">
                                {isSuspendedError && (
                                    <div className="flex-shrink-0 text-3xl">🚫</div>
                                )}
                                <div className="flex-1">
                                    <p className={`text-sm ${
                                        isSuspendedError ? 'text-red-200 font-semibold' : 'text-red-400'
                                    }`}>
                                        {error}
                                    </p>
                                    {isSuspendedError && (
                                        <p className="text-xs text-red-300 mt-2">
                                            Esta cuenta ha sido desactivada. Por favor contacta con el administrador del sistema.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                                Correo Electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                placeholder="admin@fme.cl"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Iniciando sesión...
                                </span>
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </button>
                    </form>

                    {/* Footer Info */}
                    <div className="mt-6 pt-6 border-t border-slate-700">
                        <p className="text-center text-sm text-slate-500">
                            Credenciales por defecto:<br />
                            <span className="text-slate-400 font-mono">admin@fme.cl / admin</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
