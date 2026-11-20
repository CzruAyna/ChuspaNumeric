from pathlib import Path
import argparse
import json

parser = argparse.ArgumentParser()
parser.add_argument('base', type=Path)
parser.add_argument('cambio', type=Path)
args = parser.parse_args()

def cargar(ruta):
    datos = json.loads(ruta.read_text(encoding='utf-8'))
    fallos = []
    for suite in datos['testResults']:
        archivo = suite['name'].replace('\\', '/')
        archivo = 'tests/' + archivo.split('/tests/', 1)[-1]
        if suite['status'] == 'failed':
            nombres = [p['fullName'] for p in suite['assertionResults'] if p['status'] == 'failed']
            fallos.extend((archivo, nombre) for nombre in nombres or ['Fallo al cargar la suite'])
    resumen = {k: datos[k] for k in ['numTotalTestSuites', 'numPassedTestSuites', 'numFailedTestSuites', 'numTotalTests', 'numPassedTests', 'numFailedTests']}
    return resumen, sorted(fallos)

base, fallos_base = cargar(args.base)
cambio, fallos_cambio = cargar(args.cambio)
print('BASE:', base)
print('CON CAMBIOS:', cambio)
if fallos_base != fallos_cambio:
    print('NUEVOS:', sorted(set(fallos_cambio) - set(fallos_base)))
    print('DESAPARECIDOS:', sorted(set(fallos_base) - set(fallos_cambio)))
    raise SystemExit('La lista de fallos cambió respecto a dev.')
assert cambio['numPassedTests'] > base['numPassedTests']
assert cambio['numFailedTests'] == base['numFailedTests']
print('Los fallos coinciden con la base. Las cuatro suites modificadas no añaden fallos.')
