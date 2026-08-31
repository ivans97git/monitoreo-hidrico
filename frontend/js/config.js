// Configuración global del frontend
const CONFIG = {
    // URL del backend en Railway
    API_URL: 'https://monitoreo-hidrico-backend.onrender.com/api',
    
    // Para desarrollo local, comentar la línea anterior y descomentar:
    // API_URL: 'http://localhost:3000/api',
    
    // Configuración del mapa
    MAPA: {
        centroInicial: [-25.695, -54.436], // Coordenadas de ejemplo
        zoomInicial: 10,
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        atribucion: '© OpenStreetMap contributors'
    },
    
    // Umbrales por defecto
    UMBRALES: {
        nivel_rio: {
            alerta: 3.5,
            critico: 5.0
        },
        precipitacion: {
            alerta: 100,
            critico: 150
        }
    },
    
    // Intervalos de actualización (ms)
    INTERVALOS: {
        actualizacionMapa: 300000, // 5 minutos
        actualizacionGraficos: 600000 // 10 minutos
    }
};

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
