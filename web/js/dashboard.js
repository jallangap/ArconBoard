document.addEventListener("DOMContentLoaded", function() {
    
    // --- LÓGICA DEL SIDEBAR (FILTROS) ---
    const sidebar = document.getElementById('sidebar');
    const btnOpenSidebar = document.getElementById('btn-open-sidebar');
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');
    const btnApplyFilters = document.getElementById('btn-apply-filters'); // <-- NUEVA CONSTANTE

    btnOpenSidebar.addEventListener('click', () => {
        sidebar.classList.remove('-translate-x-full');
    });

    btnCloseSidebar.addEventListener('click', () => {
        sidebar.classList.add('-translate-x-full');
    });

    // LÓGICA DE AUTO-CIERRE -->
    btnApplyFilters.addEventListener('click', () => {
        // En el futuro, aquí tomaremos las fechas y se las enviaremos a Pandas
        // Por ahora, solo cerramos el panel lateral por comodidad visual
        sidebar.classList.add('-translate-x-full');
    });

    // --- 1. Inicializar GridStack ---
    const grid = GridStack.init({
        cellHeight: '100px',
        margin: 15,
        float: false,
        animate: true,
        resizable: { handles: 'se, sw' }
    });

    // --- Configuración global para Chart.js ---
    Chart.defaults.color = '#94a3b8'; 
    Chart.defaults.font.family = 'sans-serif';

    // --- 2. Gráfico de Velocímetro ---
    const ctxGauge = document.getElementById('gaugeChart').getContext('2d');
    new Chart(ctxGauge, {
        type: 'doughnut',
        data: {
            labels: ['Ejecutado', 'Disponible'],
            datasets: [{
                data: [75, 25],
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
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });

    // --- 3. Gráfico Mixto ---
    const ctxMixed = document.getElementById('mixedChart').getContext('2d');
    new Chart(ctxMixed, {
        type: 'bar',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
            datasets: [
                {
                    type: 'line',
                    label: 'Tendencia Proyectada',
                    data: [1000, 1500, 2200, 3000, 3800, 4500],
                    borderColor: '#f59e0b', 
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4
                },
                {
                    type: 'bar',
                    label: 'Gasto Real Mensual',
                    data: [800, 1600, 2000, 3100, 3500, 4600],
                    backgroundColor: '#0ea5e9', 
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: '#334155' } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { position: 'top' }
            }
        }
    });

    // --- 4. Matriz de Datos ---
    const dummyData = [
        { partida: "5101 - Remuneraciones", asignado: "$150,000", devengado: "$145,000", porcentaje: 96, estado: "rojo" },
        { partida: "5302 - Servicios Generales", asignado: "$50,000", devengado: "$20,000", porcentaje: 40, estado: "verde" },
        { partida: "7304 - Mantenimiento Equipos", asignado: "$80,000", devengado: "$65,000", porcentaje: 81, estado: "amarillo" },
        { partida: "8401 - Bienes de Larga Duración", asignado: "$200,000", devengado: "$10,000", porcentaje: 5, estado: "verde" }
    ];

    const tbody = document.getElementById('dummy-table-body');
    dummyData.forEach(row => {
        let colorSemaforo = row.estado === "rojo" ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]" : 
                            row.estado === "amarillo" ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]" : 
                            "bg-emerald-400 shadow-[0_0_8px_#34d399]";

        const tr = document.createElement('tr');
        tr.className = "border-b border-slate-700 hover:bg-slate-700/50 transition-colors";
        tr.innerHTML = `
            <td class="py-3 px-4 font-medium text-white">${row.partida}</td>
            <td class="py-3 px-4">${row.asignado}</td>
            <td class="py-3 px-4">${row.devengado}</td>
            <td class="py-3 px-4">${row.porcentaje}%</td>
            <td class="py-3 px-4 flex justify-center items-center">
                <div class="w-4 h-4 rounded-full ${colorSemaforo}"></div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // --- 5. CONEXIÓN CON EL MOTOR PANDAS ---
    async function procesarArchivo() {
        const rutaExcel = localStorage.getItem('excelPath');
        if (rutaExcel) {
            const resumenElement = document.getElementById('resumen-ia-text');
            resumenElement.innerText = "Analizando estructura del archivo con Pandas... por favor espere.";
            resumenElement.classList.add("animate-pulse", "text-cyan-300");

            const resultado = await eel.analizar_estructura_excel(rutaExcel)();

            resumenElement.classList.remove("animate-pulse", "text-cyan-300");
            
            if (resultado.status === "success") {
                resumenElement.innerText = resultado.resumen_ia;
                resumenElement.classList.add("text-emerald-300");
            } else {
                resumenElement.innerText = "Error al leer el archivo: " + resultado.message;
                resumenElement.classList.add("text-rose-400");
            }
        }
    }
    procesarArchivo();
});