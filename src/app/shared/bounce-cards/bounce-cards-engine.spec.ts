import { describe, expect, it } from 'vitest';

import {
  BOUNCE_CARDS_FISICA,
  BOUNCE_CARDS_POR_DEFECTO as BASE,
  BOUNCE_CARDS_VISTA_PREVIA,
  escalarBounceCards,
} from '../../core/config/bounce-cards.config';
import { ajustesDelMotor, BounceCardsEngine, EntradaMotor } from './bounce-cards-engine';

const entrada = (count: number, datos: Partial<EntradaMotor> = {}): EntradaMotor => ({
  count,
  containerWidth: BASE.containerWidth,
  containerHeight: BASE.containerHeight,
  cardSize: BASE.cardSize,
  spread: BASE.spread,
  rotation: BASE.rotation,
  arc: BASE.arc,
  pushDistance: BASE.pushDistance,
  hoverScale: BASE.hoverScale,
  bounciness: BASE.bounciness,
  animationDelay: BASE.animationDelay,
  animationStagger: BASE.animationStagger,
  enableHover: BASE.enableHover,
  ...datos,
});

function crear(count: number, datos: Partial<EntradaMotor> = {}, reducir = false): BounceCardsEngine {
  return new BounceCardsEngine(ajustesDelMotor(entrada(count, datos)), reducir);
}

/** Avanza la física a 60 fps hasta que se asiente (o se agoten los pasos) y devuelve los segundos usados. */
function asentar(motor: BounceCardsEngine, maximo = 1200): number {
  let pasos = 0;
  while (pasos < maximo && motor.avanzar(1 / 60)) pasos++;
  return pasos / 60;
}

/** Valores numéricos [x, y, rotación, escala] que dejó escritos el motor. */
function medidas(motor: BounceCardsEngine, indice: number): number[] {
  const t = motor.estilo(indice)!.transform;
  const [x, y, rotacion, escala] = [
    /translate3d\(([-\d.]+)px/.exec(t)![1],
    /translate3d\([-\d.]+px, ([-\d.]+)px/.exec(t)![1],
    /rotate\(([-\d.]+)deg/.exec(t)![1],
    /scale\(([-\d.]+)\)/.exec(t)![1],
  ].map(Number);
  return [x, y, rotacion, escala];
}

describe('ajustesDelMotor: dónde reposa cada carta', () => {
  it('una sola carta queda centrada y con la inclinación base', () => {
    const { slots } = ajustesDelMotor(entrada(1));
    expect(slots).toEqual([{ x: 0, y: 0, rotate: BASE.rotation }]);
  });

  it('dos cartas se abren a ambos lados del centro', () => {
    const { slots } = ajustesDelMotor(entrada(2));
    expect(slots.map((s) => s.x)).toEqual([-BASE.spread / 2, BASE.spread / 2]);
  });

  it('tres cartas forman un abanico simétrico con la inclinación del patrón', () => {
    const { slots } = ajustesDelMotor(entrada(3));
    expect(slots.map((s) => s.x)).toEqual([-BASE.spread, 0, BASE.spread]);
    expect(slots.map((s) => s.rotate)).toEqual([10, 5, -3]);
  });

  it('el arco levanta las cartas de los extremos', () => {
    const { slots } = ajustesDelMotor(entrada(3, { arc: 20 }));
    expect(slots.map((s) => s.y)).toEqual([20, 0, 20]);
  });

  it('el patrón de inclinación se repite si hay más cartas que valores', () => {
    const { slots } = ajustesDelMotor(entrada(11, { rotation: 1 }));
    expect(slots[10].rotate).toBe(slots[0].rotate);
  });

  it('sin cartas no hay posiciones', () => {
    expect(ajustesDelMotor(entrada(0)).slots).toEqual([]);
  });

  it('acota los valores fuera de rango', () => {
    const a = ajustesDelMotor(entrada(2, { cardSize: 1, animationDelay: -3, animationStagger: -1, bounciness: 9, hoverScale: 9 }));
    expect(a.cardSize).toBe(10);
    expect(a.delay).toBe(0);
    expect(a.stagger).toBe(0);
    expect(a.bounciness).toBe(1);
    expect(a.hoverScale).toBe(2);
    expect(ajustesDelMotor(entrada(2, { hoverScale: 0.1, bounciness: -1 })).hoverScale).toBe(0.5);
    expect(ajustesDelMotor(entrada(2, { bounciness: -1 })).bounciness).toBe(0);
  });
});

describe('configuración', () => {
  it('los valores por defecto son los pedidos', () => {
    expect(BASE).toEqual({
      containerWidth: 500,
      containerHeight: 320,
      cardSize: 200,
      spread: 85,
      rotation: 10,
      arc: 0,
      pushDistance: 50,
      hoverScale: 1.04,
      bounciness: 0.3,
      animationDelay: 0.3,
      animationStagger: 0.12,
      borderWidth: 5,
      borderColor: '#ffffff',
      radius: 25,
      shadow: true,
      enableHover: true,
    });
  });

  it('la vista previa es el mismo conjunto reducido a 70 % sin tocar rebote, tiempos ni color', () => {
    expect(BOUNCE_CARDS_VISTA_PREVIA).toMatchObject({
      containerWidth: 350,
      containerHeight: 224,
      cardSize: 140,
      spread: 59,
      pushDistance: 35,
      borderWidth: 4,
      radius: 18,
      bounciness: BASE.bounciness,
      hoverScale: BASE.hoverScale,
      animationDelay: BASE.animationDelay,
      borderColor: '#ffffff',
    });
  });

  it('escalar con factor 1 no cambia nada', () => {
    expect(escalarBounceCards(BASE, 1)).toEqual(BASE);
  });
});

describe('BounceCardsEngine: aparición', () => {
  it('antes de simular no hay estilo', () => {
    expect(crear(2).estilo(0)).toBeNull();
  });

  it('las cartas empiezan sin tamaño y aparecen una tras otra', () => {
    const motor = crear(3);
    motor.avanzar(1 / 60);
    expect(medidas(motor, 0)[3]).toBe(0);

    // Pasado el retraso (0,3 s) aparece la primera, pero la última (0,54 s) todavía no.
    for (let i = 0; i < 24; i++) motor.avanzar(1 / 60);
    expect(medidas(motor, 0)[3]).toBeGreaterThan(0);
    expect(medidas(motor, 2)[3]).toBe(0);
  });

  it('al aparecer rebotan: la escala se pasa de 1 antes de asentarse', () => {
    const motor = crear(1);
    let maxima = 0;
    for (let i = 0; i < 400; i++) {
      motor.avanzar(1 / 60);
      maxima = Math.max(maxima, medidas(motor, 0)[3]);
    }
    expect(maxima).toBeGreaterThan(1);
    expect(medidas(motor, 0)[3]).toBeCloseTo(1, 2);
  });

  it('con rebote 0 casi no se pasa de 1', () => {
    const motor = crear(1, { bounciness: 0 });
    let maxima = 0;
    for (let i = 0; i < 600; i++) {
      motor.avanzar(1 / 60);
      maxima = Math.max(maxima, medidas(motor, 0)[3]);
    }
    expect(maxima).toBeLessThan(1.15);
  });

  it('se asienta en su lugar y la simulación se detiene', () => {
    const motor = crear(3);
    asentar(motor);
    expect(motor.avanzar(1 / 60)).toBe(false);
    const [x, , rotacion, escala] = medidas(motor, 2);
    expect(x).toBeCloseTo(BASE.spread, 1);
    expect(rotacion).toBeCloseTo(-3, 1);
    expect(escala).toBeCloseTo(1, 2);
  });

  it('con movimiento reducido las cartas ya están en su lugar y a tamaño completo desde el primer cuadro', () => {
    const motor = crear(3, {}, true);
    motor.avanzar(1 / 60);
    expect(medidas(motor, 1)[3]).toBe(1);
    expect(medidas(motor, 0)[0]).toBeCloseTo(-BASE.spread, 0);
    expect(asentar(motor)).toBeLessThan(2);
  });

  it('el paso de tiempo se acota: un cuadro enorme no dispara la simulación', () => {
    const motor = crear(1);
    expect(() => motor.avanzar(10)).not.toThrow();
    expect(medidas(motor, 0).every(Number.isFinite)).toBe(true);
  });
});

describe('BounceCardsEngine: cursor y carta activa', () => {
  it('elige la carta más cercana en horizontal', () => {
    const motor = crear(3);
    expect(motor.cartaBajo(-85, 0)).toBe(0);
    expect(motor.cartaBajo(5, 0)).toBe(1);
    expect(motor.cartaBajo(90, 10)).toBe(2);
  });

  it('fuera de las cartas devuelve -1', () => {
    const motor = crear(3);
    expect(motor.cartaBajo(0, 200)).toBe(-1);
    expect(motor.cartaBajo(0, -200)).toBe(-1);
    expect(motor.cartaBajo(400, 0)).toBe(-1);
    expect(crear(0).cartaBajo(0, 0)).toBe(-1);
  });

  it('si ya hay una activa, conserva el cursor mientras la otra no gane por mucho', () => {
    const motor = crear(3);
    motor.activar(1);
    // x = 45 está casi a medio camino entre las cartas 1 (x=0) y 2 (x=85).
    expect(motor.cartaBajo(45, 0)).toBe(1);
    expect(motor.cartaBajo(70, 0)).toBe(2);
  });

  it('activar avisa si hubo cambio', () => {
    const motor = crear(3);
    expect(motor.activar(1)).toBe(true);
    expect(motor.activar(1)).toBe(false);
    expect(motor.activar(-1)).toBe(true);
  });

  it('la carta activa se endereza, sube, crece y queda por encima; las demás se apartan', () => {
    const motor = crear(3);
    asentar(motor);
    motor.activar(1);
    asentar(motor);

    const [x1, y1, rotacion1, escala1] = medidas(motor, 1);
    expect(x1).toBeCloseTo(0, 1);
    expect(y1).toBeCloseTo(-BASE.cardSize * 0.04, 1);
    expect(rotacion1).toBeCloseTo(0, 1);
    expect(escala1).toBeCloseTo(BASE.hoverScale, 2);
    expect(motor.estilo(1)).toMatchObject({ activa: true, zIndex: 4 });

    // Se apartan lo justo para no salirse del contenedor (500 px).
    expect(medidas(motor, 0)[0]).toBeCloseTo(-134.1, 0);
    expect(medidas(motor, 2)[0]).toBeCloseTo(BASE.spread + BASE.pushDistance, 0);
    expect(motor.estilo(0)).toMatchObject({ activa: false, zIndex: 1 });
    expect(motor.estilo(2)).toMatchObject({ activa: false, zIndex: 3 });
  });

  it('al soltar el cursor las cartas vuelven a su sitio', () => {
    const motor = crear(3);
    asentar(motor);
    motor.activar(2);
    asentar(motor);
    motor.activar(-1);
    asentar(motor);

    expect(medidas(motor, 0)[0]).toBeCloseTo(-BASE.spread, 1);
    expect(medidas(motor, 2)[2]).toBeCloseTo(-3, 1);
    expect(motor.indiceActivo).toBe(-1);
  });

  it('con enableHover apagado no pasa nada al pasar el cursor', () => {
    const motor = crear(3, { enableHover: false });
    asentar(motor);
    motor.activar(1);
    asentar(motor);

    expect(motor.indiceActivo).toBe(-1);
    expect(motor.estilo(1)!.activa).toBe(false);
    expect(medidas(motor, 0)[0]).toBeCloseTo(-BASE.spread, 1);
  });

  it('no reacciona al hover antes de que la carta haya aparecido', () => {
    const motor = crear(2);
    motor.activar(0);
    motor.avanzar(1 / 60);
    expect(medidas(motor, 1)[0]).toBeCloseTo(BASE.spread / 2, 0);
  });
});

describe('BounceCardsEngine: movimiento suave', () => {
  it('usa resortes más lentos que la referencia (90 de movimiento y 80 de aparición)', () => {
    expect(BOUNCE_CARDS_FISICA.rigidezMovimiento).toBe(90);
    expect(BOUNCE_CARDS_FISICA.rigidezAparicion).toBe(80);
    expect(BOUNCE_CARDS_FISICA.amortiguacionMovimiento).toBeGreaterThan(0.72);
  });

  it('al apartarse, las cartas llegan a su sitio sin pasarse de largo', () => {
    const motor = crear(3);
    asentar(motor);
    motor.activar(1);
    const destino = BASE.spread + BASE.pushDistance;
    let maximo = 0;
    for (let i = 0; i < 600; i++) {
      motor.avanzar(1 / 60);
      maximo = Math.max(maximo, medidas(motor, 2)[0]);
    }
    expect(maximo).toBeLessThan(destino + 1.5);
    expect(medidas(motor, 2)[0]).toBeCloseTo(destino, 0);
  });

  it('el desplazamiento al pasar el cursor es corto (50 px)', () => {
    const motor = crear(3);
    asentar(motor);
    const antes = medidas(motor, 2)[0];
    motor.activar(1);
    asentar(motor);
    expect(medidas(motor, 2)[0] - antes).toBeCloseTo(BASE.pushDistance, 0);
  });
});

describe('BounceCardsEngine: las cartas nunca se salen del contenedor', () => {
  /** Mitad del cuadro que ocupa una carta girada y escalada. */
  function alcance(motor: BounceCardsEngine, indice: number, tamano: number): number {
    const [, , rotacion, escala] = medidas(motor, indice);
    const radianes = (rotacion * Math.PI) / 180;
    return (tamano / 2) * escala * (Math.abs(Math.cos(radianes)) + Math.abs(Math.sin(radianes)));
  }

  it.each([
    ['tamaño completo', BASE],
    ['vista previa', BOUNCE_CARDS_VISTA_PREVIA],
  ])('%s: con cualquier carta activa, todas quedan dentro', (_nombre, config) => {
    for (const cuantas of [1, 2, 3]) {
      for (let activa = 0; activa < cuantas; activa++) {
        const motor = new BounceCardsEngine(
          ajustesDelMotor({ ...entrada(cuantas), ...config, count: cuantas }),
          false
        );
        asentar(motor);
        motor.activar(activa);
        asentar(motor);

        for (let i = 0; i < cuantas; i++) {
          const [x, y] = medidas(motor, i);
          const medida = alcance(motor, i, config.cardSize);
          expect(Math.abs(x) + medida).toBeLessThanOrEqual(config.containerWidth / 2 + 0.5);
          expect(Math.abs(y) + medida).toBeLessThanOrEqual(config.containerHeight / 2 + 0.5);
        }
      }
    }
  });

  it('en un contenedor más angosto que el abanico, lo comprime en vez de salirse', () => {
    const motor = crear(3, { containerWidth: 300 });
    asentar(motor);
    motor.activar(1);
    asentar(motor);

    for (let i = 0; i < 3; i++) {
      expect(Math.abs(medidas(motor, i)[0]) + alcance(motor, i, BASE.cardSize)).toBeLessThanOrEqual(150.5);
    }
  });

  it('si el contenedor es menor que la carta, queda centrada', () => {
    const motor = crear(1, { containerWidth: 100, containerHeight: 100 });
    asentar(motor);
    expect(medidas(motor, 0)[0]).toBeCloseTo(0, 1);
    expect(medidas(motor, 0)[1]).toBeCloseTo(0, 1);
  });
});

describe('BounceCardsEngine: pulsar', () => {
  it('da un rebote a la carta pulsada', () => {
    const motor = crear(1);
    asentar(motor);
    motor.pulsar(0);

    expect(motor.avanzar(1 / 60)).toBe(true);
    expect(medidas(motor, 0)[3]).toBeLessThan(1);
  });

  it('con movimiento reducido no rebota', () => {
    const motor = crear(1, {}, true);
    asentar(motor);
    motor.pulsar(0);
    expect(motor.avanzar(1 / 60)).toBe(false);
  });

  it('pulsar una carta que no existe no hace nada', () => {
    const motor = crear(1);
    expect(() => motor.pulsar(5)).not.toThrow();
  });
});

describe('BounceCardsEngine: cambios de cantidad', () => {
  it('con menos cartas, las que sobran desaparecen y la activa se reinicia', () => {
    const motor = crear(3);
    asentar(motor);
    motor.activar(2);

    motor.actualizar(ajustesDelMotor(entrada(2)));

    expect(motor.cantidad).toBe(2);
    expect(motor.estilo(2)).toBeNull();
    expect(motor.indiceActivo).toBe(-1);
  });

  it('al quitar una carta el hover se apaga, aunque la activa siga existiendo', () => {
    const motor = crear(3);
    asentar(motor);
    motor.activar(0);

    motor.actualizar(ajustesDelMotor(entrada(2)));

    expect(motor.indiceActivo).toBe(-1);
    asentar(motor);
    expect(medidas(motor, 0)[0]).toBeCloseTo(-BASE.spread / 2, 1);
    expect(medidas(motor, 0)[2]).toBeCloseTo(BASE.rotation, 1);
  });

  it('al agregar una carta el hover también se apaga', () => {
    const motor = crear(2);
    asentar(motor);
    motor.activar(1);

    motor.actualizar(ajustesDelMotor(entrada(3)));

    expect(motor.indiceActivo).toBe(-1);
  });

  it('si la cantidad no cambia, el hover se conserva', () => {
    const motor = crear(3);
    motor.activar(1);
    motor.actualizar(ajustesDelMotor(entrada(3, { spread: 70 })));
    expect(motor.indiceActivo).toBe(1);
  });

  it('las cartas que se quedan se recolocan sin volver a aparecer', () => {
    const motor = crear(3);
    asentar(motor);

    motor.actualizar(ajustesDelMotor(entrada(2)));
    asentar(motor);

    expect(medidas(motor, 0)[0]).toBeCloseTo(-BASE.spread / 2, 1);
    expect(medidas(motor, 1)[0]).toBeCloseTo(BASE.spread / 2, 1);
    expect(medidas(motor, 0)[3]).toBeCloseTo(1, 2);
  });

  it('una carta nueva aparece con rebote', () => {
    const motor = crear(1);
    asentar(motor);

    motor.actualizar(ajustesDelMotor(entrada(2)));
    motor.avanzar(1 / 60);

    expect(medidas(motor, 1)[3]).toBe(0);
    asentar(motor);
    expect(medidas(motor, 1)[3]).toBeCloseTo(1, 2);
  });
});
