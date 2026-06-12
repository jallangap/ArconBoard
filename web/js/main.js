document.getElementById('btn-cargar').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status-message');
    
    // Mostramos un mensaje visual de carga
    statusDiv.classList.remove('hidden');
    statusDiv.className = "mt-6 text-sm text-cyan-300 animate-pulse";
    statusDiv.innerText = "Abriendo explorador de archivos...";

    // Llamamos a la función de Python
    const response = await eel.seleccionar_archivo_excel()();

    // Manejamos la respuesta
    if (response.status === "success") {
        statusDiv.className = "mt-6 text-sm text-emerald-400 font-medium";
        statusDiv.innerText = `Archivo cargado exitosamente:\n${response.path}`;

        //Guardamos la ruta del archivo en la memoria del navegador
        localStorage.setItem('excelPath', response.path);
        
        // Redirección real al Dashboard Analítico
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } else {
        statusDiv.className = "mt-6 text-sm text-amber-400";
        statusDiv.innerText = "Carga cancelada. Por favor, seleccione un archivo.";
    }
});