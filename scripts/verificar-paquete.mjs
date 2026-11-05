import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.env.npm_execpath;
assert.ok(npm, 'Ejecutar con npm run test:package.');
const temporal = mkdtempSync(join(tmpdir(), 'chuspanumeric-paquete-'));
const destino = join(temporal, 'consumidor');
mkdirSync(destino);
writeFileSync(join(destino, 'package.json'), JSON.stringify({ private: true, type: 'module' }));

function ejecutar(argumentos, directorio) {
  const proceso = spawnSync(process.execPath, argumentos, {
    cwd: directorio,
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.ifError(proceso.error);
  assert.equal(proceso.status, 0, proceso.stderr || proceso.stdout);
  return proceso.stdout;
}

const paquetes = JSON.parse(ejecutar([npm, 'pack', '--json', '--pack-destination', temporal], raiz));
const paquete = paquetes[0];
const archivos = new Set(paquete.files.map((archivo) => archivo.path));
for (const necesario of [
  'dist/chuspanumeric.cjs',
  'dist/chuspanumeric.esm.js',
  'src/cli/trazo-cli.js',
  'src/cli/grafico_ascii.js',
  'src/cli/verificar_version.js',
]) {
  assert.ok(archivos.has(necesario), `Falta ${necesario} en el paquete.`);
}
ejecutar([npm, 'install', '--ignore-scripts', '--no-audit', '--no-fund', join(temporal, paquete.filename)], destino);
const prueba = join(destino, 'comprobar.mjs');
writeFileSync(prueba, `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'chuspanumeric';
const cjs = createRequire(import.meta.url)('chuspanumeric');
const matriz = [[1, 2], [3, 4]];
assert.equal(esm.det2x2(matriz), -2);
assert.equal(cjs.det2x2(matriz), -2);
assert.equal(typeof esm.default.lineales.gauss, 'function');
assert.equal(typeof cjs.default.lineales.gauss, 'function');
`);
ejecutar([prueba], destino);
const rutaInstalada = join(destino, 'node_modules', 'chuspanumeric');
const manifiesto = JSON.parse(readFileSync(join(rutaInstalada, 'package.json'), 'utf8'));
const ayuda = ejecutar([join(rutaInstalada, manifiesto.bin.chuspanumeric), '--help'], destino);
assert.match(ayuda, /ChuspaNumeric CLI/);
console.log('Paquete instalado: ESM, CommonJS y CLI comprobados.');
console.log(`Evidencia temporal: ${temporal}`);
