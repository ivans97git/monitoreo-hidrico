const express = require('express');
const { query } = require('../config/database');
const { autenticarToken, autorizarRol } = require('../middleware/auth');

const router = express.Router();

// GET /api/familias - resumen operativo, una fila por familia
router.get('/', autenticarToken, async (req, res) => {
    try {
        const { refugio_id, estacion_id, estado } = req.query;
        let sql = `
            SELECT f.*, r.nombre as refugio_nombre, e.nombre as estacion_nombre,
                (SELECT COUNT(*) FROM personas p WHERE p.familia_id = f.id AND p.activo = true) as cantidad_integrantes
            FROM familias f
            LEFT JOIN refugios r ON f.refugio_id = r.id
            LEFT JOIN estaciones e ON f.estacion_id = e.id
            WHERE f.activo = true
        `;
        const params = [];
        let c = 1;
        if (refugio_id) { sql += ` AND f.refugio_id = $${c}`; params.push(refugio_id); c++; }
        if (estacion_id) { sql += ` AND f.estacion_id = $${c}`; params.push(estacion_id); c++; }
        if (estado) { sql += ` AND f.estado = $${c}`; params.push(estado); c++; }
        sql += ' ORDER BY f.prioridad NULLS LAST, f.numero_familia';
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo familias:', error);
        res.status(500).json({ error: 'Error al obtener familias' });
    }
});

// GET /api/familias/:id - con integrantes
router.get('/:id', autenticarToken, async (req, res) => {
    try {
        const famRes = await query('SELECT * FROM familias WHERE id = $1', [req.params.id]);
        if (famRes.rows.length === 0) return res.status(404).json({ error: 'Familia no encontrada' });
        const personasRes = await query(
            'SELECT * FROM personas WHERE familia_id = $1 AND activo = true ORDER BY edad DESC',
            [req.params.id]
        );
        res.json({ ...famRes.rows[0], personas: personasRes.rows });
    } catch (error) {
        console.error('Error obteniendo familia:', error);
        res.status(500).json({ error: 'Error al obtener familia' });
    }
});

// POST /api/familias
router.post('/', autenticarToken, autorizarRol('admin', 'editor'), async (req, res) => {
    try {
        const {
            numero_familia, responsable, telefono, ubicacion, latitud, longitud,
            cantidad_personas, prioridad, necesidad, transporte, tipo_transporte,
            animales, detalle_animales, destino, estado, refugio_id, estacion_id, observaciones
        } = req.body;
        const result = await query(
            `INSERT INTO familias (
                numero_familia, responsable, telefono, ubicacion, latitud, longitud,
                cantidad_personas, prioridad, necesidad, transporte, tipo_transporte,
                animales, detalle_animales, destino, estado, refugio_id, estacion_id, observaciones
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
            [
                numero_familia, responsable, telefono, ubicacion, latitud, longitud,
                cantidad_personas || 0, prioridad, necesidad, transporte || false, tipo_transporte,
                animales || false, detalle_animales, destino, estado || 'PENDIENTE',
                refugio_id || null, estacion_id || null, observaciones
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando familia:', error);
        res.status(500).json({ error: 'Error al crear familia' });
    }
});

// PUT /api/familias/:id
router.put('/:id', autenticarToken, autorizarRol('admin', 'editor'), async (req, res) => {
    try {
        const {
            numero_familia, responsable, telefono, ubicacion, latitud, longitud,
            cantidad_personas, prioridad, necesidad, transporte, tipo_transporte,
            animales, detalle_animales, destino, estado, refugio_id, estacion_id, observaciones, activo
        } = req.body;
        const result = await query(
            `UPDATE familias SET
                numero_familia = COALESCE($1, numero_familia),
                responsable = COALESCE($2, responsable),
                telefono = COALESCE($3, telefono),
                ubicacion = COALESCE($4, ubicacion),
                latitud = COALESCE($5, latitud),
                longitud = COALESCE($6, longitud),
                cantidad_personas = COALESCE($7, cantidad_personas),
                prioridad = COALESCE($8, prioridad),
                necesidad = COALESCE($9, necesidad),
                transporte = COALESCE($10, transporte),
                tipo_transporte = COALESCE($11, tipo_transporte),
                animales = COALESCE($12, animales),
                detalle_animales = COALESCE($13, detalle_animales),
                destino = COALESCE($14, destino),
                estado = COALESCE($15, estado),
                refugio_id = $16,
                estacion_id = $17,
                observaciones = COALESCE($18, observaciones),
                activo = COALESCE($19, activo),
                updated_at = NOW()
             WHERE id = $20 RETURNING *`,
            [
                numero_familia, responsable, telefono, ubicacion, latitud, longitud,
                cantidad_personas, prioridad, necesidad, transporte, tipo_transporte,
                animales, detalle_animales, destino, estado,
                refugio_id, estacion_id, observaciones, activo, req.params.id
            ]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Familia no encontrada' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando familia:', error);
        res.status(500).json({ error: 'Error al actualizar familia' });
    }
});

// DELETE /api/familias/:id (soft delete)
router.delete('/:id', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        await query('UPDATE familias SET activo = false WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Familia desactivada' });
    } catch (error) {
        console.error('Error eliminando familia:', error);
        res.status(500).json({ error: 'Error al eliminar familia' });
    }
});

module.exports = router;
