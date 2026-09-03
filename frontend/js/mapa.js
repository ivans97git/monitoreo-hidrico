let map;
let marcadores = {};
let estacionesData = [];

function inicializarMapa() {
    map = L.map('map').setView(CONFIG.MAPA.centroInicial, CONFIG.MAPA.zoomInicial);
    L.tileLayer(CONFIG.MAPA.tileLayer, {
        attribution: CONFIG.MAPA.atribucion,
        maxZoom: 19
    }).addTo(map);
    map.on('click', () => {
        document.getElementById('estacionInfo').style.display = 'none';
    });
}

async function cargarEstaciones() {
    try {
        const estaciones = await api.getEstaciones();
        estacionesData = estaciones;
        // Limpiar marcadores existentes
        Object.values(marcadores).forEach(m => map.removeLayer(m));
        marcadores = {};
        estaciones.forEach(estacion => {
            const color = 'blue'; // Simplificado
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
                .bindPopup(crearPopup(estacion));
            marcador.on('click', () => mostrarInfoEstacion(estacion));
            marcadores[estacion.id] = marcador;
        });
        actualizarSelectEstaciones();
    } catch (error) {
        console.error('Error cargando estaciones:', error);
    }
}

function crearPopup(estacion) {
    const ultima = estacion.ultima_medicion !== null ? `${estacion.ultima_medicion}` : 'Sin datos';
    const fechaUltima = estacion.fecha_ultima_medicion ? new Date(estacion.fecha_ultima_medicion).toLocaleString() : 'N/A';
    const unidad = estacion.tipo === 'rio' ? 'm' : 'mm';

    return `
        <div class="popup-estacion">
            <h6>${estacion.nombre}</h6>
            <p><strong>Tipo:</strong> ${estacion.tipo === 'rio' ? 'Río' : 'Pluviométrica'}</p>
            <p><strong>Última medición:</strong> ${ultima} ${unidad}</p>
            <p><strong>Fecha:</strong> ${fechaUltima}</p>
            ${estacion.nivel_alerta ? `<p><strong>Nivel alerta:</strong> ${estacion.nivel_alerta} m</p>` : ''}
            ${estacion.nivel_critico ? `<p><strong>Nivel crítico:</strong> ${estacion.nivel_critico} m</p>` : ''}
            <button class="btn btn-sm btn-primary" onclick="mostrarInfoEstacion(${JSON.stringify(estacion)})">Ver detalles</button>
        </div>
    `;
}

function mostrarInfoEstacion(estacion) {
    const infoDiv = document.getElementById('estacionInfo');
    const ultima = estacion.ultima_medicion !== null ? estacion.ultima_medicion : 'Sin datos';
    const fechaUltima = estacion.fecha_ultima_medicion ? new Date(estacion.fecha_ultima_medicion).toLocaleString() : 'N/A';
    const unidad = estacion.tipo === 'rio' ? 'm' : 'mm';

    infoDiv.innerHTML = `
        <h6>${estacion.nombre}</h6>
        <p><strong>Tipo:</strong> ${estacion.tipo}</p>
        <p><strong>Última medición:</strong> ${ultima} ${unidad}</p>
        <p><strong>Fecha:</strong> ${fechaUltima}</p>
        <p><strong>Coordenadas:</strong> ${estacion.latitud}, ${estacion.longitud}</p>
        ${estacion.nivel_alerta ? `<p><strong>Alerta:</strong> ${estacion.nivel_alerta}</p>` : ''}
        ${estacion.nivel_critico ? `<p><strong>Crítico:</strong> ${estacion.nivel_critico}</p>` : ''}
        <button class="btn btn-sm btn-outline-secondary" onclick="this.parentElement.style.display='none'">Cerrar</button>
    `;
    infoDiv.style.display = 'block';
}

function actualizarSelectEstaciones() {
    const selects = [
        document.getElementById('selectEstacion'),
        document.getElementById('selectEstacionGrafico'),
        document.getElementById('selectEstacionPoblador'),
        document.getElementById('pobEstacion')
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
function obtenerColorEstado(estacion) {
    if (!estacion.ultima_medicion) return 'grey';
    const valor = parseFloat(estacion.ultima_medicion);
    if (estacion.tipo === 'rio') {
        if (estacion.nivel_critico && valor >= estacion.nivel_critico) return 'red';
        if (estacion.nivel_alerta && valor >= estacion.nivel_alerta) return 'yellow';
        return 'green';
    } else if (estacion.tipo === 'pluviometrica') {
        // Umbrales de lluvia (puedes ajustarlos)
        if (valor >= 150) return 'red';
        if (valor >= 100) return 'yellow';
        return 'green';
    }
    return 'blue';
}
