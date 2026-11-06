import assert from 'node:assert/strict';
import { test } from '@jest/globals';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const repositorio = process.env.ISSUE_REPOSITORY ?? process.cwd();
const { eulerMejorado } = await import(
  pathToFileURL(path.join(repositorio, 'src/edo/euler-mejorado.js'))
);
const { ErrorParametros } = await import(
  pathToFileURL(path.join(repositorio, 'src/core/errores.js'))
);
const base = { f: (_x, y) => y, x0: 0, y0: 1, h: 0.1, xFinal: 0.1 };
const cerca = (actual, esperado, tolerancia = 1e-12) =>
  assert.ok(Math.abs(actual - esperado) <= tolerancia, `${actual} != ${esperado}`);

test('un paso conserva predictor, corrector y diferencia absoluta', () => {
  const r = eulerMejorado(base);
  assert.deepEqual(r.resultado[0], [0, 1]);
  cerca(r.resultado[1][1], 1.105);
  cerca(r.iteraciones[0].predictor, 1.1);
  cerca(r.iteraciones[0].corrector, 1.105);
  cerca(r.erroresEstimados[0], 0.005);
  cerca(r.errorEstimadoMaximo, 0.005);
});

test('varios pasos reportan errores en orden y el maximo correcto', () => {
  const r = eulerMejorado({ ...base, xFinal: 0.2 });
  cerca(r.resultado.at(-1)[1], 1.221025);
  cerca(r.erroresEstimados[0], 0.005);
  cerca(r.erroresEstimados[1], 0.005525);
  cerca(r.errorEstimadoMaximo, 0.005525);
});

test('derivada cero conserva la solucion y estima error cero', () => {
  const r = eulerMejorado({ ...base, f: () => 0, xFinal: 1 });
  assert.ok(r.resultado.every(([, y]) => y === 1));
  assert.ok(r.erroresEstimados.every((error) => error === 0));
  assert.equal(r.errorEstimadoMaximo, 0);
});

test('derivada constante negativa tiene estimacion cero', () => {
  const r = eulerMejorado({ ...base, f: () => -3, y0: 5, h: 0.25, xFinal: 1 });
  cerca(r.resultado.at(-1)[1], 2);
  assert.equal(r.errorEstimadoMaximo, 0);
});

test('derivada dependiente de x usa ambas pendientes', () => {
  const r = eulerMejorado({ ...base, f: (x) => x, y0: 0, h: 0.2, xFinal: 0.2 });
  cerca(r.resultado.at(-1)[1], 0.02);
  cerca(r.erroresEstimados[0], 0.02);
});

test('estimacion positiva para una solucion decreciente', () => {
  const r = eulerMejorado({ ...base, f: (_x, y) => -y });
  cerca(r.resultado.at(-1)[1], 0.905);
  cerca(r.erroresEstimados[0], 0.005);
  assert.ok(r.erroresEstimados[0] >= 0);
});

test('trayectoria, errores e iteraciones quedan alineados y conservan el contrato', () => {
  const r = eulerMejorado({ ...base, xFinal: 1 });
  assert.equal(r.resultado.length, r.iteraciones.length + 1);
  assert.equal(r.erroresEstimados.length, r.iteraciones.length);
  r.iteraciones.forEach((paso, indice) => {
    assert.equal(paso.errorEstimado, r.erroresEstimados[indice]);
    assert.deepEqual(r.resultado[indice + 1], [paso.x, paso.corrector]);
  });
  assert.equal(r.errorEstimadoMaximo, Math.max(...r.erroresEstimados));
  assert.equal(r.convergio, true);
  assert.equal(r.meta.metodo, 'Euler mejorado (Heun)');
  assert.ok(r.meta.tiempo_ms >= 0);
  assert.deepEqual(r.meta.parametros, { x0: 0, y0: 1, h: 0.1, xFinal: 1 });
  const serializado = JSON.parse(JSON.stringify(r));
  assert.deepEqual(serializado.erroresEstimados, r.erroresEstimados);
  assert.equal(serializado.errorEstimadoMaximo, r.errorEstimadoMaximo);
});

test('reducir h a la mitad divide por cuatro la primera estimacion', () => {
  const grueso = eulerMejorado({ ...base, h: 0.2, xFinal: 0.2 });
  const fino = eulerMejorado(base);
  cerca(grueso.erroresEstimados[0] / fino.erroresEstimados[0], 4);
});

test('mantiene la malla previa cuando h no divide el intervalo', () => {
  const r = eulerMejorado({ ...base, f: () => 1, h: 0.3, xFinal: 1 });
  assert.equal(r.resultado.length, 4);
  cerca(r.resultado.at(-1)[0], 0.9);
  cerca(r.resultado.at(-1)[1], 1.9);
});

test('sin pasos calculados devuelve errores vacios y maximo cero', () => {
  const r = eulerMejorado({ ...base, h: 1 });
  assert.deepEqual(r.resultado, [[0, 1]]);
  assert.deepEqual(r.erroresEstimados, []);
  assert.equal(r.errorEstimadoMaximo, 0);
});

test('no modifica las opciones recibidas', () => {
  const opciones = { ...base };
  const copia = { ...opciones };
  eulerMejorado(opciones);
  assert.deepEqual(opciones, copia);
});

test('no declara convergencia para pendientes no finitas', () => {
  for (const valor of [Infinity, NaN]) {
    const r = eulerMejorado({ ...base, f: () => valor });
    assert.equal(r.convergio, false);
    assert.equal(r.errorEstimadoMaximo, Infinity);
    assert.equal(r.erroresEstimados[0], Infinity);
    assert.equal(Number.isFinite(r.resultado.at(-1)[1]), false);
  }
});

test('propaga el error de ejecucion de la derivada', () => {
  const error = new Error('derivada no evaluable');
  assert.throws(
    () =>
      eulerMejorado({
        ...base,
        f: () => {
          throw error;
        },
      }),
    (recibido) => recibido === error,
  );
});

test('rechaza derivadas que no se pueden usar como funciones numericas', () => {
  for (const f of [() => '1', () => null, () => undefined, async () => 1]) {
    assert.throws(() => eulerMejorado({ ...base, f }), ErrorParametros);
  }
  assert.throws(() => eulerMejorado({ ...base, f: class Derivada {} }), TypeError);
});

for (const [nombre, f] of [
  ['null', null],
  ['undefined', undefined],
  ['numero', 1],
  ['texto', 'y'],
  ['objeto', {}],
  ['arreglo', []],
  ['booleano', true],
]) {
  test(`rechaza f ${nombre}`, () =>
    assert.throws(() => eulerMejorado({ ...base, f }), ErrorParametros));
}

for (const [nombre, cambio] of [
  ['x0 NaN', { x0: NaN }],
  ['y0 infinito', { y0: Infinity }],
  ['h cero', { h: 0 }],
  ['h negativo', { h: -1 }],
  ['extremo igual', { xFinal: 0 }],
  ['extremo anterior', { xFinal: -1 }],
  ['h texto', { h: '0.1' }],
  ['x0 texto', { x0: '0' }],
  ['xFinal NaN', { xFinal: NaN }],
]) {
  test(`rechaza ${nombre}`, () =>
    assert.throws(() => eulerMejorado({ ...base, ...cambio }), ErrorParametros));
}
