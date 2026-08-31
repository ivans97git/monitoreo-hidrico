// Manejo del dashboard principal
document.addEventListener('DOMContentLoaded', async () => {
    await inicializarDashboard();
});

async function inicializarDashboard() {
    try {
        // Verificar autenticación
        if (!api.getToken()) {
            window.location.href = 'login.html';
            return;
        }
        
        // Mostrar nombre de usuario
        const usuario = await api.getUsuarioActual();
        document.getElementById('userName').textContent = usuario.nombre || usuario.username;
        
        // Inicializar componentes
        inicializarMapa();
        await cargarEstaciones();
        inicializarGraficos();
        await cargarAlertas();
        await cargarContactos();
        inicializarFormularios();
        
        // Ocultar pantalla de carga
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
        }, 500);
        
    } catch (error) {
        console.error('Error inicializando dashboard:', error);
        window.location.href = 'login.html';
    }
}

function inicializarFormularios() {
    // Formulario de medición
    const formMedicion = document.getElementById('formMedicion');
    if (formMedicion) {
        formMedicion.addEventListener('submit', async (e) => {
            e.preventDefault();
            await registrarMedicion();
        });
    }
    
    // Formulario de contacto
    const formContacto = document.getElementById('formContacto');
    if (formContacto) {
        formContacto.addEventListener('submit', async (e) => {
            e.preventDefault();
            await agregarContacto();
        });
    }
    
    // Cambiar unidad según tipo de medición
    const selectTipo = document.getElementById('selectTipo');
    if (selectTipo) {
        selectTipo.addEventListener('change', (e) => {
            const unidad = e.target.value === 'nivel_rio' ? 'm' : 'mm';
            document.getElementById('unidadMedida').textContent = unidad;
        });
    }
}

async function registrarMedicion() {
    const estacion_id = document.getElementById('selectEstacion').value;
    const tipo_medicion = document.getElementById('selectTipo').value;
    const valor = parseFloat(document.getElementById('inputValor').value);
    const observaciones = document.getElementById('inputObservaciones').value;
    
    if (!estacion_id || !tipo_medicion || !valor) {
        mostrarMensaje('Por favor complete todos los campos', 'danger');
        return;
    }
    
    try {
        const button = document.querySelector('#formMedicion button[type="submit"]');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Registrando...';
        
        const resultado = await api.registrarMedicion({
            estacion_id,
            tipo_medicion,
            valor,
            observaciones
        });
        
        mostrarMensaje(
            resultado.alerta_enviada ? 
            '✅ Medición registrada y alerta enviada' : 
            '✅ Medición registrada exitosamente',
            'success'
        );
        
        // Limpiar formulario
        document.getElementById('formMedicion').reset();
        
        // Actualizar datos
        await cargarEstaciones();
        await actualizarGrafico();
        await cargarAlertas();
        
        // Restaurar botón
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-save me-1"></i> Registrar';
        
    } catch (error) {
        mostrarMensaje('Error: ' + error.message, 'danger');
        const button = document.querySelector('#formMedicion button[type="submit"]');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-save me-1"></i> Registrar';
    }
}

async function agregarContacto() {
    const nombre = document.getElementById('contactoNombre').value;
    const telefono = document.getElementById('contactoTelefono').value;
    const estacion_id = document.getElementById('contactoEstacion').value;
    
    if (!nombre || !telefono || !estacion_id) {
        alert('Por favor complete todos los campos del contacto');
        return;
    }
    
    try {
        await api.crearContacto({ nombre, telefono, estacion_id });
        
        // Limpiar formulario
        document.getElementById('formContacto').reset();
        
        // Actualizar lista
        await cargarContactos();
        
        alert('✅ Contacto agregado exitosamente');
    } catch (error) {
        alert('Error al agregar contacto: ' + error.message);
    }
}

async function cargarAlertas() {
    try {
        const alertas = await api.getAlertas({ limite: 10 });
        const listaAlertas = document.getElementById('listaAlertas');
        
        if (alertas.length === 0) {
            listaAlertas.innerHTML = '<p class="text-muted">No hay alertas registradas</p>';
            return;
        }
        
        listaAlertas.innerHTML = alertas.map(alerta => {
            const esCritica = alerta.tipo_alerta === 'CRÍTICO';
            return `
                <div class="list-group-item alerta-item ${esCritica ? 'alerta-critica' : ''}">
                    <div class="d-flex justify-content-between">
                        <strong>${alerta.nombre_estacion}</strong>
                        <span class="badge ${esCritica ? 'bg-danger' : 'bg-warning'}">
                            ${alerta.tipo_alerta}
                        </span>
                    </div>
                    <small>${new Date(alerta.fecha_envio).toLocaleString()}</small>
                    <p class="mb-0">${alerta.mensaje.substring(0, 100)}...</p>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error cargando alertas:', error);
    }
}

async function cargarContactos() {
    try {
        const contactos = await api.getContactos();
        const listaContactos = document.getElementById('listaContactos');
        
        if (contactos.length === 0) {
            listaContactos.innerHTML = '<p class="text-muted">No hay contactos registrados</p>';
            return;
        }
        
        listaContactos.innerHTML = contactos.map(contacto => `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                <div>
                    <strong>${contacto.nombre}</strong><br>
                    <small>${contacto.telefono}</small>
                </div>
                <button class="btn btn-sm btn-danger" onclick="eliminarContacto(${contacto.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error cargando contactos:', error);
    }
}

async function eliminarContacto(id) {
    if (!confirm('¿Está seguro de eliminar este contacto?')) return;
    
    try {
        await api.eliminarContacto(id);
        await cargarContactos();
    } catch (error) {
        alert('Error al eliminar contacto: ' + error.message);
    }
}

function mostrarMensaje(mensaje, tipo) {
    const div = document.getElementById('mensajeRegistro');
    div.innerHTML = `<div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
    
    setTimeout(() => {
        div.innerHTML = '';
    }, 5000);
}