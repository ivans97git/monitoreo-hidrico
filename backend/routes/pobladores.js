const express = require('express');
const { query } = require('../config/database');
const { autenticarToken, autorizarRol } = require('../middleware/auth');

const router = express.Router();

// GET /api/pobladores?estacion_id=1
router.get('/', autenticarToken, async (req, res) => {
    try {
        const { estacion_id } = req.query;
        let sql = `SELECT p.*, e.nombre as estacion_nombre 
                   FROM pobladores p 
                   LEFT JOIN estaciones e ON p.estacion_id = e.id 
                   WHERE 1=1`;
        const params = [];
        if (estacion_id) {
            sql += ' AND p.estacion_id = $1';
            params.push(estacion_id);
        }
        sql += ' ORDER BY p.apellido, p.nombre';
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo pobladores:', error);
        res.status(500).json({ error: 'Error al obtener pobladores' });
    }
});

// POST /api/pobladores
router.post('/', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        const { nombre, apellido, telefono, ubicacion, latitud, longitud, estacion_id } = req.body;
        if (!nombre || !apellido || !estacion_id) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        const result = await query(
            `INSERT INTO pobladores (nombre, apellido, telefono, ubicacion, latitud, longitud, estacion_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [nombre, apellido, telefono, ubicacion, latitud, longitud, estacion_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear poblador' });
    }
});

// PUT /api/pobladores/:id
router.put('/:id', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        const { nombre, apellido, telefono, ubicacion, latitud, longitud, estacion_id, activo } = req.body;
        const result = await query(
            `UPDATE pobladores SET
                nombre = COALESCE($1, nombre),
                apellido = COALESCE($2, apellido),
                telefono = COALESCE($3, telefono),
                ubicacion = COALESCE($4, ubicacion),
                latitud = COALESCE($5, latitud),
                longitud = COALESCE($6, longitud),
                estacion_id = COALESCE($7, estacion_id),
                activo = COALESCE($8, activo)
             WHERE id = $9 RETURNING *`,
            [nombre, apellido, telefono, ubicacion, latitud, longitud, estacion_id, activo, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Poblador no encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar poblador' });
    }
});

// DELETE /api/pobladores/:id
router.delete('/:id', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        await query('DELETE FROM pobladores WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Poblador eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar poblador' });
    }
});

module.exports = router;
