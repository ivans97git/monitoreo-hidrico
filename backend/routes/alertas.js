const express = require('express');
const { query } = require('../config/database');
const { autenticarToken, autorizarRol } = require('../middleware/auth');
const excelService = require('../services/excelService');

const router = express.Router();

// GET /api/alertas → todos los roles
router.get('/', autenticarToken, async (req, res) => {
    try {
        const { desde, hasta, estacion_id, limite = 50 } = req.query;
        let sql = `SELECT a.*, e.nombre as nombre_estacion
                   FROM alertas a
                   JOIN estaciones e ON a.estacion_id = e.id
                   WHERE 1=1`;
        const params = [];
        let paramCount = 1;
        if (estacion_id) { sql += ` AND a.estacion_id = $${paramCount}`; params.push(estacion_id); paramCount++; }
        if (desde) { sql += ` AND a.fecha_generacion >= $${paramCount}`; params.push(desde); paramCount++; }
        if (hasta) { sql += ` AND a.fecha_generacion <= $${paramCount}`; params.push(hasta); paramCount++; }
        sql += ` ORDER BY a.fecha_generacion DESC LIMIT $${paramCount}`;
        params.push(Math.min(parseInt(limite) || 50, 200));
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo alertas:', error);
        res.status(500).json({ error: 'Error al obtener alertas' });
    }
});

// POST /api/alertas/generar → admin y editor
router.post('/generar', autenticarToken, autorizarRol('admin', 'editor'), async (req, res) => {
    try {
        const { estacion_id, tipo_alerta, mensaje } = req.body;
        if (!estacion_id) return res.status(400).json({ error: 'Se requiere estacion_id' });
        const tipo = tipo_alerta === 'CRÍTICO' ? 'CRÍTICO' : 'ALERTA';
        const estRes = await query('SELECT * FROM estaciones WHERE id = $1', [estacion_id]);
        if (estRes.rows.length === 0) return res.status(404).json({ error: 'Estación no encontrada' });
        const estacion = estRes.rows[0];
        const pobRes = await query('SELECT * FROM pobladores WHERE estacion_id = $1 AND activo = true', [estacion_id]);
        if (pobRes.rows.length === 0) return res.status(400).json({ error: 'No hay pobladores para esta estación' });
        const resultado = await excelService.generarExcelPobladores(pobRes.rows, estacion, tipo, null, new Date());
        const mensajeFinal = mensaje || `Alerta manual ${tipo}`;
        await query(
            `INSERT INTO alertas (estacion_id, tipo_alerta, archivo_excel, mensaje)
             VALUES ($1, $2, $3, $4)`,
            [estacion.id, tipo, resultado.filename, mensajeFinal]
        );
        res.json({ mensaje: 'Alerta manual generada exitosamente', archivo: resultado.filename, tipo_alerta: tipo });
    } catch (error) {
        console.error('Error generando alerta manual:', error);
        res.status(500).json({ error: 'Error al generar alerta manual' });
    }
});

// DELETE /api/alertas/:id → solo admin
router.delete('/:id', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        await query('DELETE FROM alertas WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Alerta eliminada exitosamente' });
    } catch (error) {
        console.error('Error eliminando alerta:', error);
        res.status(500).json({ error: 'Error al eliminar alerta' });
    }
});

module.exports = router;
