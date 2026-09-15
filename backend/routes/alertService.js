const { query } = require('../config/database');
const excelService = require('./excelService');

async function verificarYGenerarAlertaAutomatica(medicion, estacion) {
    try {
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

        if (!tipoAlerta) return { alertaGenerada: false, archivo: null };

        const pobladoresRes = await query(
            'SELECT * FROM pobladores WHERE estacion_id = $1 AND activo = true',
            [estacion.id]
        );
        const pobladores = pobladoresRes.rows;
        if (pobladores.length === 0) return { alertaGenerada: false, archivo: null };

        const resultado = await excelService.generarExcelPobladores(
            pobladores, estacion, tipoAlerta, valor, medicion.fecha_hora
        );

        await query(
            `INSERT INTO alertas (estacion_id, medicion_id, tipo_alerta, archivo_excel, mensaje)
             VALUES ($1, $2, $3, $4, $5)`,
            [estacion.id, medicion.id, tipoAlerta, resultado.filename, `Alerta automática ${tipoAlerta}`]
        );

        return { alertaGenerada: true, archivo: resultado.filename };
    } catch (error) {
        console.error('Error en alerta automática:', error);
        return { alertaGenerada: false, archivo: null };
    }
}

module.exports = { verificarYGenerarAlertaAutomatica };
