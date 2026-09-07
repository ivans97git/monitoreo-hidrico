const express = require('express');
const { query } = require('../config/database');
const { autenticarToken } = require('../middleware/auth');
const excelService = require('../services/excelService');

const router = express.Router();

// POST /api/alertas/generar
router.post('/generar', autenticarToken, async (req, res) => {
    try {
        const { estacion_id, tipo_alerta, mensaje } = req.body;

        if (!estacion_id) {
            return res.status(400).json({ error: 'Se requiere estacion_id' });
        }

        const tipo = tipo_alerta === 'CRÍTICO' ? 'CRÍTICO' : 'ALERTA';

        const estRes = await query('SELECT * FROM estaciones WHERE id = $1', [estacion_id]);
        if (estRes.rows.length === 0) {
            return res.status(404).json({ error: 'Estación no encontrada' });
        }
        const estacion = estRes.rows[0];

        const pobRes = await query(
            'SELECT * FROM pobladores WHERE estacion_id = $1 AND activo = true',
            [estacion_id]
        );
        if (pobRes.rows.length === 0) {
            return res.status(400).json({ error: 'No hay pobladores para esta estación' });
        }

        const resultado = await excelService.generarExcelPobladores(
            pobRes.rows, estacion, tipo, null, new Date()
        );

        const mensajeFinal = mensaje || `Alerta manual ${tipo}`;

        await query(
            `INSERT INTO alertas (estacion_id, tipo_alerta, archivo_excel, mensaje)
             VALUES ($1, $2, $3, $4)`,
            [estacion.id, tipo, resultado.filename, mensajeFinal]
        );

        res.json({
            mensaje: 'Alerta manual generada exitosamente',
            archivo: resultado.filename,
            tipo_alerta: tipo
        });
    } catch (error) {
        console.error('Error generando alerta manual:', error);
        res.status(500).json({ error: 'Error al generar alerta manual' });
    }
});

module.exports = router;
