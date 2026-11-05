import { describe, expect, test } from '@jest/globals';
import * as estadistica from '../../../src/utils/estadistica.js';
import * as unidades from '../../../src/utils/unidades.js';
import * as complejos from '../../../src/utils/numeros_complejos.js';
import * as typed from '../../../src/utils/matriz_typed.js';
import * as redondeo from '../../../src/utils/redondeo.js';
import { memoizarFuncion } from '../../../src/utils/memoizar.js';
import { parsearExpresion } from '../../../src/utils/parser_expresiones.js';
import { formatearTablaIteraciones } from '../../../src/utils/tabla_resultado.js';
import { ErrorParametros } from '../../../src/core/errores.js';

describe('Estadistica con datos conocidos', () => {
  test('media, varianzas y desviaciones no alteran los datos', () => {
    const datos = [4, 1, 3, 2];
    expect(estadistica.media(datos)).toBe(2.5);
    expect(estadistica.varianza(datos, true)).toBe(1.25);
    expect(estadistica.varianza(datos)).toBeCloseTo(5 / 3, 12);
    expect(estadistica.desviacionEstandar(datos, true)).toBeCloseTo(Math.sqrt(1.25), 12);
    expect(estadistica.desviacionEstandar(datos)).toBeCloseTo(Math.sqrt(5 / 3), 12);
    expect(estadistica.mediana(datos)).toBe(2.5);
    expect(estadistica.mediana([3, 1, 2])).toBe(2);
    expect(estadistica.moda([1, 1, 2, 2, 3])).toEqual([1, 2]);
    expect(estadistica.moda([1, 2, 3])).toEqual([]);
    expect(estadistica.rangoIntercuartilico([1, 2, 3, 4])).toBe(2);
    expect(estadistica.rangoIntercuartilico([1, 2, 3, 4, 5, 6, 7])).toBe(4);
    expect(estadistica.rangoIntercuartilico([7])).toBe(0);
    expect(estadistica.varianza([7], true)).toBe(0);
    expect(() => estadistica.varianza([7])).toThrow();
    expect(datos).toEqual([4, 1, 3, 2]);
  });
  test.each([null, [], [NaN], [Infinity], ['1']])('rechaza datos invalidos %j', (datos) => {
    for (const calcular of Object.values(estadistica)) expect(() => calcular(datos)).toThrow();
  });
});

describe('Conversiones fisicas', () => {
  test('longitud, presion y energia y sus conversiones inversas', () => {
    expect(unidades.convertirLongitud(1, 'mi', 'km')).toBeCloseTo(1.609344, 12);
    expect(unidades.convertirLongitud(12, 'in', 'ft')).toBeCloseTo(1, 12);
    expect(unidades.convertirPresion(1, 'atm', 'Pa')).toBe(101325);
    expect(unidades.convertirEnergia(1, 'kWh', 'J')).toBe(3600000);
    expect(unidades.convertirEnergia(4184, 'J', 'kcal')).toBe(1);
    const disponibles = unidades.unidadesDisponibles();
    for (const [categoria, convertir] of [
      ['longitud', unidades.convertirLongitud],
      ['presion', unidades.convertirPresion],
      ['energia', unidades.convertirEnergia],
    ]) {
      const opciones = disponibles[categoria];
      for (const desde of opciones)
        for (const hasta of opciones) {
          expect(convertir(convertir(7, desde, hasta), hasta, desde)).toBeCloseTo(7, 10);
        }
    }
  });
  test.each([
    ['C', 0],
    ['F', 32],
    ['K', 273.15],
  ])('cero Celsius expresado en %s', (desde, valor) => {
    expect(unidades.convertirTemperatura(valor, desde, 'C')).toBeCloseTo(0, 10);
    expect(unidades.convertirTemperatura(valor, desde, 'F')).toBeCloseTo(32, 10);
    expect(unidades.convertirTemperatura(valor, desde, 'K')).toBeCloseTo(273.15, 10);
  });
  test.each([
    [unidades.convertirLongitud, 'm'],
    [unidades.convertirPresion, 'Pa'],
    [unidades.convertirEnergia, 'J'],
    [unidades.convertirTemperatura, 'C'],
  ])('conversion rechaza valor o unidad invalida', (convertir, unidad) => {
    for (const valor of [NaN, Infinity, '1'])
      expect(() => convertir(valor, unidad, unidad)).toThrow(ErrorParametros);
    expect(() => convertir(1, 'inexistente', unidad)).toThrow(ErrorParametros);
    expect(() => convertir(1, unidad, 'inexistente')).toThrow(ErrorParametros);
  });
  test('rechaza temperaturas inferiores al cero absoluto', () => {
    expect(() => unidades.convertirTemperatura(-1, 'K', 'C')).toThrow(ErrorParametros);
  });
});

describe('Aritmetica compleja', () => {
  const z = { re: 3, im: 4 };
  test('identidades de modulo, conjugado, producto y division', () => {
    expect(complejos.moduloComplejo(z)).toBe(5);
    expect(complejos.sumaComplejos(z, { re: 1, im: -4 })).toEqual({ re: 4, im: 0 });
    expect(complejos.restaComplejos(z, { re: 1, im: 1 })).toEqual({ re: 2, im: 3 });
    expect(complejos.productoComplejos(z, complejos.conjugadoComplejo(z))).toEqual({
      re: 25,
      im: 0,
    });
    expect(complejos.divisionComplejos(z, z)).toEqual({ re: 1, im: 0 });
    expect(complejos.argumentoComplejo({ re: 0, im: 1 })).toBeCloseTo(Math.PI / 2, 12);
    expect(() => complejos.divisionComplejos(z, { re: 0, im: 0 })).toThrow();
  });
  test.each([null, 3, {}, { re: '1', im: 0 }, { re: 0, im: NaN }, { re: Infinity, im: 0 }])(
    'rechaza complejo invalido %j',
    (malo) => {
      expect(() => complejos.moduloComplejo(malo)).toThrow(ErrorParametros);
      expect(() => complejos.productoComplejos(z, malo)).toThrow(ErrorParametros);
    },
  );
});

describe('Matrices tipadas', () => {
  test('conversion, lectura y escritura por filas', () => {
    const original = [
      [1, 2],
      [3, 4],
    ];
    const matriz = typed.desdeArreglo(original);
    expect(matriz.datos).toBeInstanceOf(Float64Array);
    expect([...matriz.datos]).toEqual([1, 2, 3, 4]);
    expect(typed.obtener(matriz, 1, 0)).toBe(3);
    typed.asignar(matriz, 0, 1, 8);
    expect(typed.aArreglo(matriz)).toEqual([
      [1, 8],
      [3, 4],
    ]);
    expect(original).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(typed.aArreglo(typed.crearMatrizTyped(1, 2))).toEqual([[0, 0]]);
    for (const [i, j] of [
      [-1, 0],
      [0, -1],
      [2, 0],
      [0, 2],
      [0.5, 0],
      [0, 0.5],
    ]) {
      expect(() => typed.obtener(matriz, i, j)).toThrow(ErrorParametros);
      expect(() => typed.asignar(matriz, i, j, 7)).toThrow(ErrorParametros);
    }
  });
  test.each([null, [], [1], [[1], null], [[1], [1, 2]], [[]]])(
    'rechaza matriz invalida %j',
    (matriz) => {
      expect(() => typed.desdeArreglo(matriz)).toThrow(ErrorParametros);
    },
  );
  test.each([0, -1, 1.5, NaN])('rechaza dimension %s', (dimension) => {
    expect(() => typed.crearMatrizTyped(dimension, 1)).toThrow(ErrorParametros);
    expect(() => typed.crearMatrizTyped(1, dimension)).toThrow(ErrorParametros);
  });
});

test('memoizacion conserva resultados y permite vaciar la cache', () => {
  let llamadas = 0;
  const funcion = memoizarFuncion((x) => {
    llamadas++;
    return x * x;
  });
  expect(funcion(2)).toBe(4);
  expect(funcion(2)).toBe(4);
  expect(funcion(3)).toBe(9);
  expect(llamadas).toBe(2);
  expect(funcion.estadisticas()).toEqual({ entradas: 2, evaluacionesReales: 2 });
  funcion.limpiarCache();
  expect(funcion(2)).toBe(4);
  expect(llamadas).toBe(3);
  expect(() => memoizarFuncion(null)).toThrow(ErrorParametros);
});

test('expresiones matematicas reales y validaciones', () => {
  expect(parsearExpresion('sin(x)^2 + cos(x)^2')(0.7)).toBeCloseTo(1, 12);
  for (const invalido of [null, '', '   ', 'x + )'])
    expect(() => parsearExpresion(invalido)).toThrow();
  expect(() => parsearExpresion('x')('1')).toThrow();
  expect(() => parsearExpresion('1/0')(1)).toThrow();
});

test('redondeo y tablas conservan valores numericos y texto', () => {
  expect(redondeo.redondearDecimales(3.14159, 3)).toBe(3.142);
  expect(redondeo.truncarDecimales(-3.14159, 3)).toBe(-3.141);
  expect(redondeo.cifrasSignificativas(0.001234, 3)).toBe(0.00123);
  expect(redondeo.esIgualConTolerancia(1, 1.001, 0.01)).toBe(true);
  expect(redondeo.esIgualConTolerancia(1, 2, 0.01)).toBe(false);
  for (const funcion of [redondeo.redondearDecimales, redondeo.truncarDecimales]) {
    expect(() => funcion(1, -1)).toThrow(ErrorParametros);
    expect(() => funcion(1, 1.5)).toThrow(ErrorParametros);
  }
  expect(formatearTablaIteraciones([])).toBe('');
  expect(formatearTablaIteraciones(null)).toBe('');
  const tabla = [
    { n: 1, valor: 1.234, texto: 'ok' },
    { n: 2, valor: 0, texto: null },
  ];
  expect(formatearTablaIteraciones(tabla)).toContain('1.234000');
  expect(
    formatearTablaIteraciones(tabla, { cabecera: false, precision: 2, anchoColumna: 6 }),
  ).toContain('1.23');
});
