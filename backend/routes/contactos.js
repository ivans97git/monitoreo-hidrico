const express = require('express');
const { query } = require('../config/database');
const { autenticarToken, autorizarRol } = require('../middleware/auth');
const validators = require('../utils/validators');

const router = express.Router();

// GET /api/contactos - Obtener contactos
router.get('/', autenticarToken, async (req, res) => {
    try {
        const { estacion_id } = req.query;
        
        let sql = `
            SELECT c.*, e.nombre as nombre_estacion
            FROM contactos_alertas c
            JOIN estaciones e ON c.estacion_id = e.id
            WHERE 1=1
        `;
        
        const params = [];
        if (estacion_id) {
            sql += ' AND c.estacion_id = $1';
            params.push(estacion_id);
        }
        
        sql += ' ORDER BY c.nombre';
        
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo contactos:', error);
        res.status(500).json({ error: 'Error al obtener contactos' });
    }
});

// POST /api/contactos - Crear nuevo contacto
router.post('/', autenticarToken, autorizarRol('admin', 'operador'), async (req, res) => {
    try {
        const { nombre, telefono, estacion_id } = req.body;
        
        // Validaciones
        if (!nombre || !telefono || !estacion_id) {
            return res.status(400).json({ 
                error: 'Nombre, teléfono y estación son requeridos' 
            });
        }
        
        if (!validators.validarTelefono(telefono)) {
            return res.status(400).json({ 
                error: 'Formato de teléfono inválido. Use formato internacional: 5491123456789' 
            });
        }
        
        // Verificar que la estación existe
        const estacion = await query(
            'SELECT id FROM estaciones WHERE id = $1',
            [estacion_id]
        );
        
        if (estacion.rows.length === 0) {
            return res.status(404).json({ error: 'Estación no encontrada' });
        }
        
        // Verificar si el contacto ya existe
        const existente = await query(
            'SELECT id FROM contactos_alertas WHERE telefono = $1 AND estacion_id = $2',
            [telefono, estacion_id]
        );
        
        if (existente.rows.length > 0) {
            return res.status(400).json({ 
                error: 'Este teléfono ya está registrado para esta estación' 
            });
        }
        
        const result = await query(
            `INSERT INTO contactos_alertas (nombre, telefono, estacion_id) 
             VALUES ($1, $2, $3) RETURNING *`,
            [nombre, telefono, estacion_id]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando contacto:', error);
        res.status(500).json({ error: 'Error al crear contacto' });
    }
});

// PUT /api/contactos/:id - Actualizar contacto
router.put('/:id', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        const { nombre, telefono, activo } = req.body;
        
        const result = await query(
            `UPDATE contactos_alertas 
             SET nombre = COALESCE($1, nombre),
                 telefono = COALESCE($2, telefono),
                 activo = COALESCE($3, activo)
             WHERE id = $4 RETURNING *`,
            [nombre, telefono, activo, req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contacto no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando contacto:', error);
        res.status(500).json({ error: 'Error al actualizar contacto' });
    }
});

// DELETE /api/contactos/:id - Eliminar contacto
router.delete('/:id', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        await query('DELETE FROM contactos_alertas WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Contacto eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando contacto:', error);
        res.status(500).json({ error: 'Error al eliminar contacto' });
    }
});

module.exports = router;