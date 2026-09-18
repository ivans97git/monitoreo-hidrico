const { query } = require('../config/database');
const excelService = require('./excelService');

async function verificarYGenerarAlertaAutomatica(medicion, estacion) {
    try {
        // Solo aplica a nivel de río
        if (medicion.tipo_medicion !== 'nivel_rio') {
            return { alertaGenerada: false, archivo: null };
        }

        const valor = parseFloat(medicion.valor);
        const nivelCritico = parseFloat(estacion.nivel_critico);
        const nivelAlerta = parseFloat(estacion.nivel_alerta);

        let tipoAlerta = null;
        if (!isNaN(nivelCritico) && valor >= nivelCritico) {
            tipoAlerta = 'CRÍTICO';
        } else if (!isNaN(nivelAlerta) && valor >= nivelAlerta) {
            tipoAlerta = 'ALERTA';
        }

        if (!tipoAlerta) {
            console.log('ℹ️ Nivel dentro de parámetros normales.');
            return { alertaGenerada: false, archivo: null };
        }

        console.log(`⚠️ Alerta ${tipoAlerta} detectada para estación ${estacion.nombre}`);

        // Buscar FAMILIAS asociadas a la estación
        const familiasRes = await query(
            `SELECT f.*,
                (SELECT COUNT(*) FROM personas p WHERE p.familia_id = f.id AND p.activo = true) as cantidad_integrantes
             FROM familias f
             WHERE f.estacion_id = $1 AND f.activo = true
             ORDER BY f.prioridad NULLS LAST, f.numero_familia`,
            [estacion.id]
        );
        const familias = familiasRes.rows;

        if (familias.length === 0) {
            console.log('ℹ️ No hay familias asociadas a esta estación.');
            return { alertaGenerada: false, archivo: null };
        }

        // Generar Excel con familias afectadas
        const resultado = await excelService.generarExcelFamilias(
            familias, estacion, tipoAlerta, valor, medicion.fecha_hora
        );

        // Guardar alerta
        await query(
            `INSERT INTO alertas (estacion_id, medicion_id, tipo_alerta, archivo_excel, mensaje)
             VALUES ($1, $2, $3, $4, $5)`,
            [estacion.id, medicion.id, tipoAlerta, resultado.filename, `Alerta automática ${tipoAlerta}`]
        );

        console.log(`✅ Excel generado y alerta registrada: ${resultado.filename}`);
        return { alertaGenerada: true, archivo: resultado.filename };
    } catch (error) {
        console.error('❌ Error en alerta automática:', error);
        return { alertaGenerada: false, archivo: null };
    }
}

module.exports = { verificarYGenerarAlertaAutomatica };
