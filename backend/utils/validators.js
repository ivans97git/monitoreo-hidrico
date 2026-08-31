// Utilidades de validación
const validators = {
    validarTelefono(telefono) {
        // Acepta formato internacional: 5491123456789
        const regex = /^[0-9]{10,15}$/;
        return regex.test(telefono.replace(/[^0-9]/g, ''));
    },
    
    validarEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },
    
    validarCoordenadas(latitud, longitud) {
        return latitud >= -90 && latitud <= 90 && 
               longitud >= -180 && longitud <= 180;
    },
    
    validarValorMedicion(valor, tipo) {
        if (valor < 0) return false;
        
        if (tipo === 'nivel_rio' && valor > 50) return false;
        if (tipo === 'precipitacion' && valor > 1000) return false;
        
        return true;
    },
    
    sanitizarTexto(texto) {
        if (!texto) return '';
        return texto.replace(/[<>]/g, '');
    }
};

module.exports = validators;