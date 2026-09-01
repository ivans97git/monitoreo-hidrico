const CONFIG = {
    API_URL: 'https://ivans97git.github.io/api', // Reemplazar por la URL real del backend
    // Para desarrollo local:
    // API_URL: 'http://localhost:3000/api',
    MAPA: {
        centroInicial: [-25.695, -54.436],
        zoomInicial: 10,
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        atribucion: '© OpenStreetMap contributors'
    },
    UMBRALES: {
        nivel_rio: { alerta: 3.5, critico: 5.0 },
        precipitacion: { alerta: 100, critico: 150 }
    }
};