const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Directorio temporal donde se guardarán los archivos
const TEMP_DIR = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Genera un archivo Excel con los pobladores afectados.
 *
 * @param {Array} pobladores - Lista de objetos { nombre, apellido, telefono, ubicacion }
 * @param {Object} estacion - Datos de la estación { id, nombre, ... }
 * @param {string} tipoAlerta - 'ALERTA' o 'CRÍTICO'
 * @param {number|null} valor - Valor de la medición (puede ser null para alerta manual)
 * @param {Date|string|null} fechaMedicion - Fecha de la medición (puede ser null para alerta manual)
 * @returns {Promise<{filePath: string, filename: string}>}
 */
async function generarExcelPobladores(pobladores, estacion, tipoAlerta, valor, fechaMedicion) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pobladores afectados');

    // ===== ENCABEZADOS DE LA TABLA EN LA PRIMERA FILA =====
    const headerRow = worksheet.addRow(['Nombre', 'Apellido', 'Teléfono', 'Ubicación']);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCC0000' } };
    });

    // ===== DATOS DE POBLADORES =====
    pobladores.forEach(p => {
        worksheet.addRow([
            p.nombre,
            p.apellido,
            p.telefono || 'N/A',
            p.ubicacion || 'Sin especificar'
        ]);
    });

    // ===== INFORMACIÓN ADICIONAL A LA DERECHA (columna F) =====
    const fechaTexto = fechaMedicion ? new Date(fechaMedicion).toLocaleString() : 'N/A';
    const valorTexto = (valor !== null && valor !== undefined) ? valor : 'N/A';

    // Título
    const titleCell = worksheet.getCell('F1');
    titleCell.value = `ALERTA ${tipoAlerta} - Estación: ${estacion.nombre}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'left' };

    // Detalle de fecha y valor
    const detailCell = worksheet.getCell('F2');
    detailCell.value = `Fecha: ${fechaTexto} | Valor: ${valorTexto}`;
    detailCell.font = { italic: true };
    detailCell.alignment = { horizontal: 'left' };

    // Opcional: mensaje extra
    if (tipoAlerta === 'CRÍTICO') {
        const extraCell = worksheet.getCell('F3');
        extraCell.value = '⚠️ ALERTA CRÍTICA';
        extraCell.font = { bold: true, color: { argb: 'FFFF0000' } };
    }

    // ===== AJUSTAR ANCHO DE COLUMNAS =====
    worksheet.getColumn(1).width = 20;  // Nombre
    worksheet.getColumn(2).width = 20;  // Apellido
    worksheet.getColumn(3).width = 20;  // Teléfono
    worksheet.getColumn(4).width = 30;  // Ubicación
    worksheet.getColumn(6).width = 50;  // Columna F para título
    worksheet.getColumn(7).width = 30;  // Columna G (por si acaso)

    // ===== GUARDAR ARCHIVO =====
    const filename = `alerta_${estacion.id}_${Date.now()}.xlsx`;
    const filePath = path.join(TEMP_DIR, filename);
    await workbook.xlsx.writeFile(filePath);

    return { filePath, filename };
}

module.exports = { generarExcelPobladores };
