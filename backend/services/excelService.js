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

    // === ENCABEZADOS DE LA TABLA EN LA PRIMERA FILA ===
    const headerRow = worksheet.addRow(['Nombre', 'Apellido', 'Teléfono', 'Ubicación']);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCC0000' } };
    });

    // === DATOS DE LOS POBLADORES ===
    pobladores.forEach(p => {
        worksheet.addRow([p.nombre, p.apellido, p.telefono || 'N/A', p.ubicacion || 'Sin especificar']);
    });

    // === INFORMACIÓN ADICIONAL A LA DERECHA ===
    // Colocar el título en la columna F (índice 6) empezando en la misma primera fila
    const titleCell = worksheet.getCell('F1');
    titleCell.value = `ALERTA ${tipoAlerta} - Estación: ${estacion.nombre}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'left' };

    // Detalles debajo del título (F2)
    const detailCell = worksheet.getCell('F2');
    detailCell.value = `Fecha y hora de la medición: ${new Date(fechaMedicion).toLocaleString()} | Valor: ${valor}`;
    detailCell.font = { italic: true };
    detailCell.alignment = { horizontal: 'left' };

    // Opcional: ajustar ancho de columnas
    worksheet.getColumn(1).width = 20; // Nombre
    worksheet.getColumn(2).width = 20; // Apellido
    worksheet.getColumn(3).width = 20; // Teléfono
    worksheet.getColumn(4).width = 30; // Ubicación
    worksheet.getColumn(6).width = 50; // Columna F para título
    worksheet.getColumn(7).width = 50; // Columna G por si se necesita

    // Guardar archivo
    const filename = `alerta_${estacion.id}_${Date.now()}.xlsx`;
    const filePath = path.join(TEMP_DIR, filename);
    await workbook.xlsx.writeFile(filePath);
    return { filePath, filename };
}

module.exports = { generarExcelPobladores };
