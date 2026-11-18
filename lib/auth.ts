import { fetchConTimeout, ErrorDeRed, ErrorSesion } from './net';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface LoginCredentials {
    username: string; // email
    password: string;
}

export interface AuthToken {
    access_token: string;
    token_type: string;
}

export interface MenuItemCache {
    nombre: string;
    href: string;
    icon: string;
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
    modulos?: string[]; // módulos contratados por el tenant (lib/modulos.ts)
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
const USER_CACHE_KEY = 'fme_user_cache';            // último usuario cargado OK (respaldo si la API no responde)
const MENU_CACHE_KEY = 'fme_menu_cache';            // último menú permitido cargado OK

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

        // fetchConTimeout lanza ErrorDeRed si no hay conexión o la API no responde a tiempo
        const response = await fetchConTimeout(`${API_URL}/api/auth/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Forwarded-Host': currentHostname,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new ErrorSesion();
            }
            // 5xx u otros: problema del servidor, NO de la sesión
            throw new ErrorDeRed(`Servidor no disponible (${response.status})`);
        }

        const user: User = await response.json();
        this.setCachedUser(user);
        return user;
    }

    /** Último usuario cargado correctamente; se usa si la API no responde para no expulsar al usuario. */
    static getCachedUser(): User | null {
        if (typeof window === 'undefined') return null;
        try {
            const raw = localStorage.getItem(USER_CACHE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    static setCachedUser(user: User): void {
        if (typeof window === 'undefined') return;
        try {
            const { access_token, ...sinToken } = user;
            localStorage.setItem(USER_CACHE_KEY, JSON.stringify(sinToken));
        } catch { /* almacenamiento no disponible */ }
    }

    /** Último menú permitido cargado OK (ítems completos). Acepta el formato antiguo (solo hrefs). */
    static getCachedMenu(): MenuItemCache[] | null {
        if (typeof window === 'undefined') return null;
        try {
            const raw = localStorage.getItem(MENU_CACHE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!Array.isArray(data)) return null;
            return data.map((m: string | MenuItemCache) =>
                typeof m === 'string' ? { nombre: m, href: m, icon: '' } : m,
            );
        } catch {
            return null;
        }
    }

    static setCachedMenu(items: MenuItemCache[]): void {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(items));
        } catch { /* almacenamiento no disponible */ }
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
            localStorage.removeItem(USER_CACHE_KEY);
            localStorage.removeItem(MENU_CACHE_KEY);
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
