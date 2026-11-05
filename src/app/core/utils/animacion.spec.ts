import { describe, expect, it, vi } from 'vitest';

import { alAcabarAnimacion, esCancelacion } from './animacion';

/** Una "animación" cuya promesa `finished` se resuelve o rechaza a voluntad. */
function animacionFalsa(): { animacion: { finished: Promise<unknown> }; resolver: () => void; rechazar: (motivo: unknown) => void } {
  let resolver!: () => void;
  let rechazar!: (motivo: unknown) => void;
  const finished = new Promise<unknown>((alResolver, alRechazar) => {
    resolver = () => alResolver(undefined);
    rechazar = alRechazar;
  });
  return { animacion: { finished }, resolver, rechazar };
}

const vaciar = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('animacion', () => {
  it('solo un AbortError cuenta como cancelación', () => {
    expect(esCancelacion(new DOMException('cancelada', 'AbortError'))).toBe(true);
    expect(esCancelacion(new DOMException('otra', 'InvalidStateError'))).toBe(false);
    expect(esCancelacion(new Error('AbortError'))).toBe(false);
    expect(esCancelacion(undefined)).toBe(false);
  });

  it('avisa cuando la animación termina', async () => {
    const { animacion, resolver } = animacionFalsa();
    const alTerminar = vi.fn();
    alAcabarAnimacion(animacion, alTerminar);
    expect(alTerminar).not.toHaveBeenCalled();

    resolver();
    await vaciar();
    expect(alTerminar).toHaveBeenCalledOnce();
  });

  it('avisa también cuando se cancela, sin dejar una promesa rechazada sin manejar', async () => {
    const { animacion, rechazar } = animacionFalsa();
    const alTerminar = vi.fn();
    alAcabarAnimacion(animacion, alTerminar);

    rechazar(new DOMException('cancelada', 'AbortError'));
    await vaciar();
    expect(alTerminar).toHaveBeenCalledOnce();
  });

  it('un error distinto de la cancelación se relanza y no se da por terminada', () => {
    let alRechazar!: (motivo: unknown) => unknown;
    const alTerminar = vi.fn();
    const animacion = {
      finished: {
        then: (_alResolver: unknown, rechazo: (motivo: unknown) => unknown) => {
          alRechazar = rechazo;
        },
      } as unknown as PromiseLike<unknown>,
    };

    alAcabarAnimacion(animacion, alTerminar);

    expect(() => alRechazar(new Error('falla real'))).toThrow('falla real');
    expect(alTerminar).not.toHaveBeenCalled();
  });
});
