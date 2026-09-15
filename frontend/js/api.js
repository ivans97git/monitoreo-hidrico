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

    // ============ AUTENTICACIÓN ============
    async login(username, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        if (response.token) this.setToken(response.token);
        return response;
    }
    async logout() { this.clearToken(); }
    async getUsuarioActual() { return await this.request('/auth/me'); }

    // ============ ESTACIONES ============
    async getEstaciones() { return await this.request('/estaciones'); }
    async crearEstacion(data) { return await this.request('/estaciones', { method: 'POST', body: JSON.stringify(data) }); }
    async actualizarEstacion(id, data) { return await this.request(`/estaciones/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    async eliminarEstacion(id) { return await this.request(`/estaciones/${id}`, { method: 'DELETE' }); }

    // ============ POBLADORES ============
    async getPobladores(estacionId = null) {
        const endpoint = estacionId ? `/pobladores?estacion_id=${estacionId}` : '/pobladores';
        return await this.request(endpoint);
    }
    async crearPoblador(data) { return await this.request('/pobladores', { method: 'POST', body: JSON.stringify(data) }); }
    async actualizarPoblador(id, data) { return await this.request(`/pobladores/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    async eliminarPoblador(id) { return await this.request(`/pobladores/${id}`, { method: 'DELETE' }); }

    // ============ MEDICIONES ============
    async getMediciones(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        return await this.request(`/mediciones?${params}`);
    }
    async getMedicion(id) { return await this.request(`/mediciones/${id}`); }
    async registrarMedicion(data) { return await this.request('/mediciones', { method: 'POST', body: JSON.stringify(data) }); }
    async actualizarMedicion(id, data) { return await this.request(`/mediciones/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    async eliminarMedicion(id) { return await this.request(`/mediciones/${id}`, { method: 'DELETE' }); }

    // ============ ALERTAS ============
    async getAlertas(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        return await this.request(`/alertas?${params}`);
    }
    async generarAlertaManual(data) { return await this.request('/alertas/generar', { method: 'POST', body: JSON.stringify(data) }); }
    async eliminarAlerta(id) { return await this.request(`/alertas/${id}`, { method: 'DELETE' }); }

    // ============ REFUGIOS ============
    async getRefugios() { return await this.request('/refugios'); }
    async getRefugio(id) { return await this.request(`/refugios/${id}`); }
    async crearRefugio(data) { return await this.request('/refugios', { method: 'POST', body: JSON.stringify(data) }); }
    async actualizarRefugio(id, data) { return await this.request(`/refugios/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    async eliminarRefugio(id) { return await this.request(`/refugios/${id}`, { method: 'DELETE' }); }
    async actualizarOcupacion(id, ocupacion_actual) {
        return await this.request(`/refugios/${id}/ocupacion`, { method: 'PATCH', body: JSON.stringify({ ocupacion_actual }) });
    }

    // ============ NÚCLEOS FAMILIARES ============
    async getNucleos(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        return await this.request(`/nucleos?${params}`);
    }
    async getNucleo(id) { return await this.request(`/nucleos/${id}`); }
    async crearNucleo(data) { return await this.request('/nucleos', { method: 'POST', body: JSON.stringify(data) }); }
    async actualizarNucleo(id, data) { return await this.request(`/nucleos/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    async eliminarNucleo(id) { return await this.request(`/nucleos/${id}`, { method: 'DELETE' }); }

    // ============ PERSONAS ============
    async getPersonas(nucleoId = null) {
        const endpoint = nucleoId ? `/personas?nucleo_id=${nucleoId}` : '/personas';
        return await this.request(endpoint);
    }
    async getPersona(id) { return await this.request(`/personas/${id}`); }
    async crearPersona(data) { return await this.request('/personas', { method: 'POST', body: JSON.stringify(data) }); }
    async actualizarPersona(id, data) { return await this.request(`/personas/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    async eliminarPersona(id) { return await this.request(`/personas/${id}`, { method: 'DELETE' }); }

    // ============ ASISTENCIAS ============
    async getAsistencias(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        return await this.request(`/asistencias?${params}`);
    }
    async crearAsistencia(data) { return await this.request('/asistencias', { method: 'POST', body: JSON.stringify(data) }); }
    async eliminarAsistencia(id) { return await this.request(`/asistencias/${id}`, { method: 'DELETE' }); }

    // ============ VEHÍCULOS ============
    async getVehiculos(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        return await this.request(`/vehiculos?${params}`);
    }
    async getResumenVehiculos(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        return await this.request(`/vehiculos/resumen?${params}`);
    }
    async crearVehiculo(data) { return await this.request('/vehiculos', { method: 'POST', body: JSON.stringify(data) }); }
    async eliminarVehiculo(id) { return await this.request(`/vehiculos/${id}`, { method: 'DELETE' }); }
}

const api = new API();
