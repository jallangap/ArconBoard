import gevent.monkey
gevent.monkey.patch_all()

import eel
import tkinter as tk
from tkinter import filedialog
import pandas as pd
import os
import google.generativeai as genai

import warnings
# Silenciamos las advertencias molestas de Excel y de versiones futuras
warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")
warnings.filterwarnings("ignore", category=FutureWarning)

eel.init('web')

@eel.expose
def seleccionar_archivo_excel():
    root = tk.Tk()
    root.attributes("-topmost", True)
    root.withdraw()
    ruta_archivo = filedialog.askopenfilename(
        title="Seleccione el archivo Excel de Ejecución Presupuestaria",
        filetypes=[("Archivos Excel", "*.xlsx *.xls *.csv")]
    )
    root.destroy()
    if ruta_archivo:
        return {"status": "success", "path": ruta_archivo}
    return {"status": "cancelled", "path": None}

MESES = {"1": "Enero", "2": "Febrero", "3": "Marzo", "4": "Abril", "5": "Mayo", "6": "Junio", 
         "7": "Julio", "8": "Agosto", "9": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"}

@eel.expose
def analizar_estructura_excel(ruta_archivo, filtro_mes=None, filtro_anio=None, filtro_unidad="Todas las Unidades"):
    try:
        xls = pd.ExcelFile(ruta_archivo)
        sheets = xls.sheet_names
        
        distribuidoras = ["Todas las Unidades"]
        if 'Listas' in sheets:
            df_listas = pd.read_excel(ruta_archivo, sheet_name='Listas')
            if 'distribuidoras' in df_listas.columns:
                distribuidoras += df_listas['distribuidoras'].dropna().unique().tolist()
        
        aprobado = 0.0
        reformas = 0.0
        codificado = 0.0
        compromiso = 0.0
        devengado = 0.0
        partidas_matriz = []

        sheet_form1 = next((s for s in sheets if 'FORM 1' in s.upper()), None)
        
        if sheet_form1:
            df_form1 = pd.read_excel(ruta_archivo, sheet_name=sheet_form1)
            df_form1.columns = df_form1.columns.str.strip() 
            
            if 'subetapafuncional' in df_form1.columns:
                df_clean = df_form1[df_form1['subetapafuncional'].str.upper() != 'TOTALES']
            else:
                df_clean = df_form1

            if filtro_unidad != "Todas las Unidades" and 'distribuidora' in df_clean.columns:
                df_clean = df_clean[df_clean['distribuidora'] == filtro_unidad]
                
            if 'asignacion_inicial' in df_clean.columns:
                aprobado = float(df_clean['asignacion_inicial'].sum())
            if 'presupuesto_codificado' in df_clean.columns:
                codificado = float(df_clean['presupuesto_codificado'].sum())
            if 'compromiso' in df_clean.columns:
                compromiso = float(df_clean['compromiso'].sum())
            if 'devengado' in df_clean.columns:
                devengado = float(df_clean['devengado'].sum())

            if 'subetapafuncional' in df_clean.columns:
                for _, row in df_clean.iterrows():
                    sub_etapa = str(row['subetapafuncional'])
                    if sub_etapa and sub_etapa.lower() != 'nan' and 'totales' not in sub_etapa.lower():
                        asig_ini = float(row.get('asignacion_inicial', 0))
                        dev = float(row.get('devengado', 0))
                        cod = float(row.get('presupuesto_codificado', 0))
                        
                        pct = (dev / cod * 100) if cod > 0 else 0
                        est = "rojo" if pct > 90 else "amarillo" if pct > 50 else "verde"
                        
                        if asig_ini > 0 or dev > 0 or cod > 0:
                            partidas_matriz.append({
                                "partida": sub_etapa, "asignado": f"${asig_ini:,.2f}", "devengado": f"${dev:,.2f}",
                                "porcentaje": int(pct), "estado": est
                            })

        saldo_disponible = codificado - devengado
        porcentaje_ejecucion = (devengado / codificado * 100) if codificado > 0 else 0
        
        if codificado == 0:
            estado_salud = "SIN DATOS INICIALES"
        else:
            estado_salud = "ÓPTIMO" if porcentaje_ejecucion >= 75 else "PRECAUCIÓN" if porcentaje_ejecucion >= 50 else "CRÍTICO"
        
        nombre_mes = MESES.get(str(filtro_mes), "Periodo actual") if filtro_mes else "Periodo actual"
        texto_unidad = filtro_unidad if filtro_unidad != "Todas las Unidades" else "el consolidado nacional"
        
        resumen_ia = (
            f"Análisis Financiero MEF: Evaluación para {texto_unidad} (Corte: {nombre_mes} {filtro_anio}). "
            f"El presupuesto codificado asciende a ${codificado:,.2f} con una ejecución devengada de ${devengado:,.2f}. "
            f"Esto representa un nivel de ejecución del {porcentaje_ejecucion:.2f}% (Estado: {estado_salud}). "
            f"Se registra un saldo disponible de ${saldo_disponible:,.2f}."
        )
        
        return {
            "status": "success",
            "resumen_ia": resumen_ia,
            "filtros": {"distribuidoras": distribuidoras},
            "kpis": {
                "aprobado": f"${aprobado:,.2f}",
                "codificado": f"${codificado:,.2f}",
                "comprometido": f"${compromiso:,.2f}",
                "devengado": f"${devengado:,.2f}",
                "porcentaje": round(porcentaje_ejecucion, 2)
            },
            "matriz": partidas_matriz
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@eel.expose
def redactar_resumen_ia_online(datos_contexto, api_key):
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        Actúa como un Auditor Financiero Senior del sector eléctrico. 
        Analiza el siguiente contexto numérico de ejecución presupuestaria:
        {datos_contexto}
        
        Tu tarea: Redactar un "Resumen Ejecutivo de Auditoría" de un solo párrafo (máximo 4 líneas).
        Reglas: Tono estrictamente corporativo y analítico. Menciona el nivel de ejecución, diagnostica si la salud financiera es óptima, crítica o de precaución, y da una micro-recomendación de gestión de recursos. No inventes números que no estén en el contexto.
        """
        
        respuesta = model.generate_content(prompt)
        return {"status": "success", "resumen_ia": respuesta.text}
    except Exception as e:
        return {"status": "error", "message": f"Error de conexión con la IA: {str(e)}"}

if __name__ == '__main__':
    eel.start('index.html', size=(1024, 768), mode='chrome', port=0, cmdline_args=['--incognito'])