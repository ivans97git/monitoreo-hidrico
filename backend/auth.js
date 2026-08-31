const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware de autenticación
const autenticarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: 'Acceso denegado. Token no proporcionado.'
        });
    }

    try {
        const usuario = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = usuario;
        next();
    } catch (error) {
        return res.status(403).json({
            error: 'Token inválido o expirado.'
        });
    }
};

// Middleware para verificar roles
const autorizarRol = (...roles) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        if (!roles.includes(req.usuario.rol)) {
            return res.status(403).json({
                error: 'No tiene permisos para esta acción'
            });
        }

        next();
    };
};

module.exports = { autenticarToken, autorizarRol };