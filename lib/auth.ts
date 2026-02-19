const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface LoginCredentials {
    username: string; // email
    password: string;
}

export interface AuthToken {
    access_token: string;
    token_type: string;
}

export interface User {
    id: number;
    email: string;
    nombre_completo: string;
    is_active: boolean;
    local_defecto_id?: number;
    access_token?: string | null;
    role?: {
        id: number;
        nombre: string;
        descripcion?: string;
    };
}

const TOKEN_KEY = 'fme_auth_token';

export class AuthService {
    static async login(credentials: LoginCredentials): Promise<AuthToken> {
        const formData = new URLSearchParams();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);

        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

        const response = await fetch(`${API_URL}/api/auth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Forwarded-Host': currentHostname,
            },
            body: formData.toString(),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Error de autenticación' }));
            throw new Error(error.detail || 'Credenciales inválidas');
        }

        const token = await response.json();
        this.setToken(token.access_token);
        return token;
    }

    static async getCurrentUser(): Promise<User> {
        const token = this.getToken();
        if (!token) {
            throw new Error('No hay sesión activa');
        }

        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

        const response = await fetch(`${API_URL}/api/auth/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Forwarded-Host': currentHostname,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.logout();
            }
            throw new Error('Error al obtener usuario');
        }

        return response.json();
    }

    static setToken(token: string): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem(TOKEN_KEY, token);
        }
    }

    static getToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(TOKEN_KEY);
        }
        return null;
    }

    static logout(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = '/login';
        }
    }

    static isAuthenticated(): boolean {
        return !!this.getToken();
    }

    static getAuthHeaders(): HeadersInit {
        const token = this.getToken();
        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        
        return {
            'Content-Type': 'application/json',
            'X-Forwarded-Host': currentHostname,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        };
    }
}
