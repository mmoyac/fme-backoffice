'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
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
    // Token con el que se cargó el usuario actual. El efecto corre en cada navegación (así detecta
    // el login, que guarda el token y navega), pero solo pide /users/me si el token cambió.
    const tokenCargado = useRef<string | null>(null);

    useEffect(() => {
        const token = AuthService.isAuthenticated() ? AuthService.getToken() : null;

        if (!token) {
            tokenCargado.current = null;
            setUser(null);
            setLoading(false);
            if (pathname?.startsWith('/admin')) router.push('/login');
            return;
        }
        if (token === tokenCargado.current) return; // usuario ya cargado para esta sesión

        let cancelado = false;
        async function loadUser() {
            try {
                const currentUser = await AuthService.getCurrentUser();
                if (cancelado) return;
                tokenCargado.current = token;
                setUser({ ...currentUser, access_token: token });
            } catch (error) {
                if (cancelado) return;
                // Si la API no responde (red caída, timeout, 5xx) NO se cierra la sesión:
                // se sigue con el último usuario cargado para no interrumpir la operación.
                const cachedUser = esErrorDeRed(error) ? AuthService.getCachedUser() : null;
                if (cachedUser) {
                    console.warn('⚠️ AuthProvider: API no disponible, usando usuario en caché:', cachedUser.email);
                    tokenCargado.current = token;
                    setUser({ ...cachedUser, access_token: token });
                    return;
                }
                console.error('❌ AuthProvider: Error loading user:', error);
                tokenCargado.current = null;
                setUser(null);
                // Sesión inválida (401) o sin respaldo en caché: volver al login
                if (pathname?.startsWith('/admin')) {
                    AuthService.logout();
                    router.push('/login');
                }
            } finally {
                if (!cancelado) setLoading(false);
            }
        }

        loadUser();
        return () => { cancelado = true; };
    }, [pathname, router]);

    const logout = useCallback(() => {
        tokenCargado.current = null;
        setUser(null);
        AuthService.logout();
    }, []);

    const value = useMemo(() => ({ user, loading, logout }), [user, loading, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
