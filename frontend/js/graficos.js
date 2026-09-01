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
                legend: { display: true, position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: { beginAtZero: true },
                x: { title: { display: true, text: 'Fecha' } }
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
        mediciones.sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
        const labels = mediciones.map(m => new Date(m.fecha_hora).toLocaleString());
        const data = mediciones.map(m => m.valor);
        graficoMediciones.data.labels = labels;
        graficoMediciones.data.datasets[0].data = data;
        graficoMediciones.update();
    } catch (error) {
        console.error('Error actualizando gráfico:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('selectEstacionGrafico');
    if (select) select.addEventListener('change', actualizarGrafico);
});