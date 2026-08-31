const express = require('express');
const { query } = require('../config/database');
const { autenticarToken } = require('../middleware/auth');
const { verificarNivelesCriticos } = require('../services/alertService');

const router = express.Router();

// GET /api/mediciones - Obtener mediciones con filtros
router.get('/', autenticarToken, async (req, res) => {
    try {
        const { estacion_id, tipo, desde, hasta, limite = 100 } = req.query;

        let sql = `
            SELECT m.*, e.nombre as nombre_estacion, u.username as usuario
            FROM mediciones m
            JOIN estaciones e ON m.estacion_id = e.id
            JOIN usuarios u ON m.usuario_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (estacion_id) {
            sql += ` AND m.estacion_id = $${paramCount}`;
            params.push(estacion_id);
            paramCount++;
        }

        if (tipo) {
            sql += ` AND m.tipo_medicion = $${paramCount}`;
            params.push(tipo);
            paramCount++;
        }

        if (desde) {
            sql += ` AND m.fecha_hora >= $${paramCount}`;
            params.push(desde);
            paramCount++;
        }

        if (hasta) {
            sql += ` AND m.fecha_hora <= $${paramCount}`;
            params.push(hasta);
            paramCount++;
        }

        sql += ` ORDER BY m.fecha_hora DESC LIMIT $${paramCount}`;
        params.push(Math.min(limite, 1000));

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo mediciones:', error);
        res.status(500).json({ error: 'Error al obtener mediciones' });
    }
});

// GET /api/mediciones/ultimas - Obtener últimas mediciones por estación
router.get('/ultimas', autenticarToken, async (req, res) => {
    try {
        const result = await query(`
            SELECT DISTINCT ON (estacion_id) 
                m.*, e.nombre as nombre_estacion
            FROM mediciones m
            JOIN estaciones e ON m.estacion_id = e.id
            ORDER BY estacion_id, fecha_hora DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo últimas mediciones:', error);
        res.status(500).json({ error: 'Error al obtener últimas mediciones' });
    }
});

// POST /api/mediciones - Registrar nueva medición
router.post('/', autenticarToken, async (req, res) => {
    try {
        const { estacion_id, valor, tipo_medicion, observaciones } = req.body;

        if (!estacion_id || !valor || !tipo_medicion) {
            return res.status(400).json({ error: 'Estación, valor y tipo de medición son requeridos' });
        }

        if (tipo_medicion !== 'nivel_rio' && tipo_medicion !== 'precipitacion') {
            return res.status(400).json({ error: 'Tipo de medición inválido' });
        }

        if (valor < 0) {
            return res.status(400).json({ error: 'El valor no puede ser negativo' });
        }

        const estacion = await query(
            'SELECT * FROM estaciones WHERE id = $1 AND activo = true',
            [estacion_id]
        );

        if (estacion.rows.length === 0) {
            return res.status(404).json({ error: 'Estación no encontrada o inactiva' });
        }

        const result = await query(
            `INSERT INTO mediciones (estacion_id, usuario_id, valor, tipo_medicion, observaciones) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [estacion_id, req.usuario.id, valor, tipo_medicion, observaciones]
        );

        const medicion = result.rows[0];
        const alertaEnviada = await verificarNivelesCriticos(medicion, estacion.rows[0]);

        res.status(201).json({
            ...medicion,
            alerta_enviada: alertaEnviada
        });
    } catch (error) {
        console.error('Error registrando medición:', error);
        res.status(500).json({ error: 'Error al registrar medición' });
    }
});

// GET /api/mediciones/:id - Obtener medición específica
router.get('/:id', autenticarToken, async (req, res) => {
    try {
        const result = await query(
            `SELECT m.*, e.nombre as nombre_estacion, u.username
             FROM mediciones m
             JOIN estaciones e ON m.estacion_id = e.id
             JOIN usuarios u ON m.usuario_id = u.id
             WHERE m.id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Medición no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo medición:', error);
        res.status(500).json({ error: 'Error al obtener medición' });
    }
});

module.exports = router;