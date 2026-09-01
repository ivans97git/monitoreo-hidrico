const { query } = require('../config/database');
const excelService = require('./excelService');

async function verificarYGenerarAlerta(medicion, estacion) {
    try {
        let tipoAlerta = null;

        if (medicion.tipo_medicion === 'nivel_rio') {
            if (estacion.nivel_critico && medicion.valor >= estacion.nivel_critico) {
                tipoAlerta = 'CRÍTICO';
            } else if (estacion.nivel_alerta && medicion.valor >= estacion.nivel_alerta) {
                tipoAlerta = 'ALERTA';
            }
        } else if (medicion.tipo_medicion === 'precipitacion') {
            // Aquí podrías usar lógica de acumulado 24h, pero lo simplificamos
            // usando umbrales de la estación si existieran (no en este esquema)
            // Por ahora no generamos alerta para precipitación a menos que definas umbrales en estación
            // Si quieres puedes agregar columnas "umbral_precipitacion"
        }

        if (tipoAlerta) {
            const pobladoresRes = await query(
                'SELECT * FROM pobladores WHERE estacion_id = $1 AND activo = true',
                [estacion.id]
            );
            const pobladores = pobladoresRes.rows;

            if (pobladores.length > 0) {
                const resultado = await excelService.generarExcelPobladores(
                    pobladores, estacion, tipoAlerta, medicion.valor, medicion.fecha_hora
                );

                await query(
                    `INSERT INTO alertas (estacion_id, medicion_id, tipo_alerta, archivo_excel, mensaje)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [estacion.id, medicion.id, tipoAlerta, resultado.filename, `Alerta ${tipoAlerta}`]
                );

                return { alertaGenerada: true, archivo: resultado.filename };
            } else {
                console.log('No hay pobladores para esta estación');
                return { alertaGenerada: false };
            }
        }

        return { alertaGenerada: false };
    } catch (error) {
        console.error('Error en alertService:', error);
        return { alertaGenerada: false };
    }
}

module.exports = { verificarYGenerarAlerta };
