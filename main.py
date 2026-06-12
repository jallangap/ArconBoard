import eel
import tkinter as tk
from tkinter import filedialog
import pandas as pd
import os

eel.init('web')

@eel.expose
def seleccionar_archivo_excel():
    root = tk.Tk()
    root.attributes("-topmost", True)
    root.withdraw()
    
    ruta_archivo = filedialog.askopenfilename(
        title="Seleccione el archivo Excel de Ejecución Presupuestaria",
        filetypes=[("Archivos Excel", "*.xlsx *.xls")]
    )
    root.destroy()
    
    if ruta_archivo:
        return {"status": "success", "path": ruta_archivo}
    else:
        return {"status": "cancelled", "path": None}

# NUEVA FUNCIÓN: Motor Agnóstico de Pandas
@eel.expose
def analizar_estructura_excel(ruta_archivo):
    try:
        # 1. Leemos la estructura global del archivo sin asumir columnas
        xls = pd.ExcelFile(ruta_archivo)
        nombres_hojas = xls.sheet_names
        
        # 2. Leemos la primera hoja como muestra principal
        df = pd.read_excel(ruta_archivo, sheet_name=0)
        columnas = df.columns.tolist()
        filas_totales = len(df)
        
        # 3. Redactamos el Resumen IA dinámico basado en la metadata real
        columnas_ejemplo = ", ".join(columnas[:3]) if columnas else "Ninguna"
        resumen = (f"Análisis estructural completado con éxito. El archivo detectado contiene {len(nombres_hojas)} pestaña(s). "
                   f"Se escaneó la hoja principal '{nombres_hojas[0]}' revelando un total de {filas_totales} registros "
                   f"y {len(columnas)} columnas (ej: {columnas_ejemplo}...). "
                   f"El motor está a la espera del formato oficial para realizar el mapeo matemático de la ejecución financiera.")
        
        return {
            "status": "success",
            "resumen_ia": resumen
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == '__main__':
    # Usamos port=0 para evitar WinError y --incognito para evitar problemas de caché
    eel.start('index.html', size=(900, 600), mode='chrome', port=0, cmdline_args=['--incognito'])