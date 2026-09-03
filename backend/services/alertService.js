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

        // --- 1. Determinar si corresponde alerta según tipo de medición ---
        if (medicion.tipo_medicion === 'nivel_rio') {
            if (estacion.nivel_critico && parseFloat(medicion.valor) >= parseFloat(estacion.nivel_critico)) {
                tipoAlerta = 'CRÍTICO';
            } else if (estacion.nivel_alerta && parseFloat(medicion.valor) >= parseFloat(estacion.nivel_alerta)) {
                tipoAlerta = 'ALERTA';
            }
        } else if (medicion.tipo_medicion === 'precipitacion') {
            // Para precipitación usamos umbrales fijos (puedes ajustarlos)
            const valor = parseFloat(medicion.valor);
            if (valor >= 150) {
                tipoAlerta = 'CRÍTICO';
            } else if (valor >= 100) {
                tipoAlerta = 'ALERTA';
            }
        }

        // Si no hay alerta, salir
        if (!tipoAlerta) {
            console.log('ℹ️ Medición dentro de parámetros normales. No se genera alerta.');
            return { alertaGenerada: false, archivo: null };
        }

        console.log(`⚠️ Alerta ${tipoAlerta} detectada para estación ${estacion.nombre}`);

        // --- 2. Obtener pobladores asociados a la estación ---
        const pobladoresRes = await query(
            `SELECT * FROM pobladores 
             WHERE estacion_id = $1 AND activo = true
             ORDER BY apellido, nombre`,
            [estacion.id]
        );

        const pobladores = pobladoresRes.rows;

        if (pobladores.length === 0) {
            console.log('ℹ️ No hay pobladores registrados para esta estación. No se genera Excel.');
            return { alertaGenerada: false, archivo: null };
        }

        // --- 3. Generar el archivo Excel ---
        const resultado = await excelService.generarExcelPobladores(
            pobladores,
            estacion,
            tipoAlerta,
            medicion.valor,
            medicion.fecha_hora
        );

        // --- 4. Guardar registro en tabla alertas ---
        await query(
            `INSERT INTO alertas (estacion_id, medicion_id, tipo_alerta, archivo_excel, mensaje)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                estacion.id,
                medicion.id,
                tipoAlerta,
                resultado.filename,
                `Alerta ${tipoAlerta} - Estación: ${estacion.nombre} - Valor: ${medicion.valor}`
            ]
        );

        console.log(`✅ Excel generado y alerta registrada: ${resultado.filename}`);

        return {
            alertaGenerada: true,
            archivo: resultado.filename
        };

    } catch (error) {
        console.error('❌ Error en alertService:', error);
        return { alertaGenerada: false, archivo: null };
    }
}

module.exports = { verificarYGenerarAlerta };
