document.addEventListener("DOMContentLoaded", function() {
    
    // Control del Panel de Filtros
    const sidebar = document.getElementById('sidebar');
    const btnOpenSidebar = document.getElementById('btn-open-sidebar');
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');
    const btnApplyFilters = document.getElementById('btn-apply-filters');

    btnOpenSidebar.addEventListener('click', () => sidebar.classList.remove('-translate-x-full'));
    btnCloseSidebar.addEventListener('click', () => sidebar.classList.add('-translate-x-full'));
    btnApplyFilters.addEventListener('click', () => sidebar.classList.add('-translate-x-full'));

    // Inicializar la Grilla Drag & Drop
    const grid = GridStack.init({
        cellHeight: '100px',
        margin: 15,
        float: false,
        animate: true,
        resizable: { handles: 'se, sw' }
    });

    
    Chart.defaults.color = '#94a3b8'; 
    Chart.defaults.font.family = 'sans-serif';

    let gaugeChartInstance = null;
    let mixedChartInstance = null;

    // Conexión principal con el pipeline de datos en Python
    async function cargarMétricasReales() {
        const rutaExcel = localStorage.getItem('excelPath');
        if (!rutaExcel) return;

        const resumenElement = document.getElementById('resumen-ia-text');
        resumenElement.innerText = "Ejecutando cálculos consolidados en el Form 1 con Pandas...";

        // Invocación al backend de Python
        const res = await eel.analizar_estructura_excel(rutaExcel)();

        if (res.status === "success") {
            // 1. Renderizar Resumen IA
            resumenElement.innerText = res.resumen_ia;

            // 2. Poblar Filtros dinámicos con data real (sin años inventados)
            const dateSelect = document.getElementById('filter-date');
            const unitSelect = document.getElementById('filter-unit');
            
            dateSelect.innerHTML = res.filtros.fechas.map(f => `<option value="${f}">${f}</option>`).join('');
            unitSelect.innerHTML = res.filtros.distribuidoras.map(d => `<option value="${d}">${d}</option>`).join('');

            // 3. Inyectar valores reales a las tarjetas KPI oficiales
            document.getElementById('kpi-aprobado').innerText = res.kpis.aprobado;
            document.getElementById('kpi-codificado').innerText = res.kpis.codificado;
            document.getElementById('kpi-comprometido').innerText = res.kpis.comprometido;
            document.getElementById('kpi-devengado').innerText = res.kpis.devengado;
            document.getElementById('gauge-text').innerText = `${res.kpis.porcentaje}%`;

            // 4. Dibujar Gráfico del Velocímetro con el porcentaje real de ejecución
            const ctxGauge = document.getElementById('gaugeChart').getContext('2d');
            if (gaugeChartInstance) gaugeChartInstance.destroy();
            gaugeChartInstance = new Chart(ctxGauge, {
                type: 'doughnut',
                data: {
                    labels: ['Ejecutado', 'Por Devengar'],
                    datasets: [{
                        data: [res.kpis.porcentaje, Math.max(0, 100 - res.kpis.porcentaje)],
                        backgroundColor: ['#06b6d4', '#334155'], 
                        borderWidth: 0,
                        cutout: '80%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    rotation: 270, 
                    circumference: 180,
                    plugins: { legend: { display: false } }
                }
            });

            // 5. Dibujar Gráfico de barras de costos reales
            const ctxMixed = document.getElementById('mixedChart').getContext('2d');
            if (mixedChartInstance) mixedChartInstance.destroy();
            mixedChartInstance = new Chart(ctxMixed, {
                type: 'bar',
                data: {
                    labels: res.matriz.map(item => item.partida.substring(0, 15) + '...'),
                    datasets: [{
                        label: '% de Ejecución por Subetapa',
                        data: res.matriz.map(item => item.porcentaje),
                        backgroundColor: '#0ea5e9',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { min: 0, max: 100, grid: { color: '#334155' } }, x: { grid: { display: false } } }
                }
            });

            // 6. Cargar Matriz Semafórica Real
            const tbody = document.getElementById('real-table-body');
            tbody.innerHTML = "";
            res.matriz.forEach(row => {
                let colorSemaforo = row.estado === "rojo" ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]" : 
                                    row.estado === "amarillo" ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]" : 
                                    "bg-emerald-400 shadow-[0_0_8px_#34d399]";

                const tr = document.createElement('tr');
                tr.className = "border-b border-slate-700 hover:bg-slate-700/50 transition-colors";
                tr.innerHTML = `
                    <td class="py-3 px-4 font-medium text-white">${row.partida}</td>
                    <td class="py-3 px-4">${row.asignado}</td>
                    <td class="py-3 px-4">${row.devengado}</td>
                    <td class="py-3 px-4 font-semibold">${row.porcentaje}%</td>
                    <td class="py-3 px-4 flex justify-center items-center">
                        <div class="w-4 h-4 rounded-full ${colorSemaforo}"></div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            resumenElement.innerText = "Error crítico en el mapeo: " + res.message;
        }
    }

    cargarMétricasReales();
});