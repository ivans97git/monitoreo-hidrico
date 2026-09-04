// ==================== MAPA ====================
let map;
let marcadores = {};
let estacionesData = [];

function inicializarMapa() {
    if (map) {
        console.log('ℹ️ El mapa ya estaba inicializado');
        return;
    }
    map = L.map('map').setView(CONFIG.MAPA.centroInicial, CONFIG.MAPA.zoomInicial);
    L.tileLayer(CONFIG.MAPA.tileLayer, {
        attribution: CONFIG.MAPA.atribucion,
        maxZoom: 19
    }).addTo(map);
    const infoDiv = document.getElementById('estacionInfo');
    if (infoDiv) infoDiv.style.display = 'none';
}

async function cargarEstaciones() {
    try {
        const estaciones = await api.getEstaciones();
        estacionesData = estaciones;
        Object.values(marcadores).forEach(m => map.removeLayer(m));
        marcadores = {};

        estaciones.forEach(estacion => {
            const color = obtenerColorEstado(estacion);
            const icono = L.icon({
                iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
            const marcador = L.marker([estacion.latitud, estacion.longitud], { icon: icono })
                .addTo(map)
                .bindPopup(crearPopup(estacion))
                .bindTooltip(crearTooltip(estacion), {
                    direction: 'top',
                    offset: [0, -30],
                    opacity: 0.9,
                    sticky: true
                });
            marcadores[estacion.id] = marcador;
        });

        actualizarSelectEstaciones();
        if (typeof cargarEstacionesAdmin === 'function') cargarEstacionesAdmin();
    } catch (error) {
        console.error('Error cargando estaciones:', error);
    }
}

function obtenerColorEstado(estacion) {
    if (estacion.tipo === 'rio') {
        const valor = parseFloat(estacion.ultima_medicion_rio);
        if (isNaN(valor)) return 'grey';
        if (estacion.nivel_critico && valor >= parseFloat(estacion.nivel_critico)) return 'red';
        if (estacion.nivel_alerta && valor >= parseFloat(estacion.nivel_alerta)) return 'yellow';
        return 'green';
    } else if (estacion.tipo === 'pluviometrica') {
        return 'blue'; // lluvia informativa
    }
    return 'grey';
}

function obtenerTendencia(estacion) {
    if (estacion.tipo !== 'rio') return { flecha: '–', color: 'blue', diferencia: null };
    const ultima = parseFloat(estacion.ultima_medicion_rio);
    const anterior = parseFloat(estacion.medicion_anterior_rio);
    if (isNaN(ultima) || isNaN(anterior) || ultima === anterior) {
        return { flecha: '–', color: 'blue', diferencia: null };
    }
    const diff = ultima - anterior;
    if (diff > 0) return { flecha: '↑', color: 'red', diferencia: diff.toFixed(2) };
    return { flecha: '↓', color: 'green', diferencia: Math.abs(diff).toFixed(2) };
}

function crearTooltip(estacion) {
    let valorMostrar, unidad, tendencia;
    if (estacion.tipo === 'rio') {
        valorMostrar = (estacion.ultima_medicion_rio !== null && estacion.ultima_medicion_rio !== undefined) ? estacion.ultima_medicion_rio : 'Sin datos';
        unidad = 'm';
        tendencia = obtenerTendencia(estacion);
    } else {
        valorMostrar = (estacion.ultima_precipitacion !== null && estacion.ultima_precipitacion !== undefined) ? estacion.ultima_precipitacion : 'Sin datos';
        unidad = 'mm';
        tendencia = { flecha: '–', color: 'blue', diferencia: null };
    }
    const tendenciaTexto = tendencia.diferencia ? `${tendencia.flecha} (${tendencia.diferencia})` : tendencia.flecha;
    return `<div style="font-weight:bold;">${estacion.nombre}</div><div>${tendenciaTexto} &nbsp; ${valorMostrar} ${unidad}</div>`;
}

function crearPopup(estacion) {
    let valorMostrar, fechaMostrar, unidad, tendenciaHTML;
    if (estacion.tipo === 'rio') {
        valorMostrar = (estacion.ultima_medicion_rio !== null && estacion.ultima_medicion_rio !== undefined) ? estacion.ultima_medicion_rio : 'Sin datos';
        fechaMostrar = estacion.fecha_ultima_medicion_rio ? new Date(estacion.fecha_ultima_medicion_rio).toLocaleString() : 'N/A';
        unidad = 'm';
        const tendencia = obtenerTendencia(estacion);
        tendenciaHTML = `<span style="color:${tendencia.color}; font-size:1.2em;">${tendencia.flecha}</span>${tendencia.diferencia ? ` (${tendencia.diferencia})` : ''}`;
    } else {
        valorMostrar = (estacion.ultima_precipitacion !== null && estacion.ultima_precipitacion !== undefined) ? estacion.ultima_precipitacion : 'Sin datos';
        fechaMostrar = estacion.fecha_ultima_precipitacion ? new Date(estacion.fecha_ultima_precipitacion).toLocaleString() : 'N/A';
        unidad = 'mm';
        tendenciaHTML = `<span style="color:blue; font-size:1.2em;">–</span>`;
    }
    const umbralesHTML = estacion.tipo === 'rio' ? `
        ${estacion.nivel_alerta ? `<p><strong>Nivel alerta:</strong> ${estacion.nivel_alerta} m</p>` : ''}
        ${estacion.nivel_critico ? `<p><strong>Nivel crítico:</strong> ${estacion.nivel_critico} m</p>` : ''}
    ` : '';

    return `
        <div class="popup-estacion">
            <h6>${estacion.nombre}</h6>
            <p><strong>Tipo:</strong> ${estacion.tipo === 'rio' ? 'Río' : 'Pluviométrica'}</p>
            <p><strong>Última medición:</strong> ${valorMostrar} ${unidad} ${tendenciaHTML}</p>
            <p><strong>Fecha:</strong> ${fechaMostrar}</p>
            ${umbralesHTML}
        </div>
    `;
}

function actualizarSelectEstaciones() {
    const selects = [
        document.getElementById('selectEstacion'),
        document.getElementById('selectEstacionGrafico'),
        document.getElementById('selectEstacionPoblador'),
        document.getElementById('pobEstacion'),
        document.getElementById('selectEstacionMediciones'),
        document.getElementById('selectEstacionRio'),
        document.getElementById('selectEstacionLluvia'),
        document.getElementById('selectEstacionAlerta')
    ];
    selects.forEach(select => {
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">Seleccionar...</option>';
        let estacionesFiltradas = estacionesData;
        if (select.id === 'selectEstacionRio') estacionesFiltradas = estacionesData.filter(e => e.tipo === 'rio');
        if (select.id === 'selectEstacionLluvia') estacionesFiltradas = estacionesData.filter(e => e.tipo === 'pluviometrica');
        estacionesFiltradas.forEach(est => {
            const opt = document.createElement('option');
            opt.value = est.id;
            opt.textContent = est.nombre;
            select.appendChild(opt);
        });
        if ([...select.options].some(o => o.value === current)) select.value = current;
        else select.value = '';
    });
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (!api.getToken()) {
            window.location.href = 'login.html';
            return;
        }
        const usuario = await api.getUsuarioActual();
        document.getElementById('userName').textContent = usuario.nombre || usuario.username;
        inicializarMapa();   // Ahora está definida aquí mismo
        await cargarEstaciones();
        inicializarGraficos();
        await cargarAlertas();
        await cargarPobladores();
        inicializarFormularios();
        await cargarEstacionesAdmin();
        document.getElementById('loadingScreen').style.display = 'none';
    } catch (error) {
        console.error('Error inicializando:', error);
        window.location.href = 'login.html';
    }
});


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
        await cargarEstacionesAdmin();
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

// ==================== MEDICIONES ====================
async function registrarMedicion(e) {
    e.preventDefault();

    let btn = null;

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
        btn = document.querySelector('#formMedicion button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Registrando...';

        const resultado = await api.registrarMedicion({
            estacion_id,
            valor,
            tipo_medicion,
            observaciones,
            fecha_hora
        });

        let mensaje = '✅ Medición registrada exitosamente';
        if (resultado.alerta_generada && resultado.archivo_excel) {
            const enlace = `${CONFIG.API_URL.replace('/api','')}/api/descargar/${resultado.archivo_excel}`;
            mensaje += `<br><a href="${enlace}" class="btn btn-sm btn-success mt-2" download>Descargar listado de pobladores</a>`;
        }
        mostrarMensaje(mensaje, 'success');

        document.getElementById('formMedicion').reset();
        await cargarEstaciones();
        actualizarGraficoRio();
        actualizarGraficoLluvia();
        await cargarAlertas();
        await cargarEstacionesAdmin();
    } catch (error) {
        console.error('Error registrando medición:', error);
        mostrarMensaje('Error: ' + error.message, 'danger');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save me-1"></i> Registrar';
        }
    }
}

async function cargarMediciones() {
    const estacionId = document.getElementById('selectEstacionMediciones').value;
    const filtros = { limite: 100 };
    if (estacionId) filtros.estacion_id = estacionId;

    try {
        const mediciones = await api.getMediciones(filtros);
        const lista = document.getElementById('listaMediciones');
        if (!mediciones.length) {
            lista.innerHTML = '<p class="text-muted">No hay mediciones</p>';
            return;
        }
        lista.innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm table-striped">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Estación</th>
                            <th>Tipo</th>
                            <th>Valor</th>
                            <th>Obs.</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mediciones.map(m => `
                            <tr>
                                <td>${new Date(m.fecha_hora).toLocaleString()}</td>
                                <td>${m.nombre_estacion || 'N/A'}</td>
                                <td>${m.tipo_medicion === 'nivel_rio' ? 'Río' : 'Lluvia'}</td>
                                <td>${m.valor}</td>
                                <td>${m.observaciones || ''}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary" onclick="abrirModalEditar(${m.id})"><i class="fas fa-edit"></i></button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarMedicion(${m.id})"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error cargando mediciones:', error);
    }
}

async function abrirModalEditar(id) {
    try {
        const medicion = await api.getMedicion(id);
        document.getElementById('editMedicionId').value = medicion.id;
        document.getElementById('editValor').value = medicion.valor;
        document.getElementById('editTipo').value = medicion.tipo_medicion;
        document.getElementById('editFechaHora').value = medicion.fecha_hora.slice(0, 16);
        document.getElementById('editObservaciones').value = medicion.observaciones || '';
        new bootstrap.Modal(document.getElementById('modalEditarMedicion')).show();
    } catch (error) {
        alert('Error al cargar medición: ' + error.message);
    }
}

async function guardarEdicionMedicion() {
    const id = document.getElementById('editMedicionId').value;
    const data = {
        valor: parseFloat(document.getElementById('editValor').value),
        tipo_medicion: document.getElementById('editTipo').value,
        fecha_hora: document.getElementById('editFechaHora').value || null,
        observaciones: document.getElementById('editObservaciones').value
    };
    try {
        await api.actualizarMedicion(id, data);
        bootstrap.Modal.getInstance(document.getElementById('modalEditarMedicion')).hide();
        await cargarMediciones();
        await cargarEstaciones();
        actualizarGraficoRio();
        actualizarGraficoLluvia();
    } catch (error) {
        alert('Error al actualizar: ' + error.message);
    }
}

async function eliminarMedicion(id) {
    if (!confirm('¿Eliminar esta medición?')) return;
    try {
        await api.eliminarMedicion(id);
        await cargarMediciones();
        await cargarEstaciones();
        actualizarGraficoRio();
        actualizarGraficoLluvia();
    } catch (error) {
        alert('Error al eliminar: ' + error.message);
    }
}

// ==================== ESTACIONES ====================
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
        await cargarEstacionesAdmin();
    } catch (error) {
        alert('Error al guardar estación: ' + error.message);
    }
}

async function cargarEstacionesAdmin() {
    try {
        const estaciones = await api.getEstaciones();
        const lista = document.getElementById('listaEstaciones');
        if (!lista) {
            console.warn('No se encontró el elemento listaEstaciones');
            return;
        }
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
        await cargarEstacionesAdmin();
    } catch (error) {
        alert('Error al eliminar: ' + error.message);
    }
}

// ==================== POBLADORES ====================
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

// ==================== ALERTAS ====================
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

async function generarAlertaManual() {
    const estacion_id = document.getElementById('selectEstacionAlerta').value;
    if (!estacion_id) {
        alert('Seleccione una estación');
        return;
    }
    try {
        const response = await fetch(`${CONFIG.API_URL}/alertas/generar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${api.getToken()}`
            },
            body: JSON.stringify({ estacion_id })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al generar alerta');
        }
        const data = await response.json();
        alert(`Alerta generada. Archivo: ${data.archivo}`);
        await cargarAlertas();
    } catch (error) {
        alert('Error: ' + error.message);
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

// Evento para cargar datos al cambiar a cada pestaña
document.addEventListener('shown.bs.tab', (e) => {
    if (e.target.getAttribute('data-bs-target') === '#gestionMediciones') {
        cargarMediciones();
    }
    if (e.target.getAttribute('data-bs-target') === '#estaciones') {
        cargarEstacionesAdmin();
    }
    if (e.target.getAttribute('data-bs-target') === '#pobladores') {
        cargarPobladores();
    }
});
