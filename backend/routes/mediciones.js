const express = require('express');
const { query } = require('../config/database');
const { autenticarToken } = require('../middleware/auth');
const { verificarYGenerarAlerta } = require('../services/alertService');

const router = express.Router();

// POST /api/mediciones
router.post('/', autenticarToken, async (req, res) => {
    try {
        const { estacion_id, valor, tipo_medicion, observaciones, fecha_hora } = req.body;

        if (!estacion_id || !valor || !tipo_medicion) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }

        const estacionRes = await query('SELECT * FROM estaciones WHERE id = $1', [estacion_id]);
        if (estacionRes.rows.length === 0) return res.status(404).json({ error: 'Estación no encontrada' });

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

module.exports = router;