'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthService, User } from '@/lib/auth';
import { esErrorDeRed } from '@/lib/net';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    logout: () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        async function loadUser() {
            // `finally` (setLoading(false)) también corre tras el `return` del catch
            try {
                const hasToken = AuthService.isAuthenticated();
                console.log('🔐 AuthProvider: pathname =', pathname, ', hasToken =', hasToken);
                
                if (hasToken) {
                    console.log('🔐 AuthProvider: Token encontrado, cargando usuario...');
                    const currentUser = await AuthService.getCurrentUser();
                    const token = AuthService.getToken();
                    // Agregar el token al objeto user
                    setUser({
                        ...currentUser,
                        access_token: token
                    });
                    console.log('✅ AuthProvider: Usuario cargado:', currentUser.email);
                } else {
                    console.log('⚠️ AuthProvider: No hay token, usuario no autenticado');
                    setUser(null);
                    // Si no está autenticado y está en ruta protegida, redirigir
                    if (pathname?.startsWith('/admin')) {
                        console.log('🔀 AuthProvider: Redirigiendo a /login desde', pathname);
                        router.push('/login');
                    }
                }
            } catch (error) {
                // Si la API no responde (red caída, timeout, 5xx) NO se cierra la sesión:
                // se sigue con el último usuario cargado para no interrumpir la operación.
                const cachedUser = esErrorDeRed(error) ? AuthService.getCachedUser() : null;
                if (cachedUser) {
                    console.warn('⚠️ AuthProvider: API no disponible, usando usuario en caché:', cachedUser.email);
                    setUser({ ...cachedUser, access_token: AuthService.getToken() });
                    return;
                }
                console.error('❌ AuthProvider: Error loading user:', error);
                setUser(null);
                // Sesión inválida (401) o sin respaldo en caché: volver al login
                if (pathname?.startsWith('/admin')) {
                    AuthService.logout();
                    router.push('/login');
                }
            } finally {
                setLoading(false);
            }
        }

        loadUser();
    }, [pathname, router]);

    const logout = () => {
        setUser(null);
        AuthService.logout();
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
