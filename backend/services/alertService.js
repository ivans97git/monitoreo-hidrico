const { query } = require('../config/database');
const whatsappService = require('./whatsappWebService');

class AlertService {
    async verificarNivelesCriticos(medicion, estacion) {
        try {
            let alertaGenerada = false;
            let tipoAlerta = null;

            // Verificar según tipo de medición
            if (medicion.tipo_medicion === 'nivel_rio') {
                // Verificar nivel crítico
                if (estacion.nivel_critico && medicion.valor >= estacion.nivel_critico) {
                    tipoAlerta = 'CRÍTICO';
                    alertaGenerada = true;
                }
                // Verificar nivel de alerta
                else if (estacion.nivel_alerta && medicion.valor >= estacion.nivel_alerta) {
                    tipoAlerta = 'ALERTA';
                    alertaGenerada = true;
                }
            } else if (medicion.tipo_medicion === 'precipitacion') {
                // Para precipitaciones, verificar acumulado 24h
                const acumulado24h = await this.obtenerPrecipitacion24h(estacion.id);
                
                if (acumulado24h >= 150) {
                    tipoAlerta = 'CRÍTICO';
                    alertaGenerada = true;
                } else if (acumulado24h >= 100) {
                    tipoAlerta = 'ALERTA';
                    alertaGenerada = true;
                }
            }

            if (alertaGenerada) {
                await this.enviarAlertas(estacion, medicion, tipoAlerta);
            }

            return alertaGenerada;
        } catch (error) {
            console.error('Error verificando niveles críticos:', error);
            return false;
        }
    }

    async obtenerPrecipitacion24h(estacionId) {
        try {
            const result = await query(
                `SELECT COALESCE(SUM(valor), 0) as total
                 FROM mediciones
                 WHERE estacion_id = $1 
                 AND tipo_medicion = 'precipitacion'
                 AND fecha_hora >= NOW() - INTERVAL '24 hours'`,
                [estacionId]
            );
            
            return parseFloat(result.rows[0].total);
        } catch (error) {
            console.error('Error obteniendo precipitación 24h:', error);
            return 0;
        }
    }

    async enviarAlertas(estacion, medicion, tipoAlerta) {
        try {
            // Obtener contactos para esta estación
            const contactosResult = await query(
                `SELECT * FROM contactos_alertas 
                 WHERE estacion_id = $1 AND activo = true`,
                [estacion.id]
            );

            const contactos = contactosResult.rows;
            
            if (contactos.length === 0) {
                console.log('No hay contactos para alertar en esta estación');
                return;
            }

            const datosAlerta = {
                estacion: estacion.nombre,
                valor: medicion.valor,
                unidad: medicion.tipo_medicion === 'nivel_rio' ? 'metros' : 'mm',
                tipoAlerta: tipoAlerta,
                fecha: new Date().toLocaleString('es-AR')
            };

            // Enviar alertas a cada contacto
            const resultados = [];
            for (const contacto of contactos) {
                const resultado = await whatsappService.enviarAlerta(
                    contacto.telefono,
                    datosAlerta
                );
                resultados.push({
                    contacto: contacto.telefono,
                    ...resultado
                });
            }

            // Registrar alerta en la base de datos
            await query(
                `INSERT INTO alertas (estacion_id, medicion_id, mensaje, destinatarios, tipo_alerta) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    estacion.id,
                    medicion.id,
                    `Alerta ${tipoAlerta} - ${estacion.nombre}: ${medicion.valor} ${datosAlerta.unidad}`,
                    contactos.map(c => c.telefono),
                    tipoAlerta
                ]
            );

            console.log(`✅ Alertas enviadas a ${contactos.length} contactos`);
            return resultados;
        } catch (error) {
            console.error('Error enviando alertas:', error);
            throw error;
        }
    }
}

module.exports = new AlertService();
