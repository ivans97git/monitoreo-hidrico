const express = require('express');
const { query } = require('../config/database');
const { autenticarToken, autorizarRol } = require('../middleware/auth');

const router = express.Router();

// GET /api/estaciones - Obtener todas las estaciones
router.get('/', autenticarToken, async (req, res) => {
    try {
        const result = await query(`
            SELECT e.*,
                (SELECT m.valor FROM mediciones m WHERE m.estacion_id = e.id AND m.tipo_medicion = 'nivel_rio' ORDER BY m.fecha_hora DESC LIMIT 1) as ultima_nivel_rio,
                (SELECT m.fecha_hora FROM mediciones m WHERE m.estacion_id = e.id AND m.tipo_medicion = 'nivel_rio' ORDER BY m.fecha_hora DESC LIMIT 1) as fecha_ultima_nivel_rio,
                (SELECT m.valor FROM mediciones m WHERE m.estacion_id = e.id AND m.tipo_medicion = 'precipitacion' ORDER BY m.fecha_hora DESC LIMIT 1) as ultima_precipitacion,
                (SELECT m.fecha_hora FROM mediciones m WHERE m.estacion_id = e.id AND m.tipo_medicion = 'precipitacion' ORDER BY m.fecha_hora DESC LIMIT 1) as fecha_ultima_precipitacion    
            FROM estaciones e
            ORDER BY e.nombre
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo estaciones:', error);
        res.status(500).json({ error: 'Error al obtener estaciones' });
    }
});

// GET /api/estaciones/:id - Obtener una estación específica
router.get('/:id', autenticarToken, async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM estaciones WHERE id = $1',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Estación no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo estación:', error);
        res.status(500).json({ error: 'Error al obtener estación' });
    }
});

// POST /api/estaciones - Crear nueva estación
router.post('/', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        const { nombre, latitud, longitud, tipo, nivel_critico, nivel_alerta, descripcion } = req.body;

        if (!nombre || !latitud || !longitud || !tipo) {
            return res.status(400).json({ error: 'Nombre, latitud, longitud y tipo son requeridos' });
        }

        if (tipo !== 'rio' && tipo !== 'pluviometrica') {
            return res.status(400).json({ error: 'Tipo debe ser "rio" o "pluviometrica"' });
        }

        const result = await query(
            `INSERT INTO estaciones (nombre, latitud, longitud, tipo, nivel_critico, nivel_alerta, descripcion) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [nombre, latitud, longitud, tipo, nivel_critico, nivel_alerta, descripcion]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando estación:', error);
        res.status(500).json({ error: 'Error al crear estación' });
    }
});

// PUT /api/estaciones/:id - Actualizar estación
router.put('/:id', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        const { nombre, latitud, longitud, tipo, nivel_critico, nivel_alerta, descripcion, activo } = req.body;

        const result = await query(
            `UPDATE estaciones 
             SET nombre = COALESCE($1, nombre),
                 latitud = COALESCE($2, latitud),
                 longitud = COALESCE($3, longitud),
                 tipo = COALESCE($4, tipo),
                 nivel_critico = COALESCE($5, nivel_critico),
                 nivel_alerta = COALESCE($6, nivel_alerta),
                 descripcion = COALESCE($7, descripcion),
                 activo = COALESCE($8, activo)
             WHERE id = $9 
             RETURNING *`,
            [nombre, latitud, longitud, tipo, nivel_critico, nivel_alerta, descripcion, activo, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Estación no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando estación:', error);
        res.status(500).json({ error: 'Error al actualizar estación' });
    }
});

// DELETE /api/estaciones/:id - Eliminar estación (soft delete)
router.delete('/:id', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        await query('DELETE FROM estaciones WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Estación eliminada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar estación' });
    }
});

module.exports = router;
