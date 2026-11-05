/** Port de las funciones puras de SpotlightCard (React Bits): temas, curva de caída y degradados. */

export type FormaSpotlight = 'circle' | 'beam';
export type TemaSpotlight = 'dark' | 'light';

interface PaletaSpotlight {
  surface: string;
  border: string;
  shadow: string;
  light: string;
  fill: number;
  edge: number;
}

export const TEMAS_SPOTLIGHT: Record<TemaSpotlight, PaletaSpotlight> = {
  dark: {
    surface: '#111111',
    border: 'rgba(255, 255, 255, 0.08)',
    shadow: '0 24px 48px -24px rgba(0, 0, 0, 0.6)',
    light: '#ffffff',
    fill: 1,
    edge: 1,
  },
  light: {
    surface: '#ffffff',
    border: 'rgba(24, 24, 27, 0.1)',
    shadow: '0 1px 2px rgba(24, 24, 27, 0.04), 0 18px 40px -20px rgba(24, 24, 27, 0.16)',
    light: '#18181b',
    fill: 0.28,
    edge: 0.7,
  },
};

const FORMAS: readonly FormaSpotlight[] = ['circle', 'beam'];

export const RUIDO_SPOTLIGHT =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export const limitar = (valor: number, minimo: number, maximo: number): number => Math.min(maximo, Math.max(minimo, valor));

/** Lista de paradas de color con la caída de la luz: de disco nítido (0) a resplandor suave (1). */
export function caidaSpotlight(color: string, suavidad: number): string {
  const suave = limitar(suavidad, 0, 1);
  const nucleo = (1 - suave) ** 1.5 * 0.85;
  const parada = (alfa: number, en: number): string =>
    `color-mix(in srgb, ${color} ${(alfa * 100).toFixed(2)}%, transparent) ${(en * 100).toFixed(2)}%`;
  const lista = [parada(1, 0)];
  for (let i = 0; i <= 14; i++) {
    const t = nucleo + ((1 - nucleo) * i) / 14;
    const g = (t - nucleo) / (1 - nucleo);
    const suavizado = 1 - g * g * (3 - 2 * g);
    const resplandor = Math.exp(-4.6 * g * g) * (1 - g ** 6);
    lista.push(parada(suavizado + (resplandor - suavizado) * suave, t));
  }
  return lista.join(', ');
}

/** Degradado radial del círculo, o del haz que cae desde el borde superior. */
export function degradadoSpotlight(forma: FormaSpotlight, tamano: number, x: number, y: number, paradas: string): string {
  if (forma === 'beam') {
    const alcance = Math.max(tamano * 0.6, y + tamano * 0.55);
    return `radial-gradient(${(tamano * 0.55).toFixed(1)}px ${alcance.toFixed(1)}px at ${x.toFixed(1)}px 0px, ${paradas})`;
  }
  return `radial-gradient(circle ${tamano.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, ${paradas})`;
}

export interface EntradasSpotlight {
  spotlightColor: string;
  intensity: number;
  spotlightSize: number;
  softness: number;
  shape: string;
  borderGlow: number;
  proximity: number;
  smoothing: number;
  ambient: boolean;
  flare: boolean;
  grain: number;
  theme: string;
  /** En pantallas táctiles no hay cursor: la luz se mueve sola para no quedar apagada. */
  tactil: boolean;
}

export interface AjustesSpotlight {
  shape: FormaSpotlight;
  fill: string;
  edge: string;
  size: number;
  intensity: number;
  borderGlow: number;
  proximity: number;
  smoothing: number;
  ambient: boolean;
  flare: boolean;
  grain: number;
  borde: string;
}

export function paletaDe(tema: string): PaletaSpotlight {
  return TEMAS_SPOTLIGHT[tema as TemaSpotlight] ?? TEMAS_SPOTLIGHT.dark;
}

export function crearAjustes(entradas: EntradasSpotlight): AjustesSpotlight {
  const paleta = paletaDe(entradas.theme);
  const color = entradas.spotlightColor || paleta.light;
  return {
    shape: FORMAS.includes(entradas.shape as FormaSpotlight) ? (entradas.shape as FormaSpotlight) : 'circle',
    fill: caidaSpotlight(color, entradas.softness),
    edge: caidaSpotlight(color, 1),
    size: Math.max(20, entradas.spotlightSize),
    intensity: limitar(entradas.intensity, 0, 1) * paleta.fill,
    borderGlow: limitar(entradas.borderGlow, 0, 1) * paleta.edge,
    proximity: Math.max(0, entradas.proximity),
    smoothing: limitar(entradas.smoothing, 0, 1),
    ambient: entradas.ambient || entradas.tactil,
    flare: entradas.flare,
    grain: limitar(entradas.grain, 0, 1),
    borde: paleta.border,
  };
}
