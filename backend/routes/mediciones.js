const express = require('express');
const { query } = require('../config/database');
const { autenticarToken } = require('../middleware/auth');
const { verificarYGenerarAlerta } = require('../services/alertService');

const router = express.Router();

// GET /api/mediciones?limite=50&estacion_id=1
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
        params.push(Math.min(parseInt(limite) || 100, 1000));

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo mediciones:', error);
        res.status(500).json({ error: 'Error al obtener mediciones' });
    }
});

// GET /api/mediciones/:id
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

// POST /api/mediciones
router.post('/', autenticarToken, async (req, res) => {
    try {
        const { estacion_id, valor, tipo_medicion, observaciones, fecha_hora } = req.body;

        if (!estacion_id || !valor || !tipo_medicion) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }

        const estacionRes = await query('SELECT * FROM estaciones WHERE id = $1', [estacion_id]);
        if (estacionRes.rows.length === 0) {
            return res.status(404).json({ error: 'Estación no encontrada' });
        }
        const estacion = estacionRes.rows[0];
        const fecha = fecha_hora || new Date();

        const result = await query(
            `INSERT INTO mediciones (estacion_id, usuario_id, valor, tipo_medicion, observaciones, fecha_hora)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [estacion_id, req.usuario.id, valor, tipo_medicion, observaciones, fecha]
        );
        const medicion = result.rows[0];

        const alerta = await verificarYGenerarAlerta(medicion, estacion);

        res.status(201).json({
            ...medicion,
            alerta_generada: alerta.alertaGenerada,
            archivo_excel: alerta.archivo || null
        });
    } catch (error) {
        console.error('Error registrando medición:', error);
        res.status(500).json({ error: 'Error al registrar medición' });
    }
});

// PUT /api/mediciones/:id
router.put('/:id', autenticarToken, async (req, res) => {
    try {
        const { valor, tipo_medicion, observaciones, fecha_hora, estacion_id } = req.body;

        if (!valor || !tipo_medicion) {
            return res.status(400).json({ error: 'Valor y tipo de medición son requeridos' });
        }

        // Verificar que la medición existe
        const medRes = await query('SELECT * FROM mediciones WHERE id = $1', [req.params.id]);
        if (medRes.rows.length === 0) {
            return res.status(404).json({ error: 'Medición no encontrada' });
        }

        // Si se cambia de estación, verificar que exista
        if (estacion_id) {
            const estRes = await query('SELECT * FROM estaciones WHERE id = $1', [estacion_id]);
            if (estRes.rows.length === 0) {
                return res.status(404).json({ error: 'Estación no encontrada' });
            }
        }

        const result = await query(
            `UPDATE mediciones SET
                valor = COALESCE($1, valor),
                tipo_medicion = COALESCE($2, tipo_medicion),
                observaciones = COALESCE($3, observaciones),
                fecha_hora = COALESCE($4, fecha_hora),
                estacion_id = COALESCE($5, estacion_id)
             WHERE id = $6 RETURNING *`,
            [valor, tipo_medicion, observaciones, fecha_hora, estacion_id, req.params.id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando medición:', error);
        res.status(500).json({ error: 'Error al actualizar medición' });
    }
});

// DELETE /api/mediciones/:id
router.delete('/:id', autenticarToken, async (req, res) => {
    try {
        const result = await query('DELETE FROM mediciones WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Medición no encontrada' });
        }
        res.json({ mensaje: 'Medición eliminada exitosamente' });
    } catch (error) {
        console.error('Error eliminando medición:', error);
        res.status(500).json({ error: 'Error al eliminar medición' });
    }
});

module.exports = router;
