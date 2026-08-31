// Módulo para manejar todas las llamadas a la API
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

            // Si es 401 y NO es login, entonces sesión expirada
            if (response.status === 401 && !endpoint.includes('/auth/login')) {
                this.clearToken();
                window.location.href = 'login.html';
                throw new Error('Sesión expirada');
            }

            // Para cualquier otro error, leer el mensaje del backend
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
        
        if (response.token) {
            this.setToken(response.token);
        }
        
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

    async getEstacion(id) {
        return await this.request(`/estaciones/${id}`);
    }

    async crearEstacion(data) {
        return await this.request('/estaciones', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async actualizarEstacion(id, data) {
        return await this.request(`/estaciones/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async eliminarEstacion(id) {
        return await this.request(`/estaciones/${id}`, {
            method: 'DELETE'
        });
    }

    // Mediciones
    async getMediciones(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        return await this.request(`/mediciones?${params}`);
    }

    async getUltimasMediciones() {
        return await this.request('/mediciones/ultimas');
    }

    async registrarMedicion(data) {
        return await this.request('/mediciones', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Alertas
    async getAlertas(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        return await this.request(`/alertas?${params}`);
    }

    async getEstadisticas() {
        return await this.request('/alertas/estadisticas');
    }

    // Contactos
    async getContactos(estacionId = null) {
        const endpoint = estacionId ? `/contactos?estacion_id=${estacionId}` : '/contactos';
        return await this.request(endpoint);
    }

    async crearContacto(data) {
        return await this.request('/contactos', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async actualizarContacto(id, data) {
        return await this.request(`/contactos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async eliminarContacto(id) {
        return await this.request(`/contactos/${id}`, {
            method: 'DELETE'
        });
    }
}

// Crear instancia global
const api = new API();
