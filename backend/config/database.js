const { Pool } = require('pg');
require('dotenv').config();

// Si DATABASE_URL está definida, extraer sus partes
let poolConfig = {};

if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    poolConfig = {
        host: url.hostname,
        port: url.port || 5432,
        database: url.pathname.substring(1),
        user: url.username,
        password: url.password,
        family: 4, // Forzar IPv4
        ssl: { rejectUnauthorized: false }
    };
} else {
    poolConfig = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        family: 4,
        ssl: { rejectUnauthorized: false }
    };
}

const pool = new Pool(poolConfig);

module.exports = { query: (text, params) => pool.query(text, params), pool };



//const { Pool } = require('pg');
// require('dotenv').config();

// Configuración para Supabase
// const pool = new Pool({
//    host: process.env.DB_HOST,
//    port: process.env.DB_PORT || 5432,
//    database: process.env.DB_NAME,
//    user: process.env.DB_USER,
//    password: process.env.DB_PASSWORD,
//    family: 4,
//    ssl: {
//        rejectUnauthorized: false
//    },
//    max: 20,
//    idleTimeoutMillis: 30000,
//    connectionTimeoutMillis: 2000,
//});

// Test de conexión
pool.on('error', (err) => {
    console.error('Error inesperado en PostgreSQL:', err);
});

const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Conectado a PostgreSQL en Supabase');
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Error conectando a PostgreSQL:', error.message);
        return false;
    }
};

testConnection();

// module.exports = {
//    query: (text, params) => pool.query(text, params),
//    pool,
//    testConnection
//};
