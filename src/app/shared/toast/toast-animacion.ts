/**
 * Reemplazo de `animate()` de Motion para un número: tween con curva cubic-bezier o resorte con duración
 * y rebote (`duration` + `bounce`), ambos con velocidad inicial. Se dibuja con requestAnimationFrame.
 */

const limitar = (valor: number, minimo: number, maximo: number): number => Math.min(maximo, Math.max(minimo, valor));

/** Solución de x(t) para un resorte; con `bounce` 0 es críticamente amortiguado (sin rebote). */
export interface ParametrosResorte {
  zeta: number;
  omega: number;
}

/**
 * Motion define el resorte por `duration` (tiempo en que se asienta) y `bounce`. Aquí el amortiguamiento es
 * `1 - bounce` y la frecuencia natural se elige para que la envolvente caiga al 0,1 % justo en `duration`.
 */
export function parametrosResorte(duracionS: number, bounce: number): ParametrosResorte {
  const zeta = limitar(1 - bounce, 0.05, 1);
  const duracion = limitar(duracionS, 0.01, 10);
  return { zeta, omega: Math.log(1000) / (zeta * duracion) };
}

/** Desplazamiento respecto al destino `t` segundos después, partiendo de `x0` con velocidad `v0` (px/s). */
export function desplazamientoResorte(t: number, x0: number, v0: number, { zeta, omega }: ParametrosResorte): number {
  if (zeta >= 1) return Math.exp(-omega * t) * (x0 + (v0 + omega * x0) * t);
  const amortiguada = omega * Math.sqrt(1 - zeta * zeta);
  const decaimiento = Math.exp(-zeta * omega * t);
  return decaimiento * (x0 * Math.cos(amortiguada * t) + ((v0 + zeta * omega * x0) / amortiguada) * Math.sin(amortiguada * t));
}

/** Curva cubic-bezier(x1, y1, x2, y2) como en CSS: devuelve y para un progreso de tiempo x en [0, 1]. */
export function curvaBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const coordenada = (t: number, p1: number, p2: number): number =>
    3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
  const derivadaX = (t: number): number => 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);

  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const error = coordenada(t, x1, x2) - x;
      const pendiente = derivadaX(t);
      if (Math.abs(error) < 1e-6 || pendiente === 0) break;
      t = limitar(t - error / pendiente, 0, 1);
    }
    return coordenada(t, y1, y2);
  };
}

export interface OpcionesAnimacion {
  desde: number;
  hasta: number;
  /** Duración del tween, o tiempo en que se asienta el resorte. */
  duracionMs: number;
  alActualizar: (valor: number) => void;
  /** Se llama una vez: con `true` al llegar al destino y con `false` si se canceló antes. */
  alTerminar?: (completa: boolean) => void;
  /** Con esto la animación es un resorte; sin esto, un tween con `curva`. */
  resorte?: { bounce: number; velocidad: number };
  curva?: readonly [number, number, number, number];
}

export interface ControlAnimacion {
  cancelar(): void;
}

export function animarNumero(opciones: OpcionesAnimacion): ControlAnimacion {
  const { desde, hasta, duracionMs, alActualizar, alTerminar, resorte, curva = [0, 0, 1, 1] } = opciones;
  const facilidad = curvaBezier(...curva);
  const parametros = resorte ? parametrosResorte(duracionMs / 1000, resorte.bounce) : null;
  let cuadro = 0;
  let cancelada = false;

  const terminar = (): void => {
    alActualizar(hasta);
    alTerminar?.(true);
  };
  let inicio: number | null = null;
  const paso = (ahora: number): void => {
    if (cancelada) return;
    inicio ??= ahora;
    const transcurrido = ahora - inicio;
    if (transcurrido >= duracionMs) {
      terminar();
      return;
    }
    const progreso = transcurrido / duracionMs;
    alActualizar(
      parametros && resorte
        ? hasta + desplazamientoResorte(transcurrido / 1000, desde - hasta, resorte.velocidad, parametros)
        : desde + (hasta - desde) * facilidad(progreso)
    );
    cuadro = requestAnimationFrame(paso);
  };
  cuadro = requestAnimationFrame(paso);

  return {
    cancelar: () => {
      if (cancelada) return;
      cancelada = true;
      cancelAnimationFrame(cuadro);
      alTerminar?.(false);
    },
  };
}
