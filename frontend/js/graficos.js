let graficoMediciones = null;

function inicializarGraficos() {
    const ctx = document.getElementById('graficoMediciones').getContext('2d');
    if (graficoMediciones) {
        graficoMediciones.destroy(); // Destruir gráfico anterior
    }
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
            animation: {
                duration: 500 // animación más corta para evitar movimientos bruscos
            },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: { beginAtZero: true },
                x: { 
                    title: { display: true, text: 'Fecha' },
                    ticks: { maxTicksLimit: 10 } // limitar número de etiquetas en eje X
                }
            }
        }
    });
    actualizarGrafico();
}

async function actualizarGrafico() {
    try {
        const estacionId = document.getElementById('selectEstacionGrafico').value;
        const filtros = { limite: 50 };
        if (estacionId) filtros.estacion_id = estacionId;
        
        const mediciones = await api.getMediciones(filtros);
        
        // Filtrar mediciones válidas y ordenar por fecha ascendente
        const medicionesValidas = mediciones
            .filter(m => m.valor !== null && m.valor !== undefined)
            .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
        
        const labels = medicionesValidas.map(m => new Date(m.fecha_hora).toLocaleString());
        const data = medicionesValidas.map(m => m.valor);
        
        graficoMediciones.data.labels = labels;
        graficoMediciones.data.datasets[0].data = data;
        graficoMediciones.update('none'); // 'none' evita animación que puede causar saltos
    } catch (error) {
        console.error('Error actualizando gráfico:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('selectEstacionGrafico');
    if (select) select.addEventListener('change', actualizarGrafico);
});
