import { describe, expect, it } from 'vitest';

import { CardSwapEngine } from './card-swap-engine';
import { EntradaAjustes, limitesPila, normalizarAjustes } from './card-swap-geometria';

const ENTRADA: EntradaAjustes = {
  width: 460,
  height: 340,
  cardDistance: 60,
  verticalDistance: 70,
  depth: 90,
  skewAmount: 6,
  visibleCards: 4,
  speed: 1,
  bounce: 0.35,
  parallax: 0.5,
  hoverSpread: 0.12,
  dim: 0.5,
  draggable: true,
};

function crear(total: number, entrada: Partial<EntradaAjustes> = {}, reducir = false): CardSwapEngine {
  const motor = new CardSwapEngine(total, normalizarAjustes({ ...ENTRADA, ...entrada }, total), reducir);
  motor.iniciar(0, false);
  return motor;
}

/** Posición [x, y, z] que dejó escrita el motor en el transform de una carta. */
function posicion(motor: CardSwapEngine, indice: number): number[] {
  const [x, y, z] = /translate3d\(([-\d.]+)px, ([-\d.]+)px, ([-\d.]+)px\)/.exec(motor.estilo(indice).transform)!.slice(1).map(Number);
  return [x, y, z];
}

/** Deja que la física se asiente y devuelve el tiempo final. */
function asentar(motor: CardSwapEngine, desde = 0): number {
  let t = desde;
  for (let i = 0; i < 600 && motor.avanzar(t); i++) t += 16;
  return t;
}

describe('geometría de la pila', () => {
  it('la caja crece con la cantidad de cartas visibles', () => {
    const base = { width: 460, height: 340, cardDistance: 60, verticalDistance: 70, depth: 90, skewAmount: 6, hoverSpread: 0.12 };
    expect(limitesPila({ ...base, visible: 4 }).width).toBeGreaterThan(limitesPila({ ...base, visible: 1 }).width);
    expect(limitesPila({ ...base, visible: 4 }).height).toBeGreaterThan(limitesPila({ ...base, visible: 1 }).height);
  });

  it('acota los ajustes a rangos válidos', () => {
    const a = normalizarAjustes({ ...ENTRADA, visibleCards: 9, speed: 99, bounce: 5, parallax: -1, dim: 3, depth: -10, width: 0 }, 3);
    expect(a.visible).toBe(3);
    expect(a.speed).toBe(4);
    expect(a.bounce).toBe(1);
    expect(a.parallax).toBe(0);
    expect(a.dim).toBe(1);
    expect(a.dz).toBe(0);
    expect(a.width).toBe(460);
  });
});

describe('CardSwapEngine: orden', () => {
  it('empieza en orden con la primera carta al frente', () => {
    const motor = crear(4);
    expect(motor.ordenActual).toEqual([0, 1, 2, 3]);
    expect(motor.indiceFrente).toBe(0);
    expect(motor.posicionDe(2)).toBe(2);
  });

  it('siguiente manda el frente al fondo', () => {
    const motor = crear(4);
    expect(motor.mover(1, 0)).toBe(true);
    expect(motor.ordenActual).toEqual([1, 2, 3, 0]);
    expect(motor.indiceFrente).toBe(1);
  });

  it('anterior trae la última carta al frente', () => {
    const motor = crear(4);
    motor.mover(-1, 0);
    expect(motor.ordenActual).toEqual([3, 0, 1, 2]);
  });

  it('siguiente y anterior se deshacen entre sí', () => {
    const motor = crear(4);
    motor.mover(1, 0);
    motor.mover(-1, 0);
    expect(motor.ordenActual).toEqual([0, 1, 2, 3]);
  });

  it('da la vuelta completa tras tantos pasos como cartas', () => {
    const motor = crear(3);
    for (let i = 0; i < 3; i++) motor.mover(1, 0);
    expect(motor.ordenActual).toEqual([0, 1, 2]);
  });

  it('con una sola carta no hay nada que mover', () => {
    const motor = crear(1);
    expect(motor.mover(1, 0)).toBe(false);
    expect(motor.mover(-1, 0)).toBe(false);
    expect(motor.indiceFrente).toBe(0);
  });
});

describe('CardSwapEngine: límites y estilos', () => {
  it('las cartas más allá de las visibles quedan ocultas y las demás visibles', () => {
    const motor = crear(6, { visibleCards: 3 });
    asentar(motor);
    expect([0, 1, 2, 3, 4, 5].map((i) => motor.estilo(i).visible)).toEqual([true, true, true, false, false, false]);
  });

  it('la carta del frente tiene la capa más alta y es la única marcada como frente', () => {
    const motor = crear(4);
    asentar(motor);
    const capas = [0, 1, 2, 3].map((i) => motor.estilo(i).zIndex);
    expect(capas[0]).toBe(Math.max(...capas));
    expect([0, 1, 2, 3].filter((i) => motor.estilo(i).frente)).toEqual([0]);
  });

  it('las cartas del fondo se oscurecen más que las del frente', () => {
    const motor = crear(4);
    asentar(motor);
    expect(Number(motor.estilo(0).sombra)).toBe(0);
    expect(Number(motor.estilo(3).sombra)).toBeGreaterThan(Number(motor.estilo(1).sombra));
  });

  it('cada carta se desplaza en profundidad según su posición', () => {
    const motor = crear(3);
    asentar(motor);
    expect(posicion(motor, 0)).toEqual([0, 0, 0]);
    expect(posicion(motor, 1)).toEqual([60, -70, -90]);
    expect(motor.estilo(1).transform).toContain('skewY(6deg)');
  });

  it('el cursor indica agarrar en el frente, señalar en las de atrás y nada si no se arrastra', () => {
    const motor = crear(3);
    expect(motor.estilo(0).cursor).toBe('grab');
    expect(motor.estilo(1).cursor).toBe('pointer');
    const fija = crear(3, { draggable: false });
    expect(fija.estilo(0).cursor).toBe('');
  });

  it('tras avanzar, la carta que salió termina al fondo y todo se asienta', () => {
    const motor = crear(3);
    motor.mover(1, 0);
    const fin = asentar(motor);

    expect(motor.avanzar(fin + 16)).toBe(false);
    expect(motor.estilo(1).frente).toBe(true);
    posicion(motor, 0).forEach((valor, i) => expect(valor).toBeCloseTo([120, -140, -180][i], 0));
  });

  it('con movimiento reducido el rebote se amortigua del todo y no hay apertura al pasar el cursor', () => {
    const motor = crear(3, {}, true);
    motor.moverPuntero(1, 1);
    asentar(motor);
    expect(motor.origenPerspectiva).toEqual({ x: motor['ajustes'].bounds.originX, y: motor['ajustes'].bounds.originY });
  });
});

describe('CardSwapEngine: puntero', () => {
  it('el parallax mueve el punto de fuga y vuelve al salir', () => {
    const motor = crear(3);
    const origen = { ...motor.origenPerspectiva };

    motor.moverPuntero(1, -1);
    asentar(motor);
    expect(motor.origenPerspectiva.x).toBeGreaterThan(origen.x);
    expect(motor.origenPerspectiva.y).toBeLessThan(origen.y);

    motor.salirPuntero();
    asentar(motor, 10_000);
    expect(motor.origenPerspectiva.x).toBeCloseTo(origen.x, 0);
    expect(motor.origenPerspectiva.y).toBeCloseTo(origen.y, 0);
  });

  it('al pasar el cursor las cartas se separan un poco', () => {
    const motor = crear(3);
    asentar(motor);
    const antes = motor.estilo(1).transform;
    motor.moverPuntero(0, 0);
    asentar(motor, 10_000);
    expect(motor.estilo(1).transform).not.toBe(antes);
  });
});

describe('CardSwapEngine: arrastre', () => {
  it('solo se arrastra la carta del frente, y cuando está quieta', () => {
    const motor = crear(3);
    expect(motor.puedeArrastrar(0)).toBe(true);
    expect(motor.puedeArrastrar(1)).toBe(false);
    motor.comenzarArrastre(0);
    expect(motor.puedeArrastrar(0)).toBe(false);
    expect(crear(1).puedeArrastrar(0)).toBe(false);
  });

  it('un arrastre largo lanza la carta: pasa al fondo', () => {
    const motor = crear(3);
    motor.comenzarArrastre(0);
    motor.arrastrar(0, 160, 20, 0);
    motor.arrastrar(0, 200, 20, 400);

    expect(motor.soltar(0, 400)).toBe('lanzada');
    expect(motor.indiceFrente).toBe(1);
  });

  it('un arrastre corto y lento devuelve la carta a su lugar', () => {
    const motor = crear(3);
    motor.comenzarArrastre(0);
    motor.arrastrar(0, 10, 0, 0);
    motor.arrastrar(0, 20, 0, 500);

    expect(motor.soltar(0, 500)).toBe('devuelta');
    expect(motor.indiceFrente).toBe(0);
    asentar(motor, 500);
    expect(posicion(motor, 0)[0]).toBeCloseTo(0, 0);
  });

  it('un movimiento corto pero rápido (lanzamiento) también la saca', () => {
    const motor = crear(3);
    motor.comenzarArrastre(0);
    motor.arrastrar(0, 0, 0, 0);
    motor.arrastrar(0, 40, 0, 16);

    expect(motor.soltar(0, 16)).toBe('lanzada');
  });

  it('cancelar el gesto nunca lanza la carta, por lejos que esté', () => {
    const motor = crear(3);
    motor.comenzarArrastre(0);
    motor.arrastrar(0, 300, 0, 0);
    motor.arrastrar(0, 400, 0, 10);

    expect(motor.soltar(0, 10, true)).toBe('devuelta');
    expect(motor.indiceFrente).toBe(0);
  });

  it('mientras se arrastra, la siguiente carta se adelanta un poco', () => {
    const motor = crear(3);
    asentar(motor);
    const antes = motor.estilo(1).transform;
    motor.comenzarArrastre(0);
    motor.arrastrar(0, 120, 0, 0);
    asentar(motor, 100);
    expect(motor.estilo(1).transform).not.toBe(antes);
  });
});
