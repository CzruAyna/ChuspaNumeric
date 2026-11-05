import {
  diferenciaCentrada,
  diferenciaCentradaSegundaDerivada,
} from '../../../src/diferencias/diferencia_centrada.js';

import { diferenciasAdelanteGrado1 } from '../../../src/diferencias/diferencia_hacia_adelante.js';

describe('Pruebas Funcionales - Método de Diferencias Finitas', () => {
  test('Caso Normal: Cálculo de la derivada manteniendo un error absoluto menor a 1e-6', () => {
    const funcion = (x) => x * x * x;
    const x = 2;
    const h = 0.00001;

    const resultadoCalculado = diferenciasAdelanteGrado1(funcion, x, h);
    const errorAbsoluto = Math.abs(resultadoCalculado - 12);

    expect(errorAbsoluto).toBeLessThan(1e-4);
  });

  test('Caso de Borde: Estabilidad funcional con valores de x cercanos a cero', () => {
    const funcion = (x) => Math.sin(x);
    const x = 0.001;
    const h = 0.000001;

    const resultadoCalculado = diferenciasAdelanteGrado1(funcion, x, h);
    const valorReal = Math.cos(x);
    const errorAbsoluto = Math.abs(resultadoCalculado - valorReal);

    expect(errorAbsoluto).toBeLessThan(1e-5);
  });

  test('Caso de Error: Validación de excepción si el tamaño de paso h es igual o menor a cero', () => {
    expect(() => {
      diferenciasAdelanteGrado1((x) => x, 1, 0);
    }).toThrow();
  });

  test('diferenciaCentrada: aproximación mejora al reducir h', () => {
    const funcion = (x) => x ** 3;

    const x = 2;
    const valorReal = 3 * x ** 2;

    const resultadoGrande = diferenciaCentrada(funcion, x, 0.1);
    const resultadoPequeno = diferenciaCentrada(funcion, x, 0.01);

    const errorGrande = Math.abs(resultadoGrande - valorReal);
    const errorPequeno = Math.abs(resultadoPequeno - valorReal);

    expect(errorPequeno).toBeLessThan(errorGrande);
    expect(errorPequeno).toBeCloseTo(0.01 ** 2, 10);
  });

  test('diferenciaCentradaSegundaDerivada: aproximación mejora al reducir h', () => {
    const funcion = (x) => x ** 4;

    const x = 2;
    const valorReal = 12 * x ** 2;

    const resultadoGrande = diferenciaCentradaSegundaDerivada(funcion, x, 0.1);
    const resultadoPequeno = diferenciaCentradaSegundaDerivada(funcion, x, 0.01);

    const errorGrande = Math.abs(resultadoGrande - valorReal);
    const errorPequeno = Math.abs(resultadoPequeno - valorReal);

    expect(errorPequeno).toBeLessThan(errorGrande);
    expect(errorPequeno).toBeCloseTo(2 * 0.01 ** 2, 7);
  });

  test('diferenciasAdelanteGrado1: aproximación mejora al reducir h', () => {
    const funcion = (x) => x ** 3;

    const x = 2;
    const valorReal = 3 * x ** 2;

    const resultadoGrande = diferenciasAdelanteGrado1(funcion, x, 0.1);
    const resultadoPequeno = diferenciasAdelanteGrado1(funcion, x, 0.01);

    const errorGrande = Math.abs(resultadoGrande - valorReal);
    const errorPequeno = Math.abs(resultadoPequeno - valorReal);

    expect(errorPequeno).toBeLessThan(errorGrande);
    expect(errorPequeno).toBeCloseTo(3 * x * 0.01 + 0.01 ** 2, 10);
  });
});
