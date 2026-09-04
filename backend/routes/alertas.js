const express = require('express');
const { query } = require('../config/database');
const { autenticarToken, autorizarRol } = require('../middleware/auth');

const router = express.Router();

// GET /api/alertas - Obtener historial de alertas
router.get('/', autenticarToken, async (req, res) => {
    try {
        const { desde, hasta, estacion_id, limite = 50 } = req.query;
        
        let sql = `
            SELECT a.*, e.nombre as nombre_estacion, 
                   m.valor as valor_medicion,
                   m.tipo_medicion
            FROM alertas a
            JOIN estaciones e ON a.estacion_id = e.id
            LEFT JOIN mediciones m ON a.medicion_id = m.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 1;
        
        if (estacion_id) {
            sql += ` AND a.estacion_id = $${paramCount}`;
            params.push(estacion_id);
            paramCount++;
        }
        
        if (desde) {
            sql += ` AND a.fecha_envio >= $${paramCount}`;
            params.push(desde);
            paramCount++;
        }
        
        if (hasta) {
            sql += ` AND a.fecha_envio <= $${paramCount}`;
            params.push(hasta);
            paramCount++;
        }
        
        sql += ` ORDER BY a.fecha_envio DESC LIMIT $${paramCount}`;
        params.push(Math.min(limite, 200));
        
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo alertas:', error);
        res.status(500).json({ error: 'Error al obtener alertas' });
    }
});

// GET /api/alertas/estadisticas - Estadísticas de alertas
router.get('/estadisticas', autenticarToken, async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                COUNT(*) as total_alertas,
                COUNT(CASE WHEN tipo_alerta = 'CRÍTICO' THEN 1 END) as alertas_criticas,
                COUNT(CASE WHEN tipo_alerta = 'ALERTA' THEN 1 END) as alertas_normales,
                DATE_TRUNC('day', fecha_envio) as fecha,
                COUNT(*) as alertas_por_dia
            FROM alertas
            WHERE fecha_envio >= NOW() - INTERVAL '30 days'
            GROUP BY DATE_TRUNC('day', fecha_envio)
            ORDER BY fecha DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// GET /api/alertas/:id - Obtener alerta específica
router.get('/:id', autenticarToken, async (req, res) => {
    try {
        const result = await query(
            `SELECT a.*, e.nombre as nombre_estacion,
                    m.valor as valor_medicion
             FROM alertas a
             JOIN estaciones e ON a.estacion_id = e.id
             LEFT JOIN mediciones m ON a.medicion_id = m.id
             WHERE a.id = $1`,
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Alerta no encontrada' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo alerta:', error);
        res.status(500).json({ error: 'Error al obtener alerta' });
    }
});

// POST /api/alertas/enviar - Enviar alerta manual
router.post('/enviar', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        const { estacion_id, mensaje, tipo_alerta = 'ALERTA' } = req.body;
        
        if (!estacion_id || !mensaje) {
            return res.status(400).json({ 
                error: 'Estación y mensaje son requeridos' 
            });
        }
        
        // Obtener contactos
        const contactos = await query(
            'SELECT * FROM contactos_alertas WHERE estacion_id = $1 AND activo = true',
            [estacion_id]
        );
        
        if (contactos.rows.length === 0) {
            return res.status(400).json({ 
                error: 'No hay contactos registrados para esta estación' 
            });
        }
        
        const whatsappService = require('../services/whatsappService');
        const resultados = [];
        
        for (const contacto of contactos.rows) {
            const resultado = await whatsappService.enviarMensaje(
                contacto.telefono,
                mensaje,
                tipo_alerta === 'CRÍTICO' ? 'plantilla_critica' : 'plantilla_alerta'
            );
            resultados.push({ contacto: contacto.telefono, ...resultado });
        }
        
        // Registrar alerta
        const alerta = await query(
            `INSERT INTO alertas (estacion_id, mensaje, destinatarios, tipo_alerta) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [
                estacion_id,
                mensaje,
                contactos.rows.map(c => c.telefono),
                tipo_alerta
            ]
        );
        
        res.json({
            alerta: alerta.rows[0],
            resultados_envio: resultados
        });
    } catch (error) {
        console.error('Error enviando alerta manual:', error);
        res.status(500).json({ error: 'Error al enviar alerta' });
    }
});

// POST /api/alertas/generar
router.post('/generar', autenticarToken, async (req, res) => {
    try {
        const { estacion_id } = req.body;
        if (!estacion_id) {
            return res.status(400).json({ error: 'Se requiere estacion_id' });
        }

        // Obtener estación
        const estRes = await query('SELECT * FROM estaciones WHERE id = $1', [estacion_id]);
        if (estRes.rows.length === 0) return res.status(404).json({ error: 'Estación no encontrada' });
        const estacion = estRes.rows[0];

        // Obtener última medición de río
        const medRes = await query(
            `SELECT * FROM mediciones 
             WHERE estacion_id = $1 AND tipo_medicion = 'nivel_rio'
             ORDER BY fecha_hora DESC LIMIT 1`,
            [estacion_id]
        );
        if (medRes.rows.length === 0) return res.status(400).json({ error: 'No hay mediciones de río para esta estación' });
        const medicion = medRes.rows[0];

        // Determinar tipo (alerta o crítico)
        const valor = parseFloat(medicion.valor);
        let tipo_alerta = null;
        if (estacion.nivel_critico && valor >= parseFloat(estacion.nivel_critico)) tipo_alerta = 'CRÍTICO';
        else if (estacion.nivel_alerta && valor >= parseFloat(estacion.nivel_alerta)) tipo_alerta = 'ALERTA';
        else return res.status(400).json({ error: 'El nivel actual no supera umbrales. No se puede generar alerta automática.' });

        // Obtener pobladores
        const pobladoresRes = await query('SELECT * FROM pobladores WHERE estacion_id = $1 AND activo = true', [estacion_id]);
        if (pobladoresRes.rows.length === 0) return res.status(400).json({ error: 'No hay pobladores para esta estación' });

        // Generar Excel
        const excelService = require('../services/excelService');
        const resultado = await excelService.generarExcelPobladores(
            pobladoresRes.rows, estacion, tipo_alerta, medicion.valor, medicion.fecha_hora
        );

        // Registrar alerta
        await query(
            `INSERT INTO alertas (estacion_id, medicion_id, tipo_alerta, archivo_excel, mensaje)
             VALUES ($1, $2, $3, $4, $5)`,
            [estacion.id, medicion.id, tipo_alerta, resultado.filename, `Alerta manual ${tipo_alerta}`]
        );

        res.json({ mensaje: 'Alerta generada', archivo: resultado.filename });
    } catch (error) {
        console.error('Error generando alerta manual:', error);
        res.status(500).json({ error: 'Error al generar alerta' });
    }
});

module.exports = router;
