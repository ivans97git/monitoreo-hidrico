let map;
let marcadores = {};
let estacionesData = [];

function inicializarMapa() {
    map = L.map('map').setView(CONFIG.MAPA.centroInicial, CONFIG.MAPA.zoomInicial);
    L.tileLayer(CONFIG.MAPA.tileLayer, {
        attribution: CONFIG.MAPA.atribucion,
        maxZoom: 19
    }).addTo(map);
    // Ya no usaremos el panel de información lateral
    const infoDiv = document.getElementById('estacionInfo');
    if (infoDiv) infoDiv.style.display = 'none';
}

async function cargarEstaciones() {
    try {
        const estaciones = await api.getEstaciones();
        estacionesData = estaciones;
        // Limpiar marcadores existentes
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
    if (estacion.ultima_medicion === null || estacion.ultima_medicion === undefined) {
        return 'grey';
    }
    const valor = parseFloat(estacion.ultima_medicion);
    if (estacion.tipo === 'rio') {
        if (estacion.nivel_critico && valor >= parseFloat(estacion.nivel_critico)) return 'red';
        if (estacion.nivel_alerta && valor >= parseFloat(estacion.nivel_alerta)) return 'yellow';
        return 'green';
    } else if (estacion.tipo === 'pluviometrica') {
        if (valor >= 150) return 'red';
        if (valor >= 100) return 'yellow';
        return 'green';
    }
    return 'blue';
}

function obtenerTendencia(estacion) {
    const ultima = parseFloat(estacion.ultima_medicion);
    const anterior = parseFloat(estacion.medicion_anterior);
    if (isNaN(ultima) || isNaN(anterior) || ultima === anterior) {
        return { flecha: '–', color: 'blue', diferencia: null };
    }
    const diff = ultima - anterior;
    if (diff > 0) {
        return { flecha: '↑', color: 'red', diferencia: diff.toFixed(2) };
    } else {
        return { flecha: '↓', color: 'green', diferencia: Math.abs(diff).toFixed(2) };
    }
}

function crearTooltip(estacion) {
    const ultima = estacion.ultima_medicion !== null ? estacion.ultima_medicion : 'Sin datos';
    const unidad = estacion.tipo === 'rio' ? 'm' : 'mm';
    const tendencia = obtenerTendencia(estacion);
    const tendenciaTexto = tendencia.diferencia
        ? `${tendencia.flecha} (${tendencia.diferencia})`
        : `${tendencia.flecha}`;

    return `
        <div style="font-weight:bold;">${estacion.nombre}</div>
        <div>${tendenciaTexto} &nbsp; ${ultima} ${unidad}</div>
    `;
}

function crearPopup(estacion) {
    const ultima = estacion.ultima_medicion !== null ? estacion.ultima_medicion : 'Sin datos';
    const fechaUltima = estacion.fecha_ultima_medicion ? new Date(estacion.fecha_ultima_medicion).toLocaleString() : 'N/A';
    const unidad = estacion.tipo === 'rio' ? 'm' : 'mm';
    const tendencia = obtenerTendencia(estacion);
    const tendenciaHTML = `<span style="color:${tendencia.color}; font-size:1.2em;">${tendencia.flecha}</span>${tendencia.diferencia ? ` (${tendencia.diferencia})` : ''}`;

    return `
        <div class="popup-estacion">
            <h6>${estacion.nombre}</h6>
            <p><strong>Tipo:</strong> ${estacion.tipo === 'rio' ? 'Río' : 'Pluviométrica'}</p>
            <p><strong>Última medición:</strong> ${ultima} ${unidad} ${tendenciaHTML}</p>
            <p><strong>Fecha:</strong> ${fechaUltima}</p>
            ${estacion.nivel_alerta ? `<p><strong>Nivel alerta:</strong> ${estacion.nivel_alerta} m</p>` : ''}
            ${estacion.nivel_critico ? `<p><strong>Nivel crítico:</strong> ${estacion.nivel_critico} m</p>` : ''}
        </div>
    `;
}

function actualizarSelectEstaciones() {
    const selects = [
        document.getElementById('selectEstacion'),
        document.getElementById('selectEstacionGrafico'),
        document.getElementById('selectEstacionPoblador'),
        document.getElementById('pobEstacion')
        document.getElementById('selectEstacionMediciones') 
    ];
    selects.forEach(select => {
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">Seleccionar...</option>';
        estacionesData.forEach(est => {
            const opt = document.createElement('option');
            opt.value = est.id;
            opt.textContent = est.nombre;
            select.appendChild(opt);
        });
        select.value = current;
    });
}
