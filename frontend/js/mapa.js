// Manejo del mapa interactivo
let map;
let marcadores = {};
let estacionesData = [];

function inicializarMapa() {
    map = L.map('map').setView(CONFIG.MAPA.centroInicial, CONFIG.MAPA.zoomInicial);
    
    L.tileLayer(CONFIG.MAPA.tileLayer, {
        attribution: CONFIG.MAPA.atribucion,
        maxZoom: 19
    }).addTo(map);
    
    // Evento para cerrar info al hacer clic en el mapa
    map.on('click', () => {
        document.getElementById('estacionInfo').style.display = 'none';
    });
}

async function cargarEstaciones() {
    try {
        const estaciones = await api.getEstaciones();
        estacionesData = estaciones;
        
        // Limpiar marcadores existentes
        Object.values(marcadores).forEach(marcador => {
            map.removeLayer(marcador);
        });
        marcadores = {};
        
        // Agregar marcadores
        estaciones.forEach(estacion => {
            const color = obtenerColorEstado(estacion);
            const icono = crearIcono(color, estacion.tipo);
            
            const marcador = L.marker([estacion.latitud, estacion.longitud], { icon: icono })
                .addTo(map)
                .bindPopup(crearPopup(estacion));
            
            marcador.on('click', () => {
                mostrarInfoEstacion(estacion);
            });
            
            marcadores[estacion.id] = marcador;
        });
        
        // Actualizar selects
        actualizarSelectEstaciones();
    } catch (error) {
        console.error('Error cargando estaciones:', error);
    }
}

function crearIcono(color, tipo) {
    const iconUrl = tipo === 'rio' ? 
        'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png' :
        'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png';
    
    return L.icon({
        iconUrl: iconUrl,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
}

function crearPopup(estacion) {
    const ultimaMedicion = estacion.ultima_medicion || 'Sin datos';
    const fechaMedicion = estacion.fecha_ultima_medicion ? 
        new Date(estacion.fecha_ultima_medicion).toLocaleString() : 'N/A';
    
    return `
        <div class="popup-estacion">
            <h6>${estacion.nombre}</h6>
            <p><strong>Tipo:</strong> ${estacion.tipo === 'rio' ? 'Río' : 'Pluviométrica'}</p>
            <p><strong>Última medición:</strong> ${ultimaMedicion}</p>
            <p><strong>Fecha:</strong> ${fechaMedicion}</p>
            ${estacion.nivel_critico ? `<p><strong>Nivel crítico:</strong> ${estacion.nivel_critico}m</p>` : ''}
            ${estacion.nivel_alerta ? `<p><strong>Nivel alerta:</strong> ${estacion.nivel_alerta}m</p>` : ''}
            <button class="btn btn-sm btn-primary" onclick="mostrarInfoEstacion(${JSON.stringify(estacion)})">
                Ver detalles
            </button>
        </div>
    `;
}

function mostrarInfoEstacion(estacion) {
    const infoDiv = document.getElementById('estacionInfo');
    const ultimaMedicion = estacion.ultima_medicion || 'Sin datos';
    const estado = obtenerEstado(estacion);
    
    infoDiv.innerHTML = `
        <h6>${estacion.nombre}</h6>
        <p><strong>Estado:</strong> <span class="badge badge-${estado.clase}">${estado.texto}</span></p>
        <p><strong>Última medición:</strong> ${ultimaMedicion}</p>
        <p><strong>Coordenadas:</strong> ${estacion.latitud}, ${estacion.longitud}</p>
        <button class="btn btn-sm btn-outline-secondary" onclick="this.parentElement.style.display='none'">
            Cerrar
        </button>
    `;
    
    infoDiv.style.display = 'block';
}

function obtenerColorEstado(estacion) {
    if (!estacion.ultima_medicion) return 'gray';
    
    if (estacion.tipo === 'rio') {
        if (estacion.nivel_critico && estacion.ultima_medicion >= estacion.nivel_critico) {
            return 'red';
        } else if (estacion.nivel_alerta && estacion.ultima_medicion >= estacion.nivel_alerta) {
            return 'yellow';
        }
    }
    
    return 'green';
}

function obtenerEstado(estacion) {
    if (!estacion.ultima_medicion) {
        return { texto: 'Sin datos', clase: 'normal' };
    }
    
    if (estacion.tipo === 'rio') {
        if (estacion.nivel_critico && estacion.ultima_medicion >= estacion.nivel_critico) {
            return { texto: 'CRÍTICO', clase: 'critico' };
        } else if (estacion.nivel_alerta && estacion.ultima_medicion >= estacion.nivel_alerta) {
            return { texto: 'ALERTA', clase: 'alerta' };
        }
    }
    
    return { texto: 'NORMAL', clase: 'normal' };
}

function actualizarSelectEstaciones() {
    const selects = [
        document.getElementById('selectEstacion'),
        document.getElementById('selectEstacionGrafico'),
        document.getElementById('contactoEstacion')
    ];
    
    selects.forEach(select => {
        if (!select) return;
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">Seleccionar...</option>';
        
        estacionesData.forEach(estacion => {
            const option = document.createElement('option');
            option.value = estacion.id;
            option.textContent = estacion.nombre;
            select.appendChild(option);
        });
        
        select.value = currentValue;
    });
}