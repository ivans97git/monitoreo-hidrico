const express = require('express');
const { query } = require('../config/database');
const { autenticarToken, autorizarRol } = require('../middleware/auth');
const excelService = require('../services/excelService');

const router = express.Router();

// GET /api/alertas
router.get('/', autenticarToken, async (req, res) => {
    try {
        const { desde, hasta, estacion_id, limite = 50 } = req.query;
        let sql = `
            SELECT a.*, e.nombre as nombre_estacion
            FROM alertas a
            JOIN estaciones e ON a.estacion_id = e.id
            WHERE 1=1
        `;
        const params = [];
        let c = 1;
        if (estacion_id) { sql += ` AND a.estacion_id = $${c}`; params.push(estacion_id); c++; }
        if (desde) { sql += ` AND a.fecha_generacion >= $${c}`; params.push(desde); c++; }
        if (hasta) { sql += ` AND a.fecha_generacion <= $${c}`; params.push(hasta); c++; }
        sql += ` ORDER BY a.fecha_generacion DESC LIMIT $${c}`;
        params.push(Math.min(parseInt(limite) || 50, 200));
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo alertas:', error);
        res.status(500).json({ error: 'Error al obtener alertas' });
    }
});

// POST /api/alertas/generar
router.post('/generar', autenticarToken, autorizarRol('admin', 'editor'), async (req, res) => {
    try {
        const { estacion_id, tipo_alerta, mensaje } = req.body;
        if (!estacion_id) return res.status(400).json({ error: 'Se requiere estacion_id' });

        const tipo = tipo_alerta === 'CRÍTICO' ? 'CRÍTICO' : 'ALERTA';

        const estRes = await query('SELECT * FROM estaciones WHERE id = $1', [estacion_id]);
        if (estRes.rows.length === 0) return res.status(404).json({ error: 'Estación no encontrada' });
        const estacion = estRes.rows[0];

        const famRes = await query(
            `SELECT f.*,
                (SELECT COUNT(*) FROM personas p WHERE p.familia_id = f.id AND p.activo = true) as cantidad_integrantes
             FROM familias f
             WHERE f.estacion_id = $1 AND f.activo = true
             ORDER BY f.prioridad NULLS LAST, f.numero_familia`,
            [estacion_id]
        );
        if (famRes.rows.length === 0) {
            return res.status(400).json({ error: 'No hay familias asociadas a esta estación' });
        }

        const { buffer, filename } = await excelService.generarExcelFamiliasBuffer(
            famRes.rows, estacion, tipo, null, new Date()
        );

        const mensajeFinal = mensaje || `Alerta manual ${tipo}`;
        await query(
            `INSERT INTO alertas (estacion_id, tipo_alerta, archivo_excel, mensaje)
             VALUES ($1, $2, $3, $4)`,
            [estacion.id, tipo, filename, mensajeFinal]
        );

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Error generando alerta manual:', error);
        res.status(500).json({ error: 'Error al generar alerta manual' });
    }
});

// DELETE /api/alertas/:id
router.delete('/:id', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        await query('DELETE FROM alertas WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Alerta eliminada' });
    } catch (error) {
        console.error('Error eliminando alerta:', error);
        res.status(500).json({ error: 'Error al eliminar alerta' });
    }
});

// GET /api/alertas/:id
router.get('/:id', autenticarToken, async (req, res) => {
    try {
        const result = await query(
            `SELECT a.*, e.nombre as nombre_estacion
             FROM alertas a
             JOIN estaciones e ON a.estacion_id = e.id
             WHERE a.id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Alerta no encontrada' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener alerta' });
    }
});

module.exports = router;
