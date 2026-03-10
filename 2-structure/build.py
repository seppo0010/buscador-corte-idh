import json
from glob import glob
import re
import os.path

data_dir = os.environ.get('DATA_DIR', 'data')

PHASES = ['Fondo', 'Reparaciones', 'Excepciones Preliminares', 'Interpretación', 'Supervisión', 'Costas']

def run():
    'Creates structured files from text files'
    abs_data_dir = os.path.abspath(data_dir)
    os.makedirs(abs_data_dir, exist_ok=True)
    for filename in glob(os.path.join(abs_data_dir, '*.txt')):
        with open(filename, 'r', encoding='utf-8') as filepointer:
            data = filepointer.read()
        lines = [line.strip() for line in data.split('\n') if line not in ('', '1', '*')]

        caso = None
        fecha = None
        line = 0
        while True:
            if (lines[line].upper().startswith('CORTE INTERAMERICANA DE DERECHOS HUMANOS'.upper()) or
                lines[line].upper().startswith('COUR INTERAMERICAINE DES DROITS DE L\'HOMME'.upper()) or
                lines[line].upper().startswith('CORTE INTERAMERICANA DE DIREITOS HUMANOS'.upper()) or
                lines[line].upper().startswith('INTER-AMERICAN COURT OF HUMAN RIGHTS'.upper())
                    ):
                line += 1
            else:
                break

        caso = lines[line].upper()
        if (
                not caso.startswith('CASO') and
                not caso.startswith('OPINIÓN CONSULTIVA') and
                not caso.startswith('RESOLUCIÓN')
                ):
            caso = f'CASO {caso}'

        curr = None
        if caso.startswith('CASO'):
            line += 1

            curr = lines[line].upper()
            while (not curr.startswith('SENTENCIA') and
                   not curr.startswith('RESOLUCIÓN') and
                   not curr.startswith('TABLA DE CONTENIDO')):
                caso += f' {curr}'
                line += 1
                curr = lines[line].upper()
                if line > 10:
                    raise ValueError(f'Failed to parse {filename}')
            if curr.startswith('TABLA DE CONTENIDO'):
                curr = None

        if curr is not None:
            fecha_parts = [el for el in curr.split(' ') if el != 'DE']
            year = int(fecha_parts[-1].strip('*'))
            assert year > 1900
            month = {
                'ENERO': 1,
                'FEBRERO': 2,
                'MARZO': 3,
                'ABRIL': 4,
                'MAYO': 5,
                'JUNIO': 6,
                'JULIO': 7,
                'AGOSTO': 8,
                'SEPTIEMBRE': 9,
                'SETIEMBRE': 9,
                'SEPTIEMPRE': 9,
                'OCTUBRE': 10,
                'NOVIEMBRE': 11,
                'DICIEMBRE': 12,
            }[fecha_parts[-2]]
            day = int(fecha_parts[-3])
            fecha = f'{year}-{month:02}-{day:02}'

        articulos = set()
        text_content = ' '.join(lines)
        # Robust pattern for detecting references to CADH articles
        # Matches article numbers followed by common names of the American Convention
        segment_pattern = r'(?i)art(?:ículos?|\.)\s+(.+?)\s+(?:de\s+la|de\s+esta|de\s+esa|del|en\s+la)\s+(?:Convención Americana|Convención|CADH|Pacto de San José)'
        for match in re.finditer(segment_pattern, text_content):
            arts_str = match.group(1)
            if len(arts_str) > 300: # Safety to avoid over-matching across blocks
                continue

            # 1. Handle ranges like "48 a 50" -> 48, 49, 50
            for start, end in re.findall(r'(\d+)\s+a\s+(\d+)', arts_str):
                for i in range(int(start), int(end) + 1):
                    articulos.add(i)

            # 2. Clean common noise like "(Derecho a la Vida)" and labels like "numeral 1"
            clean_arts = re.sub(r'\(.*?\)', '', arts_str)
            clean_arts = re.sub(r'(?i)(?:numeral|inciso|párrafo|página|p\.|pág\.)\s+\d+', '', clean_arts)

            # 3. Extract the article numbers (integer part only, for filtering)
            for art in re.findall(r'\b(\d+)(?:\.\d+)?\b', clean_arts):
                articulos.add(int(art))

        # --- New metadata fields ---

        # pais: defendant state extracted from "VS. COUNTRY" pattern
        pais = None
        caso_clean = re.sub(r'[\s*]+$', '', caso)
        m = re.search(r'VS\.?\s+([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ]*(?:\s+[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ]*){0,3})$', caso_clean)
        if m:
            pais = m.group(1).strip()
            # Normalize formal/variant state names to short country names
            pais = re.sub(r'^(?:ESTADO PLURINACIONAL DE|REPÚBLICA BOLIVARIANA DE|REPÚBLICA FEDERATIVA DEL|REPÚBLICA DE|ESTADO DE|ESTADOS UNIDOS DE)\s+', '', pais)
            pais = {'ESTADOS UNIDOS MEXICANOS': 'MÉXICO', 'SURINAME': 'SURINAM'}.get(pais, pais)

        # numero_serie: integer from filename like seriec_4_esp.txt
        base = os.path.basename(filename)
        ms = re.search(r'serie[ac]_(\d+)', base)
        numero_serie = int(ms.group(1)) if ms else None

        # tipo_documento
        if caso.startswith('CASO'):
            tipo_documento = 'caso'
        elif caso.startswith('OPINIÓN CONSULTIVA'):
            tipo_documento = 'opinion_consultiva'
        else:
            tipo_documento = 'resolucion'

        # tipo_sentencia: list of procedural phases found in parenthetical near start of doc
        mt = re.search(r'\(([^)]+)\)', data[:1500])
        tipo_sentencia = [p for p in PHASES if p.lower() in (mt.group(1).lower() if mt else '')]

        # resumen: operative paragraph starting at last "Por tanto"
        matches = list(re.finditer(r'por tanto', data, re.IGNORECASE))
        resumen = data[matches[-1].start():matches[-1].start()+3000].strip() if matches else None

        target = os.path.join(abs_data_dir, os.path.basename(filename)[:-4] + '.json')
        with open(target, 'w', encoding='utf-8') as filepointer:
            filepointer.write(json.dumps({
                'caso': caso,
                'fecha': fecha,
                'data': data,
                'articulos': sorted(articulos),
                'pais': pais,
                'numero_serie': numero_serie,
                'tipo_documento': tipo_documento,
                'tipo_sentencia': tipo_sentencia,
                'resumen': resumen,
            }))

run()
