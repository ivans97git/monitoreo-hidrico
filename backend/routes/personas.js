const express = require('express');
const { query } = require('../config/database');
const { autenticarToken, autorizarRol } = require('../middleware/auth');

const router = express.Router();

// GET /api/personas?familia_id=1
router.get('/', autenticarToken, async (req, res) => {
    try {
        const { familia_id } = req.query;
        let sql = `SELECT p.*, f.responsable as familia_responsable 
                   FROM personas p 
                   LEFT JOIN familias f ON p.familia_id = f.id
                   WHERE p.activo = true`;
        const params = [];
        if (familia_id) { sql += ' AND p.familia_id = $1'; params.push(familia_id); }
        sql += ' ORDER BY p.apellido, p.nombre';
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo personas:', error);
        res.status(500).json({ error: 'Error al obtener personas' });
    }
});

// GET /api/personas/:id
router.get('/:id', autenticarToken, async (req, res) => {
    try {
        const result = await query('SELECT * FROM personas WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Persona no encontrada' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener persona' });
    }
});

// POST /api/personas
router.post('/', autenticarToken, autorizarRol('admin', 'editor'), async (req, res) => {
    try {
        const { familia_id, nombre, apellido, dni, fecha_nacimiento, edad, telefono, parentesco, trabajo, problemas_salud, medicacion, discapacidad } = req.body;
        if (!familia_id || !nombre || !apellido) {
            return res.status(400).json({ error: 'Familia, nombre y apellido son obligatorios' });
        }
        const result = await query(
            `INSERT INTO personas (familia_id, nombre, apellido, dni, fecha_nacimiento, edad, telefono, parentesco, trabajo, problemas_salud, medicacion, discapacidad)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [familia_id, nombre, apellido, dni, fecha_nacimiento, edad, telefono, parentesco, trabajo, problemas_salud, medicacion, discapacidad || false]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando persona:', error);
        res.status(500).json({ error: 'Error al crear persona' });
    }
});

// PUT /api/personas/:id
router.put('/:id', autenticarToken, autorizarRol('admin', 'editor'), async (req, res) => {
    try {
        const { nombre, apellido, dni, fecha_nacimiento, edad, telefono, parentesco, trabajo, problemas_salud, medicacion, discapacidad, activo } = req.body;
        const result = await query(
            `UPDATE personas SET
                nombre = COALESCE($1, nombre),
                apellido = COALESCE($2, apellido),
                dni = COALESCE($3, dni),
                fecha_nacimiento = COALESCE($4, fecha_nacimiento),
                edad = COALESCE($5, edad),
                telefono = COALESCE($6, telefono),
                parentesco = COALESCE($7, parentesco),
                trabajo = COALESCE($8, trabajo),
                problemas_salud = COALESCE($9, problemas_salud),
                medicacion = COALESCE($10, medicacion),
                discapacidad = COALESCE($11, discapacidad),
                activo = COALESCE($12, activo)
             WHERE id = $13 RETURNING *`,
            [nombre, apellido, dni, fecha_nacimiento, edad, telefono, parentesco, trabajo, problemas_salud, medicacion, discapacidad, activo, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Persona no encontrada' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando persona:', error);
        res.status(500).json({ error: 'Error al actualizar persona' });
    }
});

// DELETE /api/personas/:id
router.delete('/:id', autenticarToken, autorizarRol('admin', 'editor'), async (req, res) => {
    try {
        await query('UPDATE personas SET activo = false WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Persona desactivada' });
    } catch (error) {
        console.error('Error eliminando persona:', error);
        res.status(500).json({ error: 'Error al eliminar persona' });
    }
});

module.exports = router;
