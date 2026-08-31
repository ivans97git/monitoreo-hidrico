const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { autenticarToken, autorizarRol } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register - Registrar nuevo usuario
router.post('/register', async (req, res) => {
    try {
        const { username, password, nombre, email, rol = 'operador' } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }

        const usuarioExistente = await query(
            'SELECT id FROM usuarios WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (usuarioExistente.rows.length > 0) {
            return res.status(400).json({ error: 'El usuario o email ya está registrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await query(
            `INSERT INTO usuarios (username, password_hash, nombre, email, rol) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, username, nombre, email, rol`,
            [username, passwordHash, nombre, email, rol]
        );

        res.status(201).json({
            mensaje: 'Usuario registrado exitosamente',
            usuario: result.rows[0]
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

// POST /api/auth/login - Iniciar sesión
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
        }

        const result = await query(
            'SELECT * FROM usuarios WHERE username = $1 OR email = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const usuario = result.rows[0];
        const passwordValido = await bcrypt.compare(password, usuario.password_hash);

        if (!passwordValido) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: usuario.id, username: usuario.username, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        res.json({
            mensaje: 'Login exitoso',
            token,
            usuario: {
                id: usuario.id,
                username: usuario.username,
                nombre: usuario.nombre,
                rol: usuario.rol
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// GET /api/auth/me - Obtener usuario actual
router.get('/me', autenticarToken, async (req, res) => {
    try {
        const result = await query(
            'SELECT id, username, nombre, email, rol, created_at FROM usuarios WHERE id = $1',
            [req.usuario.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});

// PUT /api/auth/password - Cambiar contraseña
router.put('/password', autenticarToken, async (req, res) => {
    try {
        const { passwordActual, passwordNueva } = req.body;

        const result = await query(
            'SELECT password_hash FROM usuarios WHERE id = $1',
            [req.usuario.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const passwordValido = await bcrypt.compare(passwordActual, result.rows[0].password_hash);

        if (!passwordValido) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        const passwordHash = await bcrypt.hash(passwordNueva, 10);
        await query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [passwordHash, req.usuario.id]);

        res.json({ mensaje: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
});

module.exports = router;