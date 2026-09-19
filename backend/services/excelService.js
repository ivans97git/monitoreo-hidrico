const ExcelJS = require('exceljs');

async function generarExcelFamiliasBuffer(familias, estacion, tipoAlerta, valor, fechaMedicion) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Familias afectadas');

    // Encabezados (con Teléfono)
    const headerRow = worksheet.addRow([
        'N.º Familia', 'Responsable', 'Teléfono', 'Ubicación', 'Personas', 'Prioridad',
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
            f.telefono || '',
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

    // Información adicional a la derecha (columna M)
    const fechaTexto = fechaMedicion ? new Date(fechaMedicion).toLocaleString() : 'N/A';
    const valorTexto = (valor !== null && valor !== undefined) ? valor : 'N/A';

    const titleCell = worksheet.getCell('M1');
    titleCell.value = `ALERTA ${tipoAlerta} - Estación: ${estacion.nombre}`;
    titleCell.font = { bold: true, size: 14 };

    const detailCell = worksheet.getCell('M2');
    detailCell.value = `Fecha: ${fechaTexto} | Valor: ${valorTexto}`;
    detailCell.font = { italic: true };

    // Anchos
    worksheet.getColumn(1).width = 12;   // N.º
    worksheet.getColumn(2).width = 20;   // Responsable
    worksheet.getColumn(3).width = 18;   // Teléfono
    worksheet.getColumn(4).width = 30;   // Ubicación
    worksheet.getColumn(5).width = 10;   // Personas
    worksheet.getColumn(6).width = 12;   // Prioridad
    worksheet.getColumn(7).width = 25;   // Necesidad
    worksheet.getColumn(8).width = 12;   // Transporte
    worksheet.getColumn(9).width = 20;   // Animales
    worksheet.getColumn(10).width = 20;  // Destino
    worksheet.getColumn(11).width = 15;  // Estado
    worksheet.getColumn(13).width = 50;  // Info adicional

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `alerta_${estacion.id}_${Date.now()}.xlsx`;
    return { buffer, filename };
}

module.exports = { generarExcelFamiliasBuffer };
