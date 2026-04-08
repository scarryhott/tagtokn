const TOKEN_KEY = 'tap_session_token';

function authHeaders() {
    const t = localStorage.getItem(TOKEN_KEY);
    return {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
    };
}

/**
 * User Account Model
 */
export class UserAccount {
    constructor({ id, username, profile = {}, agentId = null }) {
        this.id = id;
        this.username = username;
        this.profile = profile;
        this.agentId = agentId;
        this.createdAt = Date.now();
    }
}

/**
 * User Registry — server-backed auth with local session token
 */
export class UserRegistry {
    constructor() {
        this.users = new Map();
        this.currentUser = null;
    }

    _persistCurrent() {
        try {
            if (this.currentUser) {
                localStorage.setItem('tap_current_user', this.currentUser.id);
            }
        } catch (_) { /* ignore */ }
    }

    getSessionToken() {
        try {
            return localStorage.getItem(TOKEN_KEY);
        } catch {
            return null;
        }
    }

    setSessionToken(token) {
        try {
            if (token) localStorage.setItem(TOKEN_KEY, token);
            else localStorage.removeItem(TOKEN_KEY);
        } catch (_) { /* ignore */ }
    }

    /**
     * Restore session from GET /api/auth/me
     */
    async restoreSession() {
        const token = this.getSessionToken();
        if (!token) return null;
        const r = await fetch('/api/auth/me', { headers: authHeaders() });
        if (!r.ok) {
            this.setSessionToken(null);
            return null;
        }
        const { user } = await r.json();
        const agentId = `agent-${user.id}`;
        const acc = new UserAccount({ id: user.id, username: user.username, profile: {}, agentId });
        this.users.set(acc.id, acc);
        this.currentUser = acc;
        this._persistCurrent();
        return acc;
    }

    /**
     * Sign up against server; stores Bearer token
     */
    async signup(username, password, profile = {}) {
        const r = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || `register_failed_${r.status}`);
        this.setSessionToken(data.token);
        const agentId = `agent-${data.user.id}`;
        const user = new UserAccount({ ...data.user, id: data.user.id, profile, agentId });
        this.users.set(user.id, user);
        this.currentUser = user;
        this._persistCurrent();
        return { user, agentId };
    }

    /**
     * Login against server
     */
    async login(username, password) {
        const r = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || `login_failed_${r.status}`);
        this.setSessionToken(data.token);
        const agentId = `agent-${data.user.id}`;
        const user = new UserAccount({ ...data.user, id: data.user.id, profile: {}, agentId });
        this.users.set(user.id, user);
        this.currentUser = user;
        this._persistCurrent();
        return user;
    }

    async logout() {
        const token = this.getSessionToken();
        if (token) {
            try {
                await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() });
            } catch (_) { /* ignore */ }
        }
        this.setSessionToken(null);
        this.currentUser = null;
        try {
            localStorage.removeItem('tap_current_user');
        } catch (_) { /* ignore */ }
    }

    isLoggedIn() {
        return !!this.currentUser;
    }
}

export const userRegistry = new UserRegistry();

/** Headers for authenticated NFC API calls from the browser */
export function nfcAuthHeaders() {
    return authHeaders();
}
