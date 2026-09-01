const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Importar rutas
const authRoutes = require('./routes/auth');
const estacionesRoutes = require('./routes/estaciones');
const medicionesRoutes = require('./routes/mediciones');
const alertasRoutes = require('./routes/alertas');
const contactosRoutes = require('./routes/contactos');


// Configurar CORS para GitHub Pages
const corsOptions = {
    origin: [
        'https://ivans97git.github.io',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));


// Middleware de seguridad
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200, // máximo 200 requests por ventana
    message: { error: 'Demasiadas solicitudes, intente más tarde' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ruta de salud para Railway
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Monitoreo Hidrológico API',
        version: '1.0.0'
    });
});

// Ruta principal
app.get('/', (req, res) => {
    res.json({
        mensaje: 'API de Monitoreo Hidrológico',
        endpoints: {
            auth: '/api/auth',
            estaciones: '/api/estaciones',
            mediciones: '/api/mediciones',
            alertas: '/api/alertas',
            contactos: '/api/contactos'
        }
    });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/estaciones', estacionesRoutes);
app.use('/api/mediciones', medicionesRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/contactos', contactosRoutes);

// Webhook de WhatsApp
//const whatsappWebService = require('./services/whatsappWebService');
//const whatsappService = require('./services/whatsappService');
//app.get('/webhook/whatsapp', whatsappService.verifyWebhook);
//app.post('/webhook/whatsapp', whatsappService.handleWebhook);

// Manejo de errores 404
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.originalUrl 
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📱 WhatsApp API: ${process.env.WHATSAPP_PHONE_NUMBER_ID ? 'Configurada' : 'No configurada'}`);
    console.log(`🗄️ Base de datos: ${process.env.DB_HOST ? 'Configurada' : 'No configurada'}`);
});
