const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

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
            p.nombre,
            p.apellido,
            p.dni || 'N/A',
            p.telefono || 'N/A',
            p.edad || 'N/A',
            p.ubicacion || 'Sin especificar',
            p.trabajo || 'N/A',
            p.problemas_salud || 'Sin datos'
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

module.exports = { generarExcelPobladores };
