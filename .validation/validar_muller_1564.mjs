import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

const cargar = (archivo) => import(pathToFileURL(path.resolve(archivo)));
const { muller } = await cargar('src/no-lineales/muller.js');
const { ErrorParametros, ErrorDominio, ErrorDivergencia, ErrorConvergencia } = await cargar(
  'src/core/errores.js',
);
const base = { f: (x) => x * x - 4, x0: 0, x1: 1, x2: 3, tolerancia: 1e-8 };

for (const [etiqueta, entrada] of Object.entries({
  omitida: undefined,
  nula: null,
  vector: [0, 1, 3],
  primitiva: true,
})) {
  test('rechaza opciones ' + etiqueta, () =>
    assert.throws(() => muller(entrada), { name: 'ErrorParametros', message: /opciones/ }));
}

for (const [caso, cambio, campo] of [
  ['función ausente', { f: undefined }, /funci.n/],
  ['NaN', { x0: NaN }, /x0/],
  ['infinito', { x1: Infinity }, /x1/],
  ['texto numérico', { x2: '3' }, /x2/],
  ['símbolo', { x2: Symbol('x2') }, /x2/],
  ['puntos repetidos', { x2: 0 }, /distintos/],
  ['distancia desbordada', { x0: -Number.MAX_VALUE, x2: Number.MAX_VALUE }, /distancias/],
  ['tolerancia cero', { tolerancia: 0 }, /tolerancia/],
  ['tolerancia no finita', { tolerancia: Infinity }, /tolerancia/],
  ['iteraciones nulas', { maxIter: 0 }, /maxIter/],
  ['iteraciones fraccionarias', { maxIter: 2.5 }, /maxIter/],
  ['iteraciones fuera del rango entero seguro', { maxIter: 2 ** 53 }, /maxIter/],
  ['función con resultado NaN', { f: () => NaN }, /f\(3\)/],
  ['función con resultado objeto', { f: () => ({}) }, /f\(3\)/],
  ['función indefinida en la nueva aproximación', { f: (x) => (x === 2 ? Infinity : x * x - 4) }, /f\(2\)/],
]) {
  test('rechaza ' + caso, () =>
    assert.throws(() => muller({ ...base, ...cambio }), (error) =>
      error instanceof ErrorParametros && campo.test(error.message)));
}

test('conserva el contrato del resultado y admite puntos sin ordenar', () => {
  const resultado = muller({ ...base, x0: 3, x1: 0, x2: 1 });
  assert.equal(resultado.convergio, true);
  assert.equal(resultado.resultado, 2);
  assert.deepEqual(Object.keys(resultado).sort(), ['convergio', 'iteraciones', 'mensaje', 'meta', 'resultado']);
  assert.deepEqual(resultado.meta.parametros, { x0: 3, x1: 0, x2: 1, maxIter: 100, tolerancia: 1e-8 });
  assert(Number.isFinite(resultado.meta.tiempo_ms));
  assert.deepEqual(Object.keys(resultado.iteraciones[0]).sort(), ['error', 'fxNuevo', 'n', 'x0', 'x1', 'x2', 'xNuevo']);
});
test('reconoce que el último punto inicial es una raíz doble', () => {
  const resultado = muller({ ...base, f: (x) => (x - 2) ** 2, x2: 2 });
  assert.equal(resultado.resultado, 2);
  assert.equal(resultado.iteraciones[0].error, 0);
});
test('converge a la raíz real de cos(x) - x', () => {
  const resultado = muller({ ...base, f: (x) => Math.cos(x) - x, x1: 0.7, x2: 1 });
  assert(Math.abs(resultado.resultado - 0.7390851332151607) < 1e-8);
  assert(Math.abs(Math.cos(resultado.resultado) - resultado.resultado) < 1e-8);
});
test('rechaza una parábola sin raíces reales', () =>
  assert.throws(() => muller({ ...base, f: (x) => x * x + 1 }), ErrorDominio));
test('rechaza un denominador nulo', () =>
  assert.throws(() => muller({ ...base, f: () => 2 }), ErrorDominio));
test('detecta desbordamiento durante el cálculo', () =>
  assert.throws(() => muller({ ...base, f: (x) => (x === 1 ? -Number.MAX_VALUE : Number.MAX_VALUE) }), ErrorDivergencia));
test('conserva ErrorConvergencia al agotar las iteraciones', () =>
  assert.throws(() => muller({ ...base, maxIter: 1, f: (x) => Math.cos(x) - x, x2: 1.5 }), ErrorConvergencia));
test('rechaza un paso redondeado a cero cuando queda un residuo significativo', () =>
  assert.throws(() => muller({ ...base, f: (x) => (x === 3 ? 1 : -1e120) }), (error) =>
    error instanceof ErrorConvergencia && /estanc/.test(error.message)));
