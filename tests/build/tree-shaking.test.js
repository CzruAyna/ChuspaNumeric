import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import assert from 'node:assert/strict';
import { test } from '@jest/globals';
import { parseAst } from 'rollup/parseAst';

const raizProyecto = process.cwd();

function leerJson(ruta) {
  return JSON.parse(readFileSync(ruta, 'utf8'));
}

function listarArchivosJs(directorio) {
  const archivos = [];

  for (const entrada of readdirSync(directorio)) {
    const ruta = join(directorio, entrada);
    const estado = statSync(ruta);

    if (estado.isDirectory()) {
      archivos.push(...listarArchivosJs(ruta));
    } else if (entrada.endsWith('.js')) {
      archivos.push(ruta);
    }
  }

  return archivos;
}

test('package.json declara sideEffects: false', () => {
  const packageJson = leerJson(join(raizProyecto, 'package.json'));

  assert.equal(packageJson.sideEffects, false);
});

test('los módulos de src no tienen efectos secundarios evidentes a nivel de módulo', () => {
  const archivos = listarArchivosJs(join(raizProyecto, 'src'))
    .map((ruta) => relative(raizProyecto, ruta).replaceAll('\\', '/'))
    .filter((ruta) => !ruta.startsWith('src/cli/'));

  const sospechosos = [];

  for (const archivo of archivos) {
    const contenido = readFileSync(join(raizProyecto, archivo), 'utf8');
    const programa = parseAst(contenido);
    for (const nodo of programa.body) {
      if (nodo.type !== 'ExpressionStatement') continue;
      const expresion = nodo.expression;
      if (expresion.type === 'AwaitExpression') {
        sospechosos.push(archivo);
      } else if (expresion.type === 'CallExpression') {
        const llamada = expresion.callee;
        const nombre = llamada.type === 'Identifier' ? llamada.name : null;
        const objeto = llamada.type === 'MemberExpression' ? llamada.object.name : null;
        if (['setTimeout', 'setInterval'].includes(nombre) || ['console', 'process'].includes(objeto)) {
          sospechosos.push(archivo);
        }
      }
    }
  }

  assert.deepEqual(sospechosos, []);
});