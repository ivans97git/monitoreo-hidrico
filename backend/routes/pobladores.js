const express = require('express');
const { query } = require('../config/database');
const { autenticarToken, autorizarRol } = require('../middleware/auth');

const router = express.Router();

router.get('/', autenticarToken, async (req, res) => {
    try {
        const { estacion_id } = req.query;
        let sql = `SELECT p.*, e.nombre as estacion_nombre, r.nombre as refugio_nombre
                   FROM pobladores p
                   LEFT JOIN estaciones e ON p.estacion_id = e.id
                   LEFT JOIN refugios r ON p.refugio_id = r.id
                   WHERE p.activo = true`;
        const params = [];
        if (estacion_id) { sql += ' AND p.estacion_id = $1'; params.push(estacion_id); }
        sql += ' ORDER BY p.apellido, p.nombre';
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener pobladores' });
    }
});

router.post('/', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        const { nombre, apellido, telefono, ubicacion, latitud, longitud, estacion_id, refugio_id, nucleo_id, trabajo, problemas_salud, dni, edad } = req.body;
        if (!nombre || !apellido) return res.status(400).json({ error: 'Nombre y apellido son obligatorios' });
        const result = await query(
            `INSERT INTO pobladores (nombre, apellido, telefono, ubicacion, latitud, longitud, estacion_id, refugio_id, nucleo_id, trabajo, problemas_salud, dni, edad)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [nombre, apellido, telefono, ubicacion, latitud, longitud, estacion_id, refugio_id, nucleo_id, trabajo, problemas_salud, dni, edad]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando poblador:', error);
        res.status(500).json({ error: 'Error al crear poblador' });
    }
});

router.put('/:id', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        const { nombre, apellido, telefono, ubicacion, latitud, longitud, estacion_id, refugio_id, nucleo_id, trabajo, problemas_salud, dni, edad, activo } = req.body;
        const result = await query(
            `UPDATE pobladores SET
                nombre = COALESCE($1, nombre),
                apellido = COALESCE($2, apellido),
                telefono = COALESCE($3, telefono),
                ubicacion = COALESCE($4, ubicacion),
                latitud = COALESCE($5, latitud),
                longitud = COALESCE($6, longitud),
                estacion_id = COALESCE($7, estacion_id),
                refugio_id = COALESCE($8, refugio_id),
                nucleo_id = COALESCE($9, nucleo_id),
                trabajo = COALESCE($10, trabajo),
                problemas_salud = COALESCE($11, problemas_salud),
                dni = COALESCE($12, dni),
                edad = COALESCE($13, edad),
                activo = COALESCE($14, activo)
             WHERE id = $15 RETURNING *`,
            [nombre, apellido, telefono, ubicacion, latitud, longitud, estacion_id, refugio_id, nucleo_id, trabajo, problemas_salud, dni, edad, activo, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Poblador no encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar poblador' });
    }
});

router.delete('/:id', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        await query('UPDATE pobladores SET activo = false WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Poblador desactivado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar poblador' });
    }
});

module.exports = router;
