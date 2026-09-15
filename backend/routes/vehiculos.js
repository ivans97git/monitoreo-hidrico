const express = require('express');
const { query } = require('../config/database');
const { autenticarToken, autorizarRol } = require('../middleware/auth');

const router = express.Router();

// GET /api/vehiculos - con resumen por día y por entidad
router.get('/', autenticarToken, async (req, res) => {
    try {
        const { desde, hasta, entidad } = req.query;
        let sql = `SELECT v.*, u.username FROM vehiculos_asistencia v
                   LEFT JOIN usuarios u ON v.usuario_id = u.id
                   WHERE 1=1`;
        const params = [];
        let c = 1;
        if (desde) { sql += ` AND v.fecha >= $${c}`; params.push(desde); c++; }
        if (hasta) { sql += ` AND v.fecha <= $${c}`; params.push(hasta); c++; }
        if (entidad) { sql += ` AND v.entidad = $${c}`; params.push(entidad); c++; }
        sql += ' ORDER BY v.fecha DESC, v.entidad';
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener vehículos' });
    }
});

// GET /api/vehiculos/resumen - resumen por entidad y por día
router.get('/resumen', autenticarToken, async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        let sql = `
            SELECT entidad, fecha, SUM(cantidad) as total_vehiculos
            FROM vehiculos_asistencia
            WHERE 1=1
        `;
        const params = [];
        let c = 1;
        if (desde) { sql += ` AND fecha >= $${c}`; params.push(desde); c++; }
        if (hasta) { sql += ` AND fecha <= $${c}`; params.push(hasta); c++; }
        sql += ' GROUP BY entidad, fecha ORDER BY fecha DESC, entidad';
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener resumen de vehículos' });
    }
});

router.post('/', autenticarToken, autorizarRol('admin', 'editor'), async (req, res) => {
    try {
        const { entidad, tipo_vehiculo, cantidad, descripcion, fecha } = req.body;
        if (!entidad) return res.status(400).json({ error: 'La entidad es obligatoria' });
        const result = await query(
            `INSERT INTO vehiculos_asistencia (entidad, tipo_vehiculo, cantidad, descripcion, fecha, usuario_id)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [entidad, tipo_vehiculo, cantidad || 1, descripcion, fecha || new Date(), req.usuario.id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear registro de vehículo' });
    }
});

router.delete('/:id', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        await query('DELETE FROM vehiculos_asistencia WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Registro eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar registro' });
    }
});

module.exports = router;
