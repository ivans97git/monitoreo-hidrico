const express = require('express');
const { query } = require('../config/database');
const { autenticarToken, autorizarRol } = require('../middleware/auth');
const excelService = require('../services/excelService');

const router = express.Router();

// =============================================
// GET /api/alertas
// Historial de alertas (con filtros opcionales)
// =============================================
router.get('/', autenticarToken, async (req, res) => {
    try {
        const { desde, hasta, estacion_id, limite = 50 } = req.query;

        let sql = `
            SELECT a.*, e.nombre as nombre_estacion
            FROM alertas a
            JOIN estaciones e ON a.estacion_id = e.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (estacion_id) {
            sql += ` AND a.estacion_id = $${paramCount}`;
            params.push(estacion_id);
            paramCount++;
        }
        if (desde) {
            sql += ` AND a.fecha_generacion >= $${paramCount}`;
            params.push(desde);
            paramCount++;
        }
        if (hasta) {
            sql += ` AND a.fecha_generacion <= $${paramCount}`;
            params.push(hasta);
            paramCount++;
        }

        sql += ` ORDER BY a.fecha_generacion DESC LIMIT $${paramCount}`;
        params.push(Math.min(parseInt(limite) || 50, 200));

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo alertas:', error);
        res.status(500).json({ error: 'Error al obtener alertas' });
    }
});

// =============================================
// POST /api/alertas/generar
// Generar alerta manual (independiente de mediciones)
// =============================================
router.post('/generar', autenticarToken, async (req, res) => {
    try {
        const { estacion_id, tipo_alerta, mensaje } = req.body;

        if (!estacion_id) {
            return res.status(400).json({ error: 'Se requiere estacion_id' });
        }

        const tipo = tipo_alerta === 'CRÍTICO' ? 'CRÍTICO' : 'ALERTA';

        // Obtener estación
        const estRes = await query('SELECT * FROM estaciones WHERE id = $1', [estacion_id]);
        if (estRes.rows.length === 0) {
            return res.status(404).json({ error: 'Estación no encontrada' });
        }
        const estacion = estRes.rows[0];

        // Obtener pobladores activos de la estación
        const pobRes = await query(
            'SELECT * FROM pobladores WHERE estacion_id = $1 AND activo = true',
            [estacion_id]
        );
        if (pobRes.rows.length === 0) {
            return res.status(400).json({ error: 'No hay pobladores para esta estación' });
        }

        // Generar Excel (sin valor ni fecha de medición)
        const resultado = await excelService.generarExcelPobladores(
            pobRes.rows,
            estacion,
            tipo,
            null,      // valor nulo
            null       // fecha nula
        );

        // Mensaje de alerta
        const mensajeFinal = mensaje || `Alerta manual ${tipo}`;

        // Insertar alerta SIN medicion_id
        await query(
            `INSERT INTO alertas (estacion_id, tipo_alerta, archivo_excel, mensaje)
             VALUES ($1, $2, $3, $4)`,
            [estacion.id, tipo, resultado.filename, mensajeFinal]
        );

        res.json({
            mensaje: 'Alerta manual generada exitosamente',
            archivo: resultado.filename,
            tipo_alerta: tipo
        });

    } catch (error) {
        console.error('Error generando alerta manual:', error);
        res.status(500).json({ error: 'Error al generar alerta manual' });
    }
});

// =============================================
// GET /api/alertas/:id
// Obtener una alerta específica
// =============================================
router.get('/:id', autenticarToken, async (req, res) => {
    try {
        const result = await query(
            `SELECT a.*, e.nombre as nombre_estacion
             FROM alertas a
             JOIN estaciones e ON a.estacion_id = e.id
             WHERE a.id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Alerta no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo alerta:', error);
        res.status(500).json({ error: 'Error al obtener alerta' });
    }
});

// =============================================
// GET /api/alertas/descargar/:filename
// Descargar archivo Excel de una alerta
// (opcional, ya existe en server.js, pero puede estar aquí)
// =============================================
router.get('/descargar/:filename', autenticarToken, (req, res) => {
    const filePath = path.join(__dirname, '..', 'temp', req.params.filename);
    res.download(filePath, (err) => {
        if (err) res.status(404).json({ error: 'Archivo no encontrado' });
    });
});

module.exports = router;
