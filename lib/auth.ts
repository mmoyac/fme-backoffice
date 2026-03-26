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
    is_superadmin?: boolean;
    local_defecto_id?: number;
    tenant_id?: number;
    tenant_nombre?: string;
    access_token?: string | null;
    role?: {
        id: number;
        nombre: string;
        descripcion?: string;
    };
}

export interface TenantContext {
    tenant_id: number;
    tenant_nombre: string;
    access_token: string;
}

const TOKEN_KEY = 'fme_auth_token';
const SUPERADMIN_TOKEN_KEY = 'fme_superadmin_token'; // token original del superadmin
const TENANT_CONTEXT_KEY = 'fme_tenant_context';    // tenant activo del superadmin

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
        // Limpiar contexto de tenant anterior al hacer nuevo login
        this.clearTenantContext();
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
            // Si hay contexto de tenant activo, usar ese token
            const ctx = this.getTenantContext();
            if (ctx) return ctx.access_token;
            return localStorage.getItem(TOKEN_KEY);
        }
        return null;
    }

    static getSuperadminToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(SUPERADMIN_TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
        }
        return null;
    }

    static logout(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(SUPERADMIN_TOKEN_KEY);
            localStorage.removeItem(TENANT_CONTEXT_KEY);
            window.location.href = '/login';
        }
    }

    static isAuthenticated(): boolean {
        if (typeof window !== 'undefined') {
            return !!(localStorage.getItem(TOKEN_KEY));
        }
        return false;
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

    // --------------------------------------------------
    // Superadmin: gestión de contexto de tenant
    // --------------------------------------------------

    static async switchTenant(tenantId: number): Promise<TenantContext> {
        const superadminToken = localStorage.getItem(SUPERADMIN_TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

        const response = await fetch(`${API_URL}/api/superadmin/switch-tenant/${tenantId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${superadminToken}`,
                'X-Forwarded-Host': hostname,
            },
        });
        if (!response.ok) throw new Error('Error al cambiar de tenant');

        const data = await response.json();
        const ctx: TenantContext = {
            tenant_id: data.tenant_id,
            tenant_nombre: data.tenant_nombre,
            access_token: data.access_token,
        };
        // Guardar token original como superadmin si no está guardado
        if (!localStorage.getItem(SUPERADMIN_TOKEN_KEY)) {
            const originalToken = localStorage.getItem(TOKEN_KEY);
            if (originalToken) localStorage.setItem(SUPERADMIN_TOKEN_KEY, originalToken);
        }
        localStorage.setItem(TENANT_CONTEXT_KEY, JSON.stringify(ctx));
        return ctx;
    }

    static clearTenantContext(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(SUPERADMIN_TOKEN_KEY);
            localStorage.removeItem(TENANT_CONTEXT_KEY);
        }
    }

    static async exitTenant(): Promise<void> {
        const superadminToken = localStorage.getItem(SUPERADMIN_TOKEN_KEY);
        if (superadminToken) {
            localStorage.setItem(TOKEN_KEY, superadminToken);
        }
        localStorage.removeItem(SUPERADMIN_TOKEN_KEY);
        localStorage.removeItem(TENANT_CONTEXT_KEY);
    }

    static getTenantContext(): TenantContext | null {
        if (typeof window === 'undefined') return null;
        const raw = localStorage.getItem(TENANT_CONTEXT_KEY);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    }

    static isSuperadminMode(): boolean {
        if (typeof window === 'undefined') return false;
        return !!(localStorage.getItem(SUPERADMIN_TOKEN_KEY));
    }
}
