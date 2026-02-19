'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthService, User } from '@/lib/auth';

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
                console.error('❌ AuthProvider: Error loading user:', error);
                setUser(null);
                // Si hay error al cargar el usuario, limpiar token solo si estamos en rutas protegidas
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
