document.addEventListener("DOMContentLoaded", function() {
    
    // Control del Panel de Filtros
    const sidebar = document.getElementById('sidebar');
    const btnOpenSidebar = document.getElementById('btn-open-sidebar');
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');
    const btnApplyFilters = document.getElementById('btn-apply-filters');
    const btnResetFilters = document.getElementById('btn-reset-filters');
    const btnIaOnline = document.getElementById('btn-ia-online'); 
    
    // Controles de Filtro
    const filterMonth = document.getElementById('filter-month');
    const filterYear = document.getElementById('filter-year');
    const filterUnit = document.getElementById('filter-unit');

    btnOpenSidebar.addEventListener('click', () => sidebar.classList.remove('-translate-x-full'));
    btnCloseSidebar.addEventListener('click', () => sidebar.classList.add('-translate-x-full'));
    
    btnApplyFilters.addEventListener('click', () => {
        cargarMétricasReales();
        sidebar.classList.add('-translate-x-full');
    });

    btnResetFilters.addEventListener('click', () => {
        filterUnit.value = 'Todas las Unidades';
        cargarMétricasReales();
        sidebar.classList.add('-translate-x-full');
    });

    // LÓGICA DE IA GENERATIVA CON PROTECCIÓN DE ERRORES
    if (btnIaOnline) {
        btnIaOnline.addEventListener('click', async () => {
            let apiKey = localStorage.getItem('gemini_api_key');
            if (!apiKey) {
                apiKey = prompt("Configuración de Seguridad: Para activar el motor de IA Online, ingrese su API Key de Google Gemini:");
                if (!apiKey) return;
                localStorage.setItem('gemini_api_key', apiKey);
            }
            
            const resumenElement = document.getElementById('resumen-ia-text');
            const textoOriginalOffline = resumenElement.innerText;
            
            resumenElement.innerText = "✨ El motor de Inteligencia Artificial está auditando los datos... por favor espere.";
            resumenElement.className = "text-indigo-300 text-sm leading-relaxed animate-pulse font-medium";

            const datosContexto = `
                Presupuesto Asignado Aprobado: ${document.getElementById('kpi-aprobado').innerText}. 
                Presupuesto Codificado: ${document.getElementById('kpi-codificado').innerText}. 
                Gasto Devengado: ${document.getElementById('kpi-devengado').innerText}. 
                Porcentaje de Ejecución: ${document.getElementById('gauge-text').innerText}.
            `;

            try {
                const res = await eel.redactar_resumen_ia_online(datosContexto, apiKey)();
                
                resumenElement.classList.remove("animate-pulse", "text-indigo-300", "font-medium");
                
                if (res.status === "success") {
                    resumenElement.innerText = res.resumen_ia;
                    resumenElement.classList.add("text-slate-200");
                } else {
                    resumenElement.innerText = textoOriginalOffline;
                    resumenElement.classList.add("text-slate-300");
                    alert(res.message);
                    if (res.message.includes("API_KEY") || res.message.includes("key")) {
                        localStorage.removeItem('gemini_api_key');
                    }
                }
            } catch (error) {
                // Si el servidor se apaga o falla gravemente
                resumenElement.classList.remove("animate-pulse", "text-indigo-300", "font-medium");
                resumenElement.innerText = textoOriginalOffline;
                resumenElement.classList.add("text-slate-300");
                alert("Error de comunicación. Asegúrate de haber reiniciado tu terminal. Detalle: " + error);
            }
        });
    }

    // Inicializar la Grilla
    GridStack.init({ cellHeight: '100px', margin: 15, float: false, animate: true, resizable: { handles: 'se, sw' } });

    Chart.defaults.color = '#94a3b8'; 
    Chart.defaults.font.family = 'sans-serif';

    let gaugeChartInstance = null;
    let mixedChartInstance = null;
    let primeraCarga = true; 

    // Conexión principal con Python
    async function cargarMétricasReales() {
        const rutaExcel = localStorage.getItem('excelPath');
        if (!rutaExcel) return;

        const mesSeleccionado = filterMonth ? filterMonth.value : null;
        const anioSeleccionado = filterYear ? filterYear.value : null;
        const unidadSeleccionada = filterUnit ? filterUnit.value : "Todas las Unidades";

        const resumenElement = document.getElementById('resumen-ia-text');
        resumenElement.innerText = "Calculando varianzas y consolidando el Form 1...";
        resumenElement.className = "text-slate-300 text-sm leading-relaxed animate-pulse";

        try {
            const res = await eel.analizar_estructura_excel(rutaExcel, mesSeleccionado, anioSeleccionado, unidadSeleccionada)();
            resumenElement.classList.remove("animate-pulse");

            if (res.status === "success") {
                resumenElement.innerText = res.resumen_ia;

                if (primeraCarga && filterUnit) {
                    filterUnit.innerHTML = res.filtros.distribuidoras.map(d => `<option value="${d}">${d}</option>`).join('');
                    primeraCarga = false;
                }

                document.getElementById('kpi-aprobado').innerText = res.kpis.aprobado;
                document.getElementById('kpi-codificado').innerText = res.kpis.codificado;
                document.getElementById('kpi-comprometido').innerText = res.kpis.comprometido;
                document.getElementById('kpi-devengado').innerText = res.kpis.devengado;
                document.getElementById('gauge-text').innerText = `${res.kpis.porcentaje}%`;

                const ctxGauge = document.getElementById('gaugeChart').getContext('2d');
                if (gaugeChartInstance) gaugeChartInstance.destroy();
                gaugeChartInstance = new Chart(ctxGauge, {
                    type: 'doughnut',
                    data: {
                        labels: ['Ejecutado', 'Por Devengar'],
                        datasets: [{
                            data: [res.kpis.porcentaje, Math.max(0, 100 - res.kpis.porcentaje)],
                            backgroundColor: ['#06b6d4', '#334155'], 
                            borderWidth: 0, cutout: '80%'
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, rotation: 270, circumference: 180, plugins: { legend: { display: false } } }
                });

                const ctxMixed = document.getElementById('mixedChart').getContext('2d');
                if (mixedChartInstance) mixedChartInstance.destroy();
                mixedChartInstance = new Chart(ctxMixed, {
                    type: 'bar',
                    data: {
                        labels: res.matriz.map(item => item.partida.substring(0, 15) + '...'),
                        datasets: [{
                            label: '% de Ejecución',
                            data: res.matriz.map(item => item.porcentaje),
                            backgroundColor: '#0ea5e9', borderRadius: 6
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, grid: { color: '#334155' } }, x: { grid: { display: false } } } }
                });

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
                        <td class="py-3 px-4 flex justify-center items-center"><div class="w-4 h-4 rounded-full ${colorSemaforo}"></div></td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                resumenElement.innerText = "Error: " + res.message;
            }
        } catch(error) {
            resumenElement.innerText = "Fallo de conexión al cargar datos.";
            console.error(error);
        }
    }

    cargarMétricasReales();
});