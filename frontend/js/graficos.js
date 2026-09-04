let graficoRio = null;
let graficoLluvia = null;

function inicializarGraficos() {
    const ctxRio = document.getElementById('graficoRio').getContext('2d');
    const ctxLluvia = document.getElementById('graficoLluvia').getContext('2d');

    if (graficoRio) graficoRio.destroy();
    if (graficoLluvia) graficoLluvia.destroy();

    const opcionesBase = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
            legend: { display: true, position: 'top' },
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            y: { beginAtZero: true },
            x: { ticks: { maxTicksLimit: 10 } }
        }
    };

    // Gráfico de río
    graficoRio = new Chart(ctxRio, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Nivel de Río (m)',
                data: [],
                borderColor: '#0066cc',
                backgroundColor: 'rgba(0,102,204,0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            ...opcionesBase,
            plugins: {
                ...opcionesBase.plugins,
                annotation: {
                    annotations: {}
                }
            }
        }
    });

    // Gráfico de lluvia
    graficoLluvia = new Chart(ctxLluvia, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Precipitación (mm)',
                data: [],
                backgroundColor: 'rgba(54,162,235,0.5)',
                borderColor: 'rgba(54,162,235,1)',
                borderWidth: 1
            }]
        },
        options: opcionesBase
    });

    actualizarGraficoRio();
    actualizarGraficoLluvia();
}

async function actualizarGraficoRio() {
    try {
        const estacionId = document.getElementById('selectEstacionRio').value;
        const filtros = { tipo_medicion: 'nivel_rio', limite: 100 };
        if (estacionId) filtros.estacion_id = estacionId;

        const mediciones = await api.getMediciones(filtros);
        const validas = mediciones.filter(m => m.valor != null)
                                 .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));

        graficoRio.data.labels = validas.map(m => new Date(m.fecha_hora).toLocaleString());
        graficoRio.data.datasets[0].data = validas.map(m => m.valor);

        // Limpiar anotaciones existentes
        graficoRio.options.plugins.annotation.annotations = {};

        // Si hay estación seleccionada, cargar umbrales
        if (estacionId) {
            const estaciones = await api.getEstaciones();
            const estacion = estaciones.find(e => e.id == estacionId);
            if (estacion && estacion.tipo === 'rio') {
                if (estacion.nivel_alerta) {
                    graficoRio.options.plugins.annotation.annotations['lineaAlerta'] = {
                        type: 'line',
                        yMin: estacion.nivel_alerta,
                        yMax: estacion.nivel_alerta,
                        borderColor: 'orange',
                        borderWidth: 2,
                        label: {
                            content: `Alerta ${estacion.nivel_alerta}`,
                            position: 'end',
                            enabled: true
                        }
                    };
                }
                if (estacion.nivel_critico) {
                    graficoRio.options.plugins.annotation.annotations['lineaCritico'] = {
                        type: 'line',
                        yMin: estacion.nivel_critico,
                        yMax: estacion.nivel_critico,
                        borderColor: 'red',
                        borderWidth: 2,
                        label: {
                            content: `Crítico ${estacion.nivel_critico}`,
                            position: 'end',
                            enabled: true
                        }
                    };
                }
            }
        }

        graficoRio.update('none');
    } catch (error) {
        console.error('Error actualizando gráfico de río:', error);
    }
}

async function actualizarGraficoLluvia() {
    try {
        const estacionId = document.getElementById('selectEstacionLluvia').value;
        const filtros = { tipo_medicion: 'precipitacion', limite: 100 };
        if (estacionId) filtros.estacion_id = estacionId;

        const mediciones = await api.getMediciones(filtros);
        const validas = mediciones.filter(m => m.valor != null)
                                 .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));

        graficoLluvia.data.labels = validas.map(m => new Date(m.fecha_hora).toLocaleString());
        graficoLluvia.data.datasets[0].data = validas.map(m => m.valor);
        graficoLluvia.update('none');
    } catch (error) {
        console.error('Error actualizando gráfico de lluvia:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const selectRio = document.getElementById('selectEstacionRio');
    const selectLluvia = document.getElementById('selectEstacionLluvia');
    if (selectRio) selectRio.addEventListener('change', actualizarGraficoRio);
    if (selectLluvia) selectLluvia.addEventListener('change', actualizarGraficoLluvia);
});
