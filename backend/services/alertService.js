const { query } = require('../config/database');
const excelService = require('./excelService');

/**
 * Verifica si una medición supera los umbrales de alerta de la estación
 * y, en caso afirmativo, genera un archivo Excel con los pobladores afectados.
 * 
 * @param {object} medicion - La medición registrada (debe incluir id, estacion_id, valor, tipo_medicion, fecha_hora)
 * @param {object} estacion - La estación asociada (debe incluir id, nombre, nivel_alerta, nivel_critico, tipo)
 * @returns {Promise<{alertaGenerada: boolean, archivo: string|null}>}
 */

async function verificarYGenerarAlerta(medicion, estacion) {
    try {
        let tipoAlerta = null;

        // Solo alertas para nivel de río
        if (medicion.tipo_medicion !== 'nivel_rio') {
            console.log('ℹ️ Medición de lluvia, no genera alerta.');
            return { alertaGenerada: false, archivo: null };
        }

        const valor = parseFloat(medicion.valor);
        if (estacion.nivel_critico && valor >= parseFloat(estacion.nivel_critico)) {
            tipoAlerta = 'CRÍTICO';
        } else if (estacion.nivel_alerta && valor >= parseFloat(estacion.nivel_alerta)) {
            tipoAlerta = 'ALERTA';
        }

        if (!tipoAlerta) {
            console.log('ℹ️ Nivel dentro de parámetros normales.');
            return { alertaGenerada: false, archivo: null };
        }

        console.log(`⚠️ Alerta ${tipoAlerta} detectada para estación ${estacion.nombre}`);

        // Obtener pobladores...
        const pobladoresRes = await query(
            'SELECT * FROM pobladores WHERE estacion_id = $1 AND activo = true',
            [estacion.id]
        );
        const pobladores = pobladoresRes.rows;

        if (pobladores.length === 0) {
            console.log('ℹ️ No hay pobladores registrados para esta estación.');
            return { alertaGenerada: false, archivo: null };
        }

        const resultado = await excelService.generarExcelPobladores(
            pobladores, estacion, tipoAlerta, medicion.valor, medicion.fecha_hora
        );

        await query(
            `INSERT INTO alertas (estacion_id, medicion_id, tipo_alerta, archivo_excel, mensaje)
             VALUES ($1, $2, $3, $4, $5)`,
            [estacion.id, medicion.id, tipoAlerta, resultado.filename, `Alerta ${tipoAlerta}`]
        );

        console.log(`✅ Excel generado: ${resultado.filename}`);
        return { alertaGenerada: true, archivo: resultado.filename };

    } catch (error) {
        console.error('❌ Error en alertService:', error);
        return { alertaGenerada: false, archivo: null };
    }
}

module.exports = { verificarYGenerarAlerta };
