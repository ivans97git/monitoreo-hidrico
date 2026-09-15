const express = require('express');
const { query } = require('../config/database');
const { autenticarToken, autorizarRol } = require('../middleware/auth');

const router = express.Router();

// GET /api/nucleos - con refugio, estación, cantidad de integrantes
router.get('/', autenticarToken, async (req, res) => {
    try {
        const { refugio_id, estacion_id } = req.query;
        let sql = `
            SELECT n.*, r.nombre as refugio_nombre, e.nombre as estacion_nombre,
                (SELECT COUNT(*) FROM personas p WHERE p.nucleo_id = n.id AND p.activo = true) as cantidad_integrantes
            FROM nucleos_familiares n
            LEFT JOIN refugios r ON n.refugio_id = r.id
            LEFT JOIN estaciones e ON n.estacion_id = e.id
            WHERE n.activo = true
        `;
        const params = [];
        let c = 1;
        if (refugio_id) { sql += ` AND n.refugio_id = $${c}`; params.push(refugio_id); c++; }
        if (estacion_id) { sql += ` AND n.estacion_id = $${c}`; params.push(estacion_id); c++; }
        sql += ' ORDER BY n.apellido, n.fecha_ingreso DESC';
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo núcleos:', error);
        res.status(500).json({ error: 'Error al obtener núcleos familiares' });
    }
});

// GET /api/nucleos/:id - con integrantes
router.get('/:id', autenticarToken, async (req, res) => {
    try {
        const nucleoRes = await query('SELECT * FROM nucleos_familiares WHERE id = $1', [req.params.id]);
        if (nucleoRes.rows.length === 0) return res.status(404).json({ error: 'Núcleo no encontrado' });
        
        const personasRes = await query(
            'SELECT * FROM personas WHERE nucleo_id = $1 AND activo = true ORDER BY edad DESC',
            [req.params.id]
        );
        
        const asistenciasRes = await query(
            'SELECT * FROM asistencias WHERE nucleo_id = $1 ORDER BY fecha DESC',
            [req.params.id]
        );
        
        res.json({
            ...nucleoRes.rows[0],
            personas: personasRes.rows,
            asistencias: asistenciasRes.rows
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener núcleo' });
    }
});

// POST /api/nucleos
router.post('/', autenticarToken, autorizarRol('admin', 'editor'), async (req, res) => {
    try {
        const { apellido, refugio_id, estacion_id, direccion_origen, fecha_ingreso, observaciones } = req.body;
        if (!apellido) return res.status(400).json({ error: 'El apellido es obligatorio' });
        const result = await query(
            `INSERT INTO nucleos_familiares (apellido, refugio_id, estacion_id, direccion_origen, fecha_ingreso, observaciones)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [apellido, refugio_id || null, estacion_id || null, direccion_origen, fecha_ingreso || new Date(), observaciones]
        );
        // Si se asigna refugio, incrementar ocupación
        if (refugio_id) {
            await query('UPDATE refugios SET ocupacion_actual = ocupacion_actual + 1 WHERE id = $1', [refugio_id]);
        }
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando núcleo:', error);
        res.status(500).json({ error: 'Error al crear núcleo familiar' });
    }
});

// PUT /api/nucleos/:id
router.put('/:id', autenticarToken, autorizarRol('admin', 'editor'), async (req, res) => {
    try {
        const { apellido, refugio_id, estacion_id, direccion_origen, fecha_ingreso, observaciones, activo } = req.body;
        const anterior = await query('SELECT refugio_id FROM nucleos_familiares WHERE id = $1', [req.params.id]);
        const refugioAnterior = anterior.rows[0]?.refugio_id;
        
        const result = await query(
            `UPDATE nucleos_familiares SET
                apellido = COALESCE($1, apellido),
                refugio_id = $2,
                estacion_id = COALESCE($3, estacion_id),
                direccion_origen = COALESCE($4, direccion_origen),
                fecha_ingreso = COALESCE($5, fecha_ingreso),
                observaciones = COALESCE($6, observaciones),
                activo = COALESCE($7, activo)
             WHERE id = $8 RETURNING *`,
            [apellido, refugio_id, estacion_id, direccion_origen, fecha_ingreso, observaciones, activo, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Núcleo no encontrado' });

        // Actualizar ocupación si cambió de refugio
        if (refugioAnterior !== refugio_id) {
            if (refugioAnterior) {
                await query('UPDATE refugios SET ocupacion_actual = GREATEST(0, ocupacion_actual - 1) WHERE id = $1', [refugioAnterior]);
            }
            if (refugio_id) {
                await query('UPDATE refugios SET ocupacion_actual = ocupacion_actual + 1 WHERE id = $1', [refugio_id]);
            }
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar núcleo' });
    }
});

// DELETE /api/nucleos/:id
router.delete('/:id', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        const nucleo = await query('SELECT refugio_id FROM nucleos_familiares WHERE id = $1', [req.params.id]);
        await query('UPDATE nucleos_familiares SET activo = false WHERE id = $1', [req.params.id]);
        if (nucleo.rows[0]?.refugio_id) {
            await query('UPDATE refugios SET ocupacion_actual = GREATEST(0, ocupacion_actual - 1) WHERE id = $1', [nucleo.rows[0].refugio_id]);
        }
        res.json({ mensaje: 'Núcleo desactivado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar núcleo' });
    }
});

module.exports = router;
