import assert from 'node:assert/strict';
import { test } from '@jest/globals';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const repositorio = process.env.ISSUE_REPOSITORY ?? process.cwd();
const modulo = await import(
  pathToFileURL(path.join(repositorio, 'src/analisis/regresion_no_lineal.js'))
);
const { ajusteExponencial, ajustePotencial, regresionNoLineal } = modulo;
const { ErrorParametros } = await import(
  pathToFileURL(path.join(repositorio, 'src/core/errores.js'))
);
const cerca = (actual, esperado, tolerancia = 1e-10) =>
  assert.ok(Math.abs(actual - esperado) <= tolerancia, `${actual} != ${esperado}`);

for (const [nombre, ajustar, x, y, a, b] of [
  [
    'exponencial creciente',
    ajusteExponencial,
    [0, 1, 2, 3],
    [2, 2 * Math.exp(0.5), 2 * Math.exp(1), 2 * Math.exp(1.5)],
    2,
    0.5,
  ],
  [
    'exponencial decreciente',
    ajusteExponencial,
    [-2, -1, 0, 1],
    [3 * Math.exp(2), 3 * Math.exp(1), 3, 3 * Math.exp(-1)],
    3,
    -1,
  ],
  ['potencial', ajustePotencial, [1, 2, 3, 4], [3, 12, 27, 48], 3, 2],
  ['potencial inverso', ajustePotencial, [1, 2, 4, 8], [5, 2.5, 1.25, 0.625], 5, -1],
  ['modelo constante', ajusteExponencial, [0, 1, 2], [7, 7, 7], 7, 0],
]) {
  test(nombre, () => {
    const originalX = [...x],
      originalY = [...y];
    const retorno = ajustar(x, y);
    cerca(retorno.resultado.a, a);
    cerca(retorno.resultado.b, b);
    assert.equal(retorno.convergio, true);
    assert.ok(retorno.meta.tiempo_ms >= 0);
    assert.ok(Array.isArray(retorno.iteraciones));
    assert.deepEqual(x, originalX);
    assert.deepEqual(y, originalY);
  });
}

for (const [nombre, ajustar] of [
  ['exponencial', ajusteExponencial],
  ['potencial', ajustePotencial],
]) {
  for (const [x, y] of [
    [null, [1, 2]],
    [[1], [2]],
    [[1, 2], [2]],
    [
      [1, 2],
      [0, 2],
    ],
    [
      [1, 2],
      [-1, 2],
    ],
    [
      [1, 2],
      [Infinity, 2],
    ],
    [
      [NaN, 2],
      [1, 2],
    ],
    [
      ['1', 2],
      [1, 2],
    ],
    [
      [1, 1],
      [2, 3],
    ],
    [Object.assign(new Array(3), { 0: 1, 2: 3 }), [1, 2, 3]],
  ]) {
    test(`${nombre} rechaza ${JSON.stringify([x, y])}`, () =>
      assert.throws(() => ajustar(x, y), ErrorParametros));
  }
}
test('potencial rechaza abscisas cero o negativas', () => {
  assert.throws(() => ajustePotencial([0, 1], [1, 2]), ErrorParametros);
  assert.throws(() => ajustePotencial([-1, 1], [1, 2]), ErrorParametros);
});
test('dos puntos determinan el modelo', () => {
  const retorno = ajustePotencial([2, 4], [8, 32]);
  cerca(retorno.resultado.a, 2);
  cerca(retorno.resultado.b, 2);
});
test('ajuste logaritmico de observaciones con ruido', () => {
  const retorno = ajusteExponencial([0, 1, 2], [2, 4, 7]);
  cerca(retorno.resultado.b, Math.log(7 / 2) / 2);
  cerca(
    Math.log(retorno.resultado.a),
    (Math.log(2) + Math.log(4) + Math.log(7)) / 3 - retorno.resultado.b,
  );
});
test('Gauss Newton anterior conserva el ajuste lineal', () => {
  const retorno = regresionNoLineal({
    puntos: [
      [0, 1],
      [1, 3],
      [2, 5],
    ],
    modelo: (x, [a, b]) => a + b * x,
    jacobianoModelo: (x) => [1, x],
    parametrosIniciales: [0, 0],
  });
  assert.equal(retorno.convergio, true);
  cerca(retorno.resultado[0], 1);
  cerca(retorno.resultado[1], 2);
});

const entradaGauss = {
  puntos: [
    [0, 1],
    [1, 3],
  ],
  modelo: (x, [a, b]) => a + b * x,
  jacobianoModelo: (x) => [1, x],
  parametrosIniciales: [0, 0],
};
for (const cambio of [
  { puntos: null },
  { modelo: null },
  { jacobianoModelo: null },
  { parametrosIniciales: [] },
  { puntos: [[0, 1]] },
  { tolerancia: 0 },
  { maxIter: 0 },
]) {
  test(`Gauss Newton conserva validacion ${JSON.stringify(cambio)}`, () =>
    assert.throws(() => regresionNoLineal({ ...entradaGauss, ...cambio }), ErrorParametros));
}
