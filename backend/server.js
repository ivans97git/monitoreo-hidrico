const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

const corsOptions = {
    origin: [
        'https://ivans97git.github.io',   // sin la ruta /monitoreo-hidrico
        'http://localhost:8080',
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(helmet());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/estaciones', require('./routes/estaciones'));
app.use('/api/mediciones', require('./routes/mediciones'));
app.use('/api/pobladores', require('./routes/pobladores'));
app.use('/api/alertas', require('./routes/alertas'));

// Ruta para descargar archivos Excel
app.get('/api/descargar/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'temp', req.params.filename);
    res.download(filePath, (err) => {
        if (err) res.status(404).json({ error: 'Archivo no encontrado' });
    });
});

app.get('/health', (req, res) => res.json({ status: 'OK' }));

app.use('*', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor en puerto ${PORT}`);
});
