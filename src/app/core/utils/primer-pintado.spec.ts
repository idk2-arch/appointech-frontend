import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { despuesDelPrimerPintado } from './primer-pintado';

describe('despuesDelPrimerPintado', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] }));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('no ejecuta nada de inmediato: espera dos cuadros y un respiro del navegador', () => {
    const tarea = vi.fn();
    despuesDelPrimerPintado(tarea);

    expect(tarea).not.toHaveBeenCalled();
    vi.advanceTimersByTime(16);
    expect(tarea).not.toHaveBeenCalled();
    vi.advanceTimersByTime(16);
    expect(tarea).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60);
    expect(tarea).toHaveBeenCalledOnce();
  });

  it('con requestIdleCallback espera a que el navegador esté libre y le pone un tope', () => {
    let pendiente: (() => void) | undefined;
    let tope: number | undefined;
    vi.stubGlobal('requestIdleCallback', (cb: () => void, opciones: { timeout: number }) => {
      pendiente = cb;
      tope = opciones.timeout;
      return 3;
    });
    vi.stubGlobal('cancelIdleCallback', vi.fn());
    const tarea = vi.fn();
    despuesDelPrimerPintado(tarea, 800);

    vi.advanceTimersByTime(100);
    expect(tarea).not.toHaveBeenCalled();
    expect(tope).toBe(800);
    pendiente?.();
    expect(tarea).toHaveBeenCalledOnce();
  });

  it('cancelar antes de tiempo impide que se ejecute, en cualquier etapa', () => {
    const tarea = vi.fn();
    const cancelarTemprano = despuesDelPrimerPintado(tarea);
    cancelarTemprano();
    vi.advanceTimersByTime(500);
    expect(tarea).not.toHaveBeenCalled();

    const cancelarTarde = despuesDelPrimerPintado(tarea);
    vi.advanceTimersByTime(40);
    cancelarTarde();
    vi.advanceTimersByTime(500);
    expect(tarea).not.toHaveBeenCalled();
  });

  it('cancelar con requestIdleCallback pendiente lo cancela', () => {
    const cancelIdle = vi.fn();
    let pendiente: (() => void) | undefined;
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
      pendiente = cb;
      return 9;
    });
    vi.stubGlobal('cancelIdleCallback', cancelIdle);
    const tarea = vi.fn();
    const cancelar = despuesDelPrimerPintado(tarea);
    vi.advanceTimersByTime(100);

    cancelar();
    pendiente?.();

    expect(cancelIdle).toHaveBeenCalledWith(9);
    expect(tarea).not.toHaveBeenCalled();
  });
});
