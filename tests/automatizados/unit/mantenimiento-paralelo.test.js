import { describe, expect, test } from '@jest/globals';
import { ejecutarParalelo } from '../../../src/utils/ejecutar_paralelo.js';
import { buscarTodasLasRaices } from '../../../src/no-lineales/buscar_raices.js';
import { ErrorParametros } from '../../../src/core/errores.js';
import * as errores from '../../../src/utils/error_relativo.js';
import * as diferencias from '../../../src/diferencias/diferencia_centrada.js';

describe('Workers y busqueda de raices', () => {
  test('distribuye tareas y conserva su orden', async () => {
    await expect(ejecutarParalelo([3, 1, 2], (x) => x * x, { maxWorkers: 2 })).resolves.toEqual([
      9, 1, 4,
    ]);
    await expect(ejecutarParalelo([2], (x) => x + 1)).resolves.toEqual([3]);
    await expect(ejecutarParalelo([], (x) => x)).resolves.toEqual([]);
  });
  test('propaga errores reales de tareas y argumentos invalidos', async () => {
    await expect(ejecutarParalelo(null, (x) => x)).rejects.toThrow();
    await expect(ejecutarParalelo([1], null)).rejects.toThrow();
    await expect(ejecutarParalelo([1], (x) => x, { maxWorkers: 0 })).rejects.toThrow();
    await expect(
      ejecutarParalelo([1], () => {
        throw new TypeError('tarea invalida');
      }),
    ).rejects.toThrow('tarea invalida');
  });
  test('busqueda secuencial y paralela encuentran las mismas raices', async () => {
    const opciones = { f: (x) => x * x - 2, inicio: -2, fin: 2, paso: 0.7, tolerancia: 1e-9 };
    const secuencial = buscarTodasLasRaices(opciones);
    const paralelo = await buscarTodasLasRaices({
      ...opciones,
      paralelo: true,
      maxWorkers: 2,
      benchmark: true,
    });
    for (const res of [secuencial, paralelo]) {
      expect(res.convergio).toBe(true);
      expect(res.resultado).toHaveLength(2);
      expect(res.resultado[0]).toBeCloseTo(-Math.sqrt(2), 8);
      expect(res.resultado[1]).toBeCloseTo(Math.sqrt(2), 8);
    }
    expect(paralelo.resultado).toEqual(secuencial.resultado);
    expect(paralelo.meta.tiempo_ms).toBeGreaterThanOrEqual(0);
    const exacta = buscarTodasLasRaices({ f: (x) => x * x - 1, inicio: -2, fin: 2, paso: 1 });
    expect(exacta.resultado).toEqual([-1, 1]);
    expect(
      buscarTodasLasRaices({ f: (x) => x * x + 1, inicio: -2, fin: 2, paso: 1 }).resultado,
    ).toEqual([]);
    const sinRaices = await buscarTodasLasRaices({
      f: (x) => x * x + 1,
      inicio: -2,
      fin: 2,
      paso: 1,
      paralelo: true,
    });
    expect(sinRaices.resultado).toEqual([]);
    expect(buscarTodasLasRaices({ ...opciones, maxIter: 1 }).convergio).toBe(false);
  });
  test.each([
    { paso: 0 },
    { paso: NaN },
    { paso: '1' },
    { f: () => NaN },
    { f: () => Infinity },
    { f: () => '1' },
  ])('busqueda rechaza %j', (cambio) => {
    expect(() =>
      buscarTodasLasRaices({ f: (x) => x, inicio: -1, fin: 1, paso: 0.2, ...cambio }),
    ).toThrow(ErrorParametros);
  });
});

test('errores numericos conservan denominadores y rechazan entradas invalidas', () => {
  expect(errores.errorAbsoluto(10, 9)).toBe(1);
  expect(errores.errorRelativo(10, 9)).toBe(0.1);
  expect(errores.errorPorcentual(10, 9)).toBe(10);
  expect(errores.errorRelativoAproximado(10, 9)).toBe(0.1);
  for (const calcular of Object.values(errores)) {
    expect(() => calcular('1', 1)).toThrow(TypeError);
    expect(() => calcular(1, '1')).toThrow(TypeError);
    expect(() => calcular(NaN, 1)).toThrow();
    expect(() => calcular(1, NaN)).toThrow();
  }
  for (const calcular of [
    errores.errorRelativo,
    errores.errorPorcentual,
    errores.errorRelativoAproximado,
  ]) {
    expect(() => calcular(0, 1)).toThrow();
  }
});

test('diferencias centradas validan funcion, punto y paso', () => {
  for (const calcular of Object.values(diferencias)) {
    expect(() => calcular(null, 1)).toThrow(ErrorParametros);
    expect(() => calcular((x) => x, NaN)).toThrow(ErrorParametros);
    expect(() => calcular((x) => x, 1, 0)).toThrow(ErrorParametros);
    expect(() => calcular((x) => x, 1, Infinity)).toThrow(ErrorParametros);
    expect(Number.isFinite(calcular((x) => x * x, 1))).toBe(true);
  }
});
