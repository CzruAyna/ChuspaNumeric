import { describe, expect, test } from '@jest/globals';
import * as matrices from '../../../src/matricial/algebra_matrices.js';
import { calcularInversa } from '../../../src/lineales/inversa.js';
import { calcularRango } from '../../../src/matricial/rango.js';
import { gaussPivoteoParcial } from '../../../src/lineales/gauss-pivoteo-parcial.js';
import { regresionNoLineal } from '../../../src/analisis/regresion_no_lineal.js';
import { integracionMonteCarlo } from '../../../src/integracion/monte_carlo.js';
import { simpsonAdaptativo } from '../../../src/integracion/simpson_adaptativo.js';
import { muller } from '../../../src/no-lineales/muller.js';
import { ErrorParametros } from '../../../src/core/errores.js';

describe('Algebra matricial', () => {
  const A = [
    [1, 2, 3],
    [4, 5, 6],
  ];
  test('operaciones rectangulares, transpuesta y escalar', () => {
    expect(matrices.sumaMatrices(A, A)).toEqual([
      [2, 4, 6],
      [8, 10, 12],
    ]);
    expect(matrices.restaMatrices(A, A)).toEqual([
      [0, 0, 0],
      [0, 0, 0],
    ]);
    expect(matrices.multiplicarEscalar(-2, A)).toEqual([
      [-2, -4, -6],
      [-8, -10, -12],
    ]);
    expect(matrices.transpuesta(A)).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
    expect(matrices.transpuesta(matrices.transpuesta(A))).toEqual(A);
    expect(
      matrices.multiplicarMatrices(A, [
        [1, 0],
        [0, 1],
        [1, 1],
      ]),
    ).toEqual([
      [4, 5],
      [10, 11],
    ]);
    expect(A).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(
      matrices.trazaMatriz([
        [1, 2],
        [3, 4],
      ]),
    ).toBe(5);
    expect(
      matrices.potenciaMatriz(
        [
          [1, 1],
          [0, 1],
        ],
        3,
      ),
    ).toEqual([
      [1, 3],
      [0, 1],
    ]);
    expect(matrices.potenciaMatriz([[2]], 0)).toEqual([[1]]);
  });
  test.each([null, [], [[]], [[1], [2, 3]], [[NaN]], [[Infinity]], [['1']], [[1], null]])(
    'rechaza matriz %j',
    (matriz) => {
      expect(() => matrices.transpuesta(matriz)).toThrow();
    },
  );
  test('rechaza operaciones con dimensiones incompatibles', () => {
    expect(() => matrices.trazaMatriz(A)).toThrow();
    expect(() => matrices.potenciaMatriz(A, 2)).toThrow();
    expect(() => matrices.potenciaMatriz([[1]], -1)).toThrow();
    expect(() => matrices.potenciaMatriz([[1]], 1.5)).toThrow();
    expect(() => matrices.sumaMatrices(A, [[1]])).toThrow();
    expect(() => matrices.restaMatrices(A, [[1]])).toThrow();
    expect(() => matrices.multiplicarMatrices(A, A)).toThrow();
    expect(() => matrices.multiplicarEscalar(NaN, A)).toThrow();
    expect(() => matrices.multiplicarEscalar('2', A)).toThrow();
  });
  test.each([
    [
      [
        [0, 1],
        [1, 0],
      ],
      2,
    ],
    [
      [
        [1, 2, 3],
        [2, 4, 6],
      ],
      1,
    ],
    [
      [
        [0, 0, 0],
        [0, 0, 0],
      ],
      0,
    ],
  ])('rango de %j', (A, esperado) => {
    const copia = structuredClone(A);
    expect(calcularRango({ A })).toBe(esperado);
    expect(A).toEqual(copia);
  });
  test.each([null, [], [[]], [[1], [2, 3]], [[NaN]], [[Infinity]], [[1], null]])(
    'rango rechaza %j',
    (A) => {
      expect(() => calcularRango({ A })).toThrow(ErrorParametros);
    },
  );
  test('inversa satisface A por inversa igual a identidad', () => {
    const A = [
      [4, 7],
      [2, 6],
    ];
    for (const entrada of [A, { A }]) {
      const inversa = calcularInversa(entrada);
      expect(inversa.convergio).toBe(true);
      const producto = matrices.multiplicarMatrices(A, inversa.resultado);
      producto.forEach((fila, i) =>
        fila.forEach((valor, j) => expect(valor).toBeCloseTo(Number(i === j), 12)),
      );
    }
    expect(A).toEqual([
      [4, 7],
      [2, 6],
    ]);
    expect(() =>
      calcularInversa([
        [1, 2],
        [2, 4],
      ]),
    ).toThrow();
  });
  test.each([null, [], [[]], [[1, 2]], [[NaN]], [[1], null]])('inversa rechaza %j', (A) => {
    expect(() => calcularInversa(A)).toThrow();
  });
  test('pivoteo parcial resuelve una matriz con cero inicial', () => {
    const res = gaussPivoteoParcial({
      A: [
        [0, 2],
        [1, 1],
      ],
      b: [4, 3],
    });
    expect(res.resultado[0]).toBeCloseTo(1, 12);
    expect(res.resultado[1]).toBeCloseTo(2, 12);
    expect(() =>
      gaussPivoteoParcial({
        A: [
          [0, 0],
          [0, 0],
        ],
        b: [0, 0],
      }),
    ).toThrow();
  });
});

describe('Monte Carlo con ambas firmas publicas', () => {
  const opciones = {
    f: ([x, y]) => x + y,
    limitesInferiores: [0, 0],
    limitesSuperiores: [1, 1],
    nMuestras: 10000,
    semilla: 42,
  };
  test('semilla reproducible y estimacion dentro de cuatro errores estandar', () => {
    const primera = integracionMonteCarlo(opciones);
    const segunda = integracionMonteCarlo(opciones);
    expect(primera.resultado).toBe(segunda.resultado);
    expect(primera.convergio).toBe(true);
    expect(Math.abs(primera.resultado - 1)).toBeLessThan(4 * primera.iteraciones[0].errorEstandar);
    const constante = integracionMonteCarlo({
      ...opciones,
      f: () => 2,
      semilla: null,
      nMuestras: 2,
    });
    expect(constante.resultado).toBe(2);
    expect(constante.iteraciones[0].errorEstandar).toBe(0);
    const anterior = integracionMonteCarlo(() => 2, 0, 3, 2);
    expect(anterior.valor).toBe(6);
    expect(anterior.errorEstandar).toBe(0);
  });
  test.each([
    { f: null },
    { limitesInferiores: [] },
    { limitesSuperiores: [] },
    { limitesInferiores: null },
    { limitesSuperiores: null },
    { limitesSuperiores: [1] },
    { limitesInferiores: [NaN, 0] },
    { limitesSuperiores: [1, Infinity] },
    { limitesSuperiores: [0, 1] },
    { nMuestras: 0 },
    { nMuestras: 1.5 },
  ])('rechaza parametros %j', (cambio) => {
    expect(() => integracionMonteCarlo({ ...opciones, ...cambio })).toThrow(ErrorParametros);
  });
  test('la firma anterior conserva sus validaciones', () => {
    expect(() => integracionMonteCarlo((x) => x, '0', 1)).toThrow();
    expect(() => integracionMonteCarlo((x) => x, 1, 0)).toThrow();
    expect(() => integracionMonteCarlo((x) => x, 0, 1, 0)).toThrow();
    expect(() => integracionMonteCarlo(() => NaN, 0, 1, 2)).toThrow();
  });
});

describe('Gauss-Newton', () => {
  const opciones = {
    puntos: [
      [0, 2],
      [1, 5],
      [2, 8],
    ],
    modelo: (x, [a, b]) => a + b * x,
    jacobianoModelo: (x) => [1, x],
    parametrosIniciales: [0, 0],
  };
  test('recupera una recta y registra su convergencia', () => {
    const res = regresionNoLineal(opciones);
    expect(res.convergio).toBe(true);
    expect(res.resultado[0]).toBeCloseTo(2, 10);
    expect(res.resultado[1]).toBeCloseTo(3, 10);
    expect(opciones.parametrosIniciales).toEqual([0, 0]);
    expect(regresionNoLineal({ ...opciones, maxIter: 1 }).convergio).toBe(false);
  });
  test.each([
    { puntos: [] },
    { modelo: null },
    { jacobianoModelo: null },
    { parametrosIniciales: [] },
    { puntos: [[0, 1]] },
    { tolerancia: 0 },
    { maxIter: 0 },
  ])('rechaza configuracion %j', (cambio) => {
    expect(() => regresionNoLineal({ ...opciones, ...cambio })).toThrow(ErrorParametros);
  });
  test('rechaza un jacobiano singular', () => {
    expect(() => regresionNoLineal({ ...opciones, jacobianoModelo: () => [0, 0] })).toThrow();
  });
});

describe('Cuadratura adaptativa y Muller', () => {
  test('Simpson integra seno con su valor analitico', () => {
    const res = simpsonAdaptativo({ f: Math.sin, a: 0, b: Math.PI, tolerancia: 1e-10 });
    expect(res.resultado).toBeCloseTo(2, 10);
    expect(res.convergio).toBe(true);
    const limitado = simpsonAdaptativo({
      f: Math.exp,
      a: 0,
      b: 1,
      tolerancia: 1e-15,
      maxProfundidad: 0,
    });
    expect(limitado.convergio).toBe(false);
    expect(limitado.warnings.length).toBeGreaterThan(0);
    expect(simpsonAdaptativo({ f: (x) => x, a: 0, b: 1 }).resultado).toBeCloseTo(0.5, 12);
  });
  test.each([
    { tolerancia: 0 },
    { tolerancia: NaN },
    { tolerancia: '1' },
    { maxProfundidad: -1 },
    { maxProfundidad: 1.5 },
    { f: () => NaN },
    { f: null },
    { a: 2 },
  ])('Simpson rechaza %j', (cambio) => {
    expect(() => simpsonAdaptativo({ f: Math.sin, a: 0, b: 1, ...cambio })).toThrow(
      ErrorParametros,
    );
  });
  test('Muller converge a raiz cuadrada de dos', () => {
    const opciones = { f: (x) => x * x - 2, x0: 0, x1: 1, x2: 2 };
    expect(muller(opciones).resultado).toBeCloseTo(Math.sqrt(2), 10);
    expect(() => muller({ ...opciones, x0: 1 })).toThrow(ErrorParametros);
    expect(() => muller({ ...opciones, maxIter: 1 })).toThrow();
    expect(() => muller({ ...opciones, f: () => 1 })).toThrow();
  });
});
