let map;
let marcadores = {};
let estacionesData = [];
console.log('✅ mapa.js cargado correctamente');

function inicializarMapa() {
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
        // La lluvia es informativa, usamos azul fijo
        return 'blue';
    }
    return 'grey';
}

function obtenerTendencia(estacion) {
    if (estacion.tipo !== 'rio') {
        // Para lluvia no mostramos tendencia o simplemente guion
        return { flecha: '–', color: 'blue', diferencia: null };
    }
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
        valorMostrar = (estacion.ultima_medicion_rio !== null && estacion.ultima_medicion_rio !== undefined)
            ? estacion.ultima_medicion_rio
            : 'Sin datos';
        unidad = 'm';
        tendencia = obtenerTendencia(estacion);
    } else {
        valorMostrar = (estacion.ultima_precipitacion !== null && estacion.ultima_precipitacion !== undefined)
            ? estacion.ultima_precipitacion
            : 'Sin datos';
        unidad = 'mm';
        tendencia = { flecha: '–', color: 'blue', diferencia: null };
    }

    const tendenciaTexto = tendencia.diferencia
        ? `${tendencia.flecha} (${tendencia.diferencia})`
        : `${tendencia.flecha}`;

    return `
        <div style="font-weight:bold;">${estacion.nombre}</div>
        <div>${tendenciaTexto} &nbsp; ${valorMostrar} ${unidad}</div>
    `;
}

function crearPopup(estacion) {
    let valorMostrar, fechaMostrar, unidad, tendenciaHTML;

    if (estacion.tipo === 'rio') {
        valorMostrar = (estacion.ultima_medicion_rio !== null && estacion.ultima_medicion_rio !== undefined)
            ? estacion.ultima_medicion_rio
            : 'Sin datos';
        fechaMostrar = estacion.fecha_ultima_medicion_rio
            ? new Date(estacion.fecha_ultima_medicion_rio).toLocaleString()
            : 'N/A';
        unidad = 'm';
        const tendencia = obtenerTendencia(estacion);
        tendenciaHTML = `<span style="color:${tendencia.color}; font-size:1.2em;">${tendencia.flecha}</span>${tendencia.diferencia ? ` (${tendencia.diferencia})` : ''}`;
    } else {
        valorMostrar = (estacion.ultima_precipitacion !== null && estacion.ultima_precipitacion !== undefined)
            ? estacion.ultima_precipitacion
            : 'Sin datos';
        fechaMostrar = estacion.fecha_ultima_precipitacion
            ? new Date(estacion.fecha_ultima_precipitacion).toLocaleString()
            : 'N/A';
        unidad = 'mm';
        tendenciaHTML = `<span style="color:blue; font-size:1.2em;">–</span>`;
    }

    // Los umbrales solo aplican a estaciones de río
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
        document.getElementById('selectEstacionRio'),      // Nuevo
        document.getElementById('selectEstacionLluvia')    // Nuevo
        document.getElementById('selectEstacionAlerta')
    ];

    selects.forEach(select => {
        if (!select) return; // Si el elemento no existe en el DOM, lo ignora

        const current = select.value; // Guarda la selección actual
        select.innerHTML = '<option value="">Seleccionar...</option>';

        // Filtrar estaciones según el select
        let estacionesFiltradas = estacionesData;
        if (select.id === 'selectEstacionRio') {
            estacionesFiltradas = estacionesData.filter(e => e.tipo === 'rio');
        } else if (select.id === 'selectEstacionLluvia') {
            estacionesFiltradas = estacionesData.filter(e => e.tipo === 'pluviometrica');
        }

        // Llenar opciones
        estacionesFiltradas.forEach(est => {
            const opt = document.createElement('option');
            opt.value = est.id;
            opt.textContent = est.nombre;
            select.appendChild(opt);
        });

        // Restaurar selección anterior si aún existe en las nuevas opciones
        if ([...select.options].some(o => o.value === current)) {
            select.value = current;
        } else {
            select.value = '';
        }
    });
}
