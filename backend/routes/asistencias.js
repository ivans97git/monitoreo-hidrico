const express = require('express');
const { query } = require('../config/database');
const { autenticarToken, autorizarRol } = require('../middleware/auth');

const router = express.Router();

router.get('/', autenticarToken, async (req, res) => {
    try {
        const { nucleo_id, refugio_id, desde, hasta } = req.query;
        let sql = `SELECT a.*, n.apellido as nucleo_apellido, r.nombre as refugio_nombre, u.username
                   FROM asistencias a
                   LEFT JOIN nucleos_familiares n ON a.nucleo_id = n.id
                   LEFT JOIN refugios r ON a.refugio_id = r.id
                   LEFT JOIN usuarios u ON a.usuario_id = u.id
                   WHERE 1=1`;
        const params = [];
        let c = 1;
        if (nucleo_id) { sql += ` AND a.nucleo_id = $${c}`; params.push(nucleo_id); c++; }
        if (refugio_id) { sql += ` AND a.refugio_id = $${c}`; params.push(refugio_id); c++; }
        if (desde) { sql += ` AND a.fecha >= $${c}`; params.push(desde); c++; }
        if (hasta) { sql += ` AND a.fecha <= $${c}`; params.push(hasta); c++; }
        sql += ' ORDER BY a.fecha DESC LIMIT 200';
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener asistencias' });
    }
});

router.post('/', autenticarToken, autorizarRol('admin', 'editor'), async (req, res) => {
    try {
        const { nucleo_id, refugio_id, tipo, descripcion } = req.body;
        if (!nucleo_id || !tipo) return res.status(400).json({ error: 'Núcleo y tipo son obligatorios' });
        const result = await query(
            `INSERT INTO asistencias (nucleo_id, refugio_id, tipo, descripcion, usuario_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [nucleo_id, refugio_id || null, tipo, descripcion, req.usuario.id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear asistencia' });
    }
});

router.delete('/:id', autenticarToken, autorizarRol('admin'), async (req, res) => {
    try {
        await query('DELETE FROM asistencias WHERE id = $1', [req.params.id]);
        res.json({ mensaje: 'Asistencia eliminada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar asistencia' });
    }
});

module.exports = router;
