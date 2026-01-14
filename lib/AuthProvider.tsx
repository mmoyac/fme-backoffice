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
                if (AuthService.isAuthenticated()) {
                    const currentUser = await AuthService.getCurrentUser();
                    const token = AuthService.getToken();
                    // Agregar el token al objeto user
                    setUser({
                        ...currentUser,
                        access_token: token
                    });
                } else {
                    // Si no está autenticado y no está en la página de login, redirigir
                    if (pathname !== '/login' && pathname !== '/') {
                        router.push('/login');
                    }
                }
            } catch (error) {
                console.error('Error loading user:', error);
                // Si hay error al cargar el usuario, limpiar token y redirigir
                AuthService.logout();
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
