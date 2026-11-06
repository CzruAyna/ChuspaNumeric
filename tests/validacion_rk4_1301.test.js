import assert from 'node:assert/strict';
import { test } from '@jest/globals';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const repositorio = process.env.ISSUE_REPOSITORY ?? process.cwd();
const { rungeKutta4 } = await import(
  pathToFileURL(path.join(repositorio, 'src/edo/runge_kutta_4.js'))
);
const { ErrorParametros, ErrorConvergencia } = await import(
  pathToFileURL(path.join(repositorio, 'src/core/errores.js'))
);
const base = { f: (_x, y) => y, x0: 0, y0: 1, h: 0.5, xFinal: 1 };
const cerca = (a, b, tol = 1e-7) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);

test('modo clasico conserva puntos y valores', () => {
  const r = rungeKutta4({ ...base, h: 0.1 });
  assert.equal(r.resultado.length, 11);
  cerca(r.resultado.at(-1)[1], Math.E, 3e-6);
  assert.deepEqual(r.resultado[0], [0, 1]);
  assert.equal(r.iteraciones[0].k1, 1);
  assert.ok(r.meta.tiempo_ms >= 0);
});
test('adaptativo llega al extremo y reduce el paso', () => {
  const r = rungeKutta4({ ...base, tolerancia: 1e-9, pasoMinimo: 1e-5, pasoMaximo: 0.5 });
  assert.equal(r.resultado.at(-1)[0], 1);
  cerca(r.resultado.at(-1)[1], Math.E);
  assert.ok(r.iteraciones.some((p) => p.h < 0.5));
  for (const p of r.iteraciones) {
    assert.ok(p.h >= 1e-5 && p.h <= 0.5);
    assert.ok(p.errorEstimado <= 1e-9);
  }
});
test('controla una EDO no autonoma con solucion conocida', () => {
  const r = rungeKutta4({ ...base, f: (x, y) => x + y, h: 0.4, xFinal: 2, tolerancia: 1e-9 });
  cerca(r.resultado.at(-1)[1], 2 * Math.exp(2) - 3, 2e-7);
  assert.equal(r.resultado.at(-1)[0], 2);
});
test('menor tolerancia mejora el resultado', () => {
  const grueso = rungeKutta4({ ...base, tolerancia: 1e-3 });
  const fino = rungeKutta4({ ...base, tolerancia: 1e-10 });
  assert.ok(
    Math.abs(fino.resultado.at(-1)[1] - Math.E) < Math.abs(grueso.resultado.at(-1)[1] - Math.E),
  );
});
test('puede aumentar el paso en una derivada constante', () => {
  const r = rungeKutta4({
    ...base,
    f: () => 2,
    h: 0.1,
    tolerancia: 1e-9,
    pasoMinimo: 0.01,
    pasoMaximo: 0.4,
  });
  assert.ok(r.iteraciones.some((p) => p.h > 0.1));
  cerca(r.resultado.at(-1)[1], 3);
});
test('reserva un paso final valido sin sobrepasar el extremo', () => {
  const r = rungeKutta4({
    ...base,
    f: () => 1,
    h: 1,
    xFinal: 1.05,
    tolerancia: 1e-8,
    pasoMinimo: 0.1,
    pasoMaximo: 1,
  });
  assert.equal(r.resultado.at(-1)[0], 1.05);
  for (const p of r.iteraciones) {
    assert.ok(p.h >= 0.1);
    assert.ok(p.h <= 1);
    assert.ok(p.x <= 1.05);
  }
});
test('respeta un maximo inferior al h inicial', () => {
  const r = rungeKutta4({ ...base, tolerancia: 1e-7, pasoMinimo: 0.001, pasoMaximo: 0.1 });
  assert.ok(r.iteraciones.every((p) => p.h <= 0.1));
});
test('acepta un unico paso final mayor que el sugerido dentro de los limites', () => {
  const r = rungeKutta4({
    ...base,
    f: () => 1,
    h: 0.1,
    xFinal: 0.15,
    tolerancia: 1e-8,
    pasoMinimo: 0.1,
    pasoMaximo: 0.2,
  });
  assert.equal(r.resultado.at(-1)[0], 0.15);
  cerca(r.resultado.at(-1)[1], 1.15);
});
test('rechaza sin repetir un ultimo paso imposible de subdividir', () => {
  assert.throws(
    () =>
      rungeKutta4({
        ...base,
        h: 0.1,
        xFinal: 0.15,
        tolerancia: 1e-16,
        pasoMinimo: 0.1,
        pasoMaximo: 0.2,
      }),
    ErrorConvergencia,
  );
});
test('no declara convergencia si el paso minimo impide la tolerancia', () => {
  assert.throws(
    () => rungeKutta4({ ...base, tolerancia: 1e-16, pasoMinimo: 0.5, pasoMaximo: 0.5 }),
    ErrorConvergencia,
  );
});
test('rechaza un intervalo incompatible con los limites', () => {
  assert.throws(
    () =>
      rungeKutta4({ ...base, xFinal: 0.05, tolerancia: 1e-8, pasoMinimo: 0.1, pasoMaximo: 0.2 }),
    ErrorConvergencia,
  );
});
test('rechaza avances inferiores a la precision de x', () => {
  assert.throws(
    () =>
      rungeKutta4({
        ...base,
        x0: 1e16,
        xFinal: 1e16 + 2,
        h: 0.1,
        tolerancia: 1e-8,
        pasoMinimo: 0.01,
        pasoMaximo: 0.1,
      }),
    ErrorConvergencia,
  );
});
for (const [nombre, opciones] of [
  ['cero', { tolerancia: 0 }],
  ['negativa', { tolerancia: -1 }],
  ['infinita', { tolerancia: Infinity }],
  ['NaN', { tolerancia: NaN }],
  ['texto', { tolerancia: '1e-4' }],
  ['minimo nulo', { tolerancia: 1e-4, pasoMinimo: 0 }],
  ['maximo negativo', { tolerancia: 1e-4, pasoMaximo: -1 }],
  ['limites invertidos', { tolerancia: 1e-4, pasoMinimo: 1, pasoMaximo: 0.1 }],
  ['derivada infinita', { tolerancia: 1e-4, f: () => Infinity }],
  ['derivada texto', { tolerancia: 1e-4, f: () => '1' }],
]) {
  test(`rechaza ${nombre}`, () =>
    assert.throws(() => rungeKutta4({ ...base, ...opciones }), ErrorParametros));
}

test('limites estrechos admiten una particion valida', () => {
  const r = rungeKutta4({
    ...base,
    f: () => 1,
    h: 0.5,
    xFinal: 1.2,
    tolerancia: 1e-9,
    pasoMinimo: 0.5,
    pasoMaximo: 0.6,
  });
  assert.equal(r.resultado.at(-1)[0], 1.2);
  cerca(r.resultado.at(-1)[1], 2.2);
  assert.ok(r.iteraciones.every((p) => p.h >= 0.5 && p.h <= 0.6));
});

test('detecta intervalos que no admiten una particion dentro de los limites', () => {
  assert.throws(
    () =>
      rungeKutta4({
        ...base,
        f: () => 1,
        xFinal: 0.7,
        tolerancia: 1e-9,
        pasoMinimo: 0.5,
        pasoMaximo: 0.6,
      }),
    ErrorConvergencia,
  );
});

test('no repite un paso rechazado cuando la particion impide reducirlo', () => {
  let evaluaciones = 0;
  assert.throws(
    () =>
      rungeKutta4({
        ...base,
        f: (_x, y) => {
          evaluaciones++;
          return y;
        },
        h: 0.5,
        xFinal: 1.2,
        tolerancia: 1e-16,
        pasoMinimo: 0.5,
        pasoMaximo: 0.6,
      }),
    ErrorConvergencia,
  );
  assert.ok(evaluaciones <= 24);
});

test('redondeo del ultimo paso conserva el extremo y los limites', () => {
  const r = rungeKutta4({
    ...base,
    f: () => 1,
    h: 0.1,
    xFinal: 0.3,
    tolerancia: 1e-9,
    pasoMinimo: 0.1,
    pasoMaximo: 0.1,
  });
  assert.equal(r.resultado.at(-1)[0], 0.3);
  cerca(r.resultado.at(-1)[1], 1.3);
  assert.ok(r.iteraciones.every((p) => p.h >= 0.1 && p.h <= 0.1));
});

test('ajusta un h inicial menor al paso minimo', () => {
  const r = rungeKutta4({
    ...base,
    f: () => 1,
    h: 0.001,
    tolerancia: 1e-9,
    pasoMinimo: 0.1,
    pasoMaximo: 0.2,
  });
  assert.equal(r.resultado.at(-1)[0], 1);
  cerca(r.resultado.at(-1)[1], 2);
  assert.ok(r.iteraciones.every((p) => p.h >= 0.1 && p.h <= 0.2));
});

test('el modo fijo conserva su malla cuando h no divide el intervalo', () => {
  const r = rungeKutta4({ ...base, f: () => 1, h: 0.3 });
  assert.equal(r.resultado.length, 4);
  cerca(r.resultado.at(-1)[0], 0.9);
  cerca(r.resultado.at(-1)[1], 1.9);
});

test('rechaza condiciones iniciales invalidas', () => {
  for (const opciones of [
    { f: null },
    { x0: NaN },
    { y0: Infinity },
    { h: 0 },
    { h: Infinity },
    { xFinal: 0 },
    { tolerancia: null },
  ]) {
    assert.throws(() => rungeKutta4({ ...base, ...opciones }), ErrorParametros);
  }
});

test('rechaza desbordamiento en los calculos de ambos modos', () => {
  for (const opciones of [{}, { tolerancia: 1e-6 }]) {
    assert.throws(
      () => rungeKutta4({ ...base, f: () => Number.MAX_VALUE, h: 2, xFinal: 2, ...opciones }),
      ErrorParametros,
    );
  }
});
