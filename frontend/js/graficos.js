let graficoMediciones = null;

function inicializarGraficos() {
    const ctx = document.getElementById('graficoMediciones').getContext('2d');
    if (graficoMediciones) graficoMediciones.destroy();

    graficoMediciones = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Mediciones',
                data: [],
                borderColor: '#0066cc',
                backgroundColor: 'rgba(0, 102, 204, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: { mode: 'index', intersect: false },
                annotation: {
                    annotations: {}
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMin: 0,
                    suggestedMax: 20,
                    title: { display: true, text: 'Valor' }
                },
                x: {
                    title: { display: true, text: 'Fecha' },
                    ticks: { maxTicksLimit: 10 }
                }
            }
        }
    });
    actualizarGrafico();
}

async function actualizarGrafico() {
    try {
        const estacionId = document.getElementById('selectEstacionGrafico').value;
        const filtros = { limite: 100 };
        if (estacionId) filtros.estacion_id = estacionId;

        const mediciones = await api.getMediciones(filtros);
        const validas = mediciones.filter(m => m.valor !== null && m.valor !== undefined)
                                 .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
        const labels = validas.map(m => new Date(m.fecha_hora).toLocaleString());
        const data = validas.map(m => m.valor);

        graficoMediciones.data.labels = labels;
        graficoMediciones.data.datasets[0].data = data;

        // Limpiar anotaciones previas
        graficoMediciones.options.plugins.annotation.annotations = {};

        // Si hay estación seleccionada, buscar sus umbrales y agregar líneas
        if (estacionId) {
            const estaciones = await api.getEstaciones();
            const estacion = estaciones.find(e => e.id == estacionId);
            if (estacion) {
                if (estacion.nivel_alerta) {
                    graficoMediciones.options.plugins.annotation.annotations['lineaAlerta'] = {
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
                    graficoMediciones.options.plugins.annotation.annotations['lineaCritico'] = {
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

        graficoMediciones.update('none');
    } catch (error) {
        console.error('Error actualizando gráfico:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('selectEstacionGrafico');
    if (select) select.addEventListener('change', actualizarGrafico);
});
