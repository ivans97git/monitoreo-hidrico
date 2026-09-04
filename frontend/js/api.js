class API {
    constructor() {
        this.baseURL = CONFIG.API_URL;
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    getToken() {
        return this.token || localStorage.getItem('token');
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(url, { ...options, headers });
            if (response.status === 401 && !endpoint.includes('/auth/login')) {
                this.clearToken();
                window.location.href = 'login.html';
                throw new Error('Sesión expirada');
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Error en la solicitud');
            }
            return await response.json();
        } catch (error) {
            console.error(`Error en ${endpoint}:`, error);
            throw error;
        }
    }

    // Autenticación
    async login(username, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        if (response.token) this.setToken(response.token);
        return response;
    }

    async logout() {
        this.clearToken();
    }

    async getUsuarioActual() {
        return await this.request('/auth/me');
    }

    // Estaciones
    async getEstaciones() {
        return await this.request('/estaciones');
    }

    async crearEstacion(data) {
        return await this.request('/estaciones', { method: 'POST', body: JSON.stringify(data) });
    }

    async actualizarEstacion(id, data) {
        return await this.request(`/estaciones/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    async eliminarEstacion(id) {
        return await this.request(`/estaciones/${id}`, { method: 'DELETE' });
    }

    // Pobladores
    async getPobladores(estacionId = null) {
        const endpoint = estacionId ? `/pobladores?estacion_id=${estacionId}` : '/pobladores';
        return await this.request(endpoint);
    }

    async crearPoblador(data) {
        return await this.request('/pobladores', { method: 'POST', body: JSON.stringify(data) });
    }

    async actualizarPoblador(id, data) {
        return await this.request(`/pobladores/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    async eliminarPoblador(id) {
        return await this.request(`/pobladores/${id}`, { method: 'DELETE' });
    }

        // Mediciones
    async getMediciones(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        return await this.request(`/mediciones?${params}`);
    }

    async getMedicion(id) {
        return await this.request(`/mediciones/${id}`);
    }

    async actualizarMedicion(id, data) {
        return await this.request(`/mediciones/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    async eliminarMedicion(id) {
        return await this.request(`/mediciones/${id}`, { method: 'DELETE' });
    }

    async registrarMedicion(data) {
    return await this.request('/mediciones', { method: 'POST', body: JSON.stringify(data) });
}

    // Alertas
    async getAlertas(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        return await this.request(`/alertas?${params}`);
    }
}

const api = new API();
