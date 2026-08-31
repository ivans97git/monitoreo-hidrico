// Manejo de gráficos con Chart.js
let graficoMediciones = null;

function inicializarGraficos() {
    const ctx = document.getElementById('graficoMediciones').getContext('2d');
    
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
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Valor'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Fecha'
                    }
                }
            }
        }
    });
    
    // Cargar datos iniciales
    actualizarGrafico();
}

async function actualizarGrafico() {
    try {
        const estacionId = document.getElementById('selectEstacionGrafico').value;
        const filtros = { limite: 50 };
        
        if (estacionId) {
            filtros.estacion_id = estacionId;
        }
        
        const mediciones = await api.getMediciones(filtros);
        
        // Ordenar por fecha
        mediciones.sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
        
        // Preparar datos para el gráfico
        const labels = mediciones.map(m => 
            new Date(m.fecha_hora).toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        );
        
        const data = mediciones.map(m => m.valor);
        
        // Actualizar gráfico
        graficoMediciones.data.labels = labels;
        graficoMediciones.data.datasets[0].data = data;
        
        // Cambiar color según tipo de medición
        const tipos = mediciones.map(m => m.tipo_medicion);
        const tipoUnico = [...new Set(tipos)];
        
        if (tipoUnico.length === 1) {
            graficoMediciones.data.datasets[0].label = 
                tipoUnico[0] === 'nivel_rio' ? 'Nivel de Río (m)' : 'Precipitación (mm)';
        } else {
            graficoMediciones.data.datasets[0].label = 'Mediciones';
        }
        
        graficoMediciones.update();
        
    } catch (error) {
        console.error('Error actualizando gráfico:', error);
    }
}

// Evento para cambiar estación en gráfico
document.addEventListener('DOMContentLoaded', () => {
    const selectEstacion = document.getElementById('selectEstacionGrafico');
    if (selectEstacion) {
        selectEstacion.addEventListener('change', actualizarGrafico);
    }
});