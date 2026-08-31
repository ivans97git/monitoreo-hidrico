-- Datos iniciales para el sistema

-- Insertar usuario admin (password: admin123)
INSERT INTO usuarios (username, password_hash, nombre, email, rol) VALUES
('admin', '$2b$10$YourHashHere', 'Administrador', 'admin@example.com', 'admin'),
('operador1', '$2b$10$YourHashHere', 'Operador 1', 'operador1@example.com', 'operador');

-- Insertar estaciones de ejemplo
INSERT INTO estaciones (nombre, latitud, longitud, tipo, nivel_critico, nivel_alerta, descripcion) VALUES
('Río Paraná - Puerto Iguazú', -25.595, -54.565, 'rio', 18.0, 15.0, 'Estación de monitoreo en Puerto Iguazú'),
('Río Uruguay - San Javier', -27.874, -55.135, 'rio', 12.0, 10.0, 'Estación de monitoreo en San Javier'),
('Arroyo Mártires', -27.367, -55.897, 'rio', 5.0, 3.5, 'Arroyo urbano en Posadas'),
('Pluviómetro Centro', -27.367, -55.897, 'pluviometrica', NULL, NULL, 'Estación pluviométrica centro'),
('Pluviómetro Zona Norte', -27.350, -55.910, 'pluviometrica', NULL, NULL, 'Estación pluviométrica zona norte');

-- Insertar contactos de ejemplo
INSERT INTO contactos_alertas (nombre, telefono, estacion_id) VALUES
('Defensa Civil', '5493764123456', 1),
('Bomberos Voluntarios', '5493764987654', 1),
('Centro de Monitoreo', '5493764555555', 3);

-- Insertar algunas mediciones de ejemplo
INSERT INTO mediciones (estacion_id, usuario_id, valor, tipo_medicion, observaciones) VALUES
(1, 1, 14.5, 'nivel_rio', 'Nivel normal'),
(1, 1, 15.2, 'nivel_rio', 'Nivel en aumento'),
(3, 2, 3.2, 'nivel_rio', 'Normal'),
(4, 2, 25.5, 'precipitacion', 'Lluvia moderada');