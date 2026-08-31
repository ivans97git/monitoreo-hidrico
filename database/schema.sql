-- Esquema de base de datos para Monitoreo Hidrológico

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    rol VARCHAR(20) DEFAULT 'operador' CHECK (rol IN ('admin', 'operador')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de estaciones de monitoreo
CREATE TABLE IF NOT EXISTS estaciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('rio', 'pluviometrica')),
    nivel_critico DECIMAL(5, 2),
    nivel_alerta DECIMAL(5, 2),
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de mediciones
CREATE TABLE IF NOT EXISTS mediciones (
    id SERIAL PRIMARY KEY,
    estacion_id INTEGER REFERENCES estaciones(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id),
    valor DECIMAL(6, 2) NOT NULL,
    tipo_medicion VARCHAR(20) NOT NULL CHECK (tipo_medicion IN ('nivel_rio', 'precipitacion')),
    observaciones TEXT,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de alertas
CREATE TABLE IF NOT EXISTS alertas (
    id SERIAL PRIMARY KEY,
    estacion_id INTEGER REFERENCES estaciones(id),
    medicion_id INTEGER REFERENCES mediciones(id),
    mensaje TEXT NOT NULL,
    destinatarios TEXT[],
    tipo_alerta VARCHAR(20) DEFAULT 'ALERTA' CHECK (tipo_alerta IN ('ALERTA', 'CRÍTICO')),
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'enviada' CHECK (estado IN ('enviada', 'fallida', 'pendiente'))
);

-- Tabla de contactos para alertas
CREATE TABLE IF NOT EXISTS contactos_alertas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    estacion_id INTEGER REFERENCES estaciones(id) ON DELETE CASCADE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(telefono, estacion_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_mediciones_estacion_fecha ON mediciones(estacion_id, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_mediciones_tipo ON mediciones(tipo_medicion);
CREATE INDEX IF NOT EXISTS idx_alertas_fecha ON alertas(fecha_envio DESC);
CREATE INDEX IF NOT EXISTS idx_contactos_estacion ON contactos_alertas(estacion_id);

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar timestamps
CREATE TRIGGER update_usuarios_updated_at 
    BEFORE UPDATE ON usuarios 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estaciones_updated_at 
    BEFORE UPDATE ON estaciones 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contactos_updated_at 
    BEFORE UPDATE ON contactos_alertas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();