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

    // Título
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = `ALERTA ${tipoAlerta} - Estación: ${estacion.nombre}`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Detalles
    worksheet.mergeCells('A2:D2');
    worksheet.getCell('A2').value = `Fecha y hora de la medición: ${new Date(fechaMedicion).toLocaleString()} | Valor: ${valor}`;
    worksheet.getCell('A2').font = { italic: true };

    // Encabezados
    const headerRow = worksheet.addRow(['Nombre', 'Apellido', 'Teléfono', 'Ubicación']);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCC0000' } };
    });

    // Datos de pobladores
    pobladores.forEach(p => {
        worksheet.addRow([p.nombre, p.apellido, p.telefono || 'N/A', p.ubicacion || 'Sin especificar']);
    });

    // Ancho de columnas
    worksheet.getColumn(1).width = 20;
    worksheet.getColumn(2).width = 20;
    worksheet.getColumn(3).width = 20;
    worksheet.getColumn(4).width = 30;

    // Guardar
    const filename = `alerta_${estacion.id}_${Date.now()}.xlsx`;
    const filePath = path.join(TEMP_DIR, filename);
    await workbook.xlsx.writeFile(filePath);
    return { filePath, filename };
}

module.exports = { generarExcelPobladores };