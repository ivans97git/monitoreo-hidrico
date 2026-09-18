const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Genera un Excel de familias afectadas.
 */
async function generarExcelFamilias(familias, estacion, tipoAlerta, valor, fechaMedicion) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Familias afectadas');

    // Encabezados
    const headerRow = worksheet.addRow([
        'N.º Familia', 'Responsable', 'Ubicación', 'Personas', 'Prioridad',
        'Necesidad', 'Transporte', 'Animales', 'Destino', 'Estado'
    ]);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCC0000' } };
    });

    // Filas de familias
    familias.forEach(f => {
        worksheet.addRow([
            f.numero_familia || '',
            f.responsable || '',
            f.ubicacion || '',
            f.cantidad_integrantes || 0,
            f.prioridad || '',
            f.necesidad || '',
            f.transporte ? 'SÍ' : 'NO',
            f.animales ? `SÍ${f.detalle_animales ? ' (' + f.detalle_animales + ')' : ''}` : 'NO',
            f.destino || '',
            f.estado || ''
        ]);
    });

    // Información adicional a la derecha (columna L)
    const fechaTexto = fechaMedicion ? new Date(fechaMedicion).toLocaleString() : 'N/A';
    const valorTexto = (valor !== null && valor !== undefined) ? valor : 'N/A';

    const titleCell = worksheet.getCell('L1');
    titleCell.value = `ALERTA ${tipoAlerta} - Estación: ${estacion.nombre}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'left' };

    const detailCell = worksheet.getCell('L2');
    detailCell.value = `Fecha: ${fechaTexto} | Valor: ${valorTexto}`;
    detailCell.font = { italic: true };
    detailCell.alignment = { horizontal: 'left' };

    // Anchos de columna
    worksheet.getColumn(1).width = 12;
    worksheet.getColumn(2).width = 20;
    worksheet.getColumn(3).width = 30;
    worksheet.getColumn(4).width = 10;
    worksheet.getColumn(5).width = 12;
    worksheet.getColumn(6).width = 25;
    worksheet.getColumn(7).width = 12;
    worksheet.getColumn(8).width = 20;
    worksheet.getColumn(9).width = 20;
    worksheet.getColumn(10).width = 15;
    worksheet.getColumn(12).width = 50;

    const filename = `alerta_${estacion.id}_${Date.now()}.xlsx`;
    const filePath = path.join(TEMP_DIR, filename);
    await workbook.xlsx.writeFile(filePath);
    return { filePath, filename };
}

/**
 * (Opcional) Genera un Excel de pobladores. Se mantiene por compatibilidad.
 */
async function generarExcelPobladores(pobladores, estacion, tipoAlerta, valor, fechaMedicion) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pobladores afectados');

    const headerRow = worksheet.addRow(['Nombre', 'Apellido', 'DNI', 'Teléfono', 'Edad', 'Ubicación', 'Trabajo', 'Problemas de salud']);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCC0000' } };
    });

    pobladores.forEach(p => {
        worksheet.addRow([
            p.nombre, p.apellido, p.dni || 'N/A', p.telefono || 'N/A',
            p.edad || 'N/A', p.ubicacion || 'Sin especificar',
            p.trabajo || 'N/A', p.problemas_salud || 'Sin datos'
        ]);
    });

    const fechaTexto = fechaMedicion ? new Date(fechaMedicion).toLocaleString() : 'N/A';
    const valorTexto = (valor !== null && valor !== undefined) ? valor : 'N/A';

    const titleCell = worksheet.getCell('J1');
    titleCell.value = `ALERTA ${tipoAlerta} - Estación: ${estacion.nombre}`;
    titleCell.font = { bold: true, size: 14 };

    const detailCell = worksheet.getCell('J2');
    detailCell.value = `Fecha: ${fechaTexto} | Valor: ${valorTexto}`;
    detailCell.font = { italic: true };

    worksheet.getColumn(1).width = 20;
    worksheet.getColumn(2).width = 20;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 20;
    worksheet.getColumn(5).width = 10;
    worksheet.getColumn(6).width = 30;
    worksheet.getColumn(7).width = 25;
    worksheet.getColumn(8).width = 30;
    worksheet.getColumn(10).width = 50;

    const filename = `alerta_${estacion.id}_${Date.now()}.xlsx`;
    const filePath = path.join(TEMP_DIR, filename);
    await workbook.xlsx.writeFile(filePath);
    return { filePath, filename };
}

module.exports = { generarExcelFamilias, generarExcelPobladores };
