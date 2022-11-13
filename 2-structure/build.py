import json
from glob import glob
import re
import os.path

def run():
    'Creates structured files from text files'
    file_path = os.path.abspath(os.path.dirname(__file__))
    os.makedirs(os.path.join(file_path, 'data'), exist_ok=True)
    for filename in glob(os.path.join(file_path, '../1-extract/data/*')):
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

        if caso.startswith('CASO'):
            line += 1

            curr = lines[line].upper()
            while not curr.startswith('SENTENCIA') and not curr.startswith('RESOLUCIÓN'):
                caso += f' {curr}'
                curr = lines[line].upper()
                line += 1
                if curr == 'Tabla de contenido'.upper():
                    curr = None
                    break

                if line > 10:
                    raise ValueError(f'Failed to parse {filename}')

        if curr is not None:
            fecha = [el for el in curr.split(' ') if el != 'DE']
            year = int(fecha[-1].strip('*'))
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
                'OCTUBRE': 10,
                'NOVIEMBRE': 11,
                'DICIEMBRE': 12,
            }[fecha[-2]]
            day = int(fecha[-3])
            fecha = f'{year}-{month:02}-{day:02}'

        articulos = set()
        for arts in re.findall(r'artículos? ([0-9\. y,]*?) de la Convención Americana', ' '.join(lines)):
            for art in re.findall(r'([0-9]+(?:\.[0-9]+)?)', arts):
                articulos.add(int(art.split('.')[0]))

        target = os.path.join(file_path, 'data', os.path.basename(filename)[:-4] + '.json')
        with open(target, 'w', encoding='utf-8') as filepointer:
            filepointer.write(json.dumps({
                'caso': caso,
                'fecha': fecha,
                'data': data,
                'articulos': sorted(articulos),
            }))

run()
