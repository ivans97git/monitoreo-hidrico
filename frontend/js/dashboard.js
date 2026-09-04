document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (!api.getToken()) {
            window.location.href = 'login.html';
            return;
        }
        const usuario = await api.getUsuarioActual();
        document.getElementById('userName').textContent = usuario.nombre || usuario.username;
        inicializarMapa();
        await cargarEstaciones();
        inicializarGraficos();
        await cargarAlertas();
        await cargarPobladores();
        inicializarFormularios();
        document.getElementById('loadingScreen').style.display = 'none';
    } catch (error) {
        console.error('Error inicializando:', error);
        window.location.href = 'login.html';
    }
});

function inicializarFormularios() {
    const formMedicion = document.getElementById('formMedicion');
    if (formMedicion) formMedicion.addEventListener('submit', registrarMedicion);

    const formEstacion = document.getElementById('formEstacion');
    if (formEstacion) formEstacion.addEventListener('submit', guardarEstacion);

    const formPoblador = document.getElementById('formPoblador');
    if (formPoblador) formPoblador.addEventListener('submit', guardarPoblador);
}

async function registrarMedicion(e) {
    e.preventDefault();
    const estacion_id = document.getElementById('selectEstacion').value;
    const tipo_medicion = document.getElementById('selectTipo').value;
    const valor = parseFloat(document.getElementById('inputValor').value);
    const observaciones = document.getElementById('inputObservaciones').value;
    const fecha_hora = document.getElementById('inputFechaHora').value || new Date().toISOString();

    if (!estacion_id || !tipo_medicion || isNaN(valor)) {
        alert('Complete los campos obligatorios');
        return;
    }

    try {
        const btn = document.querySelector('#formMedicion button[type="submit"]');
        btn.disabled = true;
        const resultado = await api.registrarMedicion({ estacion_id, valor, tipo_medicion, observaciones, fecha_hora });
        let mensaje = '✅ Medición registrada exitosamente';
        if (resultado.alerta_generada && resultado.archivo_excel) {
            const enlace = `${CONFIG.API_URL.replace('/api','')}/api/descargar/${resultado.archivo_excel}`;
            mensaje += `<br><a href="${enlace}" class="btn btn-sm btn-success mt-2" download>Descargar listado de pobladores</a>`;
        }
        mostrarMensaje(mensaje, 'success');
        document.getElementById('formMedicion').reset();
        await cargarEstaciones();
        actualizarGrafico();
        await cargarAlertas();
        btn.disabled = false;
    } catch (error) {
        mostrarMensaje('Error: ' + error.message, 'danger');
    }
}

// Estaciones
function nuevaEstacion() {
    document.getElementById('formEstacion').reset();
    document.getElementById('estId').value = '';
    document.getElementById('formEstacion').style.display = 'block';
}

function cancelarEdicionEstacion() {
    document.getElementById('formEstacion').style.display = 'none';
}

async function guardarEstacion(e) {
    e.preventDefault();
    const id = document.getElementById('estId').value;
    const data = {
        nombre: document.getElementById('estNombre').value,
        latitud: parseFloat(document.getElementById('estLatitud').value),
        longitud: parseFloat(document.getElementById('estLongitud').value),
        tipo: document.getElementById('estTipo').value,
        nivel_alerta: parseFloat(document.getElementById('estNivelAlerta').value) || null,
        nivel_critico: parseFloat(document.getElementById('estNivelCritico').value) || null,
        descripcion: document.getElementById('estDescripcion').value
    };
    try {
        if (id) await api.actualizarEstacion(id, data);
        else await api.crearEstacion(data);
        cancelarEdicionEstacion();
        await cargarEstaciones();
    } catch (error) {
        alert('Error al guardar estación: ' + error.message);
    }
}

async function cargarEstacionesAdmin() {
    try {
        const estaciones = await api.getEstaciones();
        const lista = document.getElementById('listaEstaciones');
        if (!estaciones.length) {
            lista.innerHTML = '<p class="text-muted">No hay estaciones</p>';
            return;
        }
        lista.innerHTML = estaciones.map(est => `
            <div class="item-listado d-flex justify-content-between align-items-center">
                <div>
                    <strong>${est.nombre}</strong> (${est.tipo})<br>
                    <small>Alerta: ${est.nivel_alerta || 'N/A'} | Crítico: ${est.nivel_critico || 'N/A'}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-primary" onclick="editarEstacion(${est.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarEstacion(${est.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error cargando estaciones admin:', error);
    }
}

async function editarEstacion(id) {
    const estaciones = await api.getEstaciones();
    const est = estaciones.find(e => e.id == id);
    if (!est) return;
    document.getElementById('estId').value = est.id;
    document.getElementById('estNombre').value = est.nombre;
    document.getElementById('estLatitud').value = est.latitud;
    document.getElementById('estLongitud').value = est.longitud;
    document.getElementById('estTipo').value = est.tipo;
    document.getElementById('estNivelAlerta').value = est.nivel_alerta || '';
    document.getElementById('estNivelCritico').value = est.nivel_critico || '';
    document.getElementById('estDescripcion').value = est.descripcion || '';
    document.getElementById('formEstacion').style.display = 'block';
}

async function eliminarEstacion(id) {
    if (!confirm('¿Eliminar esta estación?')) return;
    try {
        await api.eliminarEstacion(id);
        await cargarEstaciones();
    } catch (error) {
        alert('Error al eliminar: ' + error.message);
    }
}

// Pobladores
function nuevoPoblador() {
    document.getElementById('formPoblador').reset();
    document.getElementById('pobId').value = '';
    document.getElementById('formPoblador').style.display = 'block';
    actualizarSelectEstaciones();
}

function cancelarEdicionPoblador() {
    document.getElementById('formPoblador').style.display = 'none';
}

async function guardarPoblador(e) {
    e.preventDefault();
    const id = document.getElementById('pobId').value;
    const data = {
        nombre: document.getElementById('pobNombre').value,
        apellido: document.getElementById('pobApellido').value,
        telefono: document.getElementById('pobTelefono').value,
        ubicacion: document.getElementById('pobUbicacion').value,
        estacion_id: document.getElementById('pobEstacion').value
    };
    try {
        if (id) await api.actualizarPoblador(id, data);
        else await api.crearPoblador(data);
        cancelarEdicionPoblador();
        await cargarPobladores();
    } catch (error) {
        alert('Error al guardar poblador: ' + error.message);
    }
}

async function cargarPobladores() {
    const selectEstacion = document.getElementById('selectEstacionPoblador');
    const estacionId = selectEstacion ? selectEstacion.value : null;
    try {
        const pobladores = await api.getPobladores(estacionId);
        const lista = document.getElementById('listaPobladores');
        if (!pobladores.length) {
            lista.innerHTML = '<p class="text-muted">No hay pobladores registrados</p>';
            return;
        }
        lista.innerHTML = pobladores.map(p => `
            <div class="item-listado d-flex justify-content-between align-items-center">
                <div>
                    <strong>${p.nombre} ${p.apellido}</strong><br>
                    <small>${p.telefono || 'Sin teléfono'} | ${p.ubicacion || 'Sin ubicación'}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-primary" onclick="editarPoblador(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarPoblador(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error cargando pobladores:', error);
    }
}

async function editarPoblador(id) {
    const pobladores = await api.getPobladores();
    const pob = pobladores.find(p => p.id == id);
    if (!pob) return;
    document.getElementById('pobId').value = pob.id;
    document.getElementById('pobNombre').value = pob.nombre;
    document.getElementById('pobApellido').value = pob.apellido;
    document.getElementById('pobTelefono').value = pob.telefono || '';
    document.getElementById('pobUbicacion').value = pob.ubicacion || '';
    document.getElementById('pobEstacion').value = pob.estacion_id || '';
    document.getElementById('formPoblador').style.display = 'block';
}

async function eliminarPoblador(id) {
    if (!confirm('¿Eliminar este poblador?')) return;
    try {
        await api.eliminarPoblador(id);
        await cargarPobladores();
    } catch (error) {
        alert('Error al eliminar: ' + error.message);
    }
}

async function cargarAlertas() {
    try {
        const alertas = await api.getAlertas({ limite: 10 });
        const lista = document.getElementById('listaAlertas');
        if (!alertas.length) {
            lista.innerHTML = '<p class="text-muted">No hay alertas registradas</p>';
            return;
        }
        lista.innerHTML = alertas.map(alerta => `
            <div class="list-group-item alerta-item ${alerta.tipo_alerta === 'CRÍTICO' ? 'alerta-critica' : ''}">
                <div class="d-flex justify-content-between">
                    <strong>${alerta.nombre_estacion || 'Estación ' + alerta.estacion_id}</strong>
                    <span class="badge ${alerta.tipo_alerta === 'CRÍTICO' ? 'bg-danger' : 'bg-warning'}">${alerta.tipo_alerta}</span>
                </div>
                <small>${new Date(alerta.fecha_generacion || alerta.fecha_envio).toLocaleString()}</small>
                <p class="mb-0">${alerta.mensaje || ''}</p>
                ${alerta.archivo_excel ? `<a href="${CONFIG.API_URL.replace('/api','')}/api/descargar/${alerta.archivo_excel}" class="btn btn-sm btn-outline-success mt-1" download>Descargar Excel</a>` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error cargando alertas:', error);
    }
}

function mostrarMensaje(mensaje, tipo) {
    const div = document.getElementById('mensajeRegistro');
    div.innerHTML = `<div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
    setTimeout(() => div.innerHTML = '', 5000);
}
