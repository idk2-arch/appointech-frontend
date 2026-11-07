/** Colores de cada tema: marco, recuadro, texto y sombras de la tarjeta. */
export const TEMAS: Record<'dark' | 'light', Record<string, string>> = {
  dark: {
    '--pc-frame': 'rgba(38, 35, 46, 0.66)',
    '--pc-frame-edge': 'rgba(255, 255, 255, 0.08)',
    '--pc-frame-highlight': 'rgba(255, 255, 255, 0.07)',
    '--pc-frame-shadow': '0 22px 44px -20px rgba(0, 0, 0, 0.8), 0 6px 16px -8px rgba(0, 0, 0, 0.5)',
    '--pc-tile': 'linear-gradient(180deg, #3a3644 0%, #27242f 100%)',
    '--pc-tile-edge': 'rgba(255, 255, 255, 0.07)',
    '--pc-tile-highlight': 'rgba(255, 255, 255, 0.12)',
    '--pc-tile-shadow': '0 4px 10px -4px rgba(0, 0, 0, 0.7)',
    '--pc-ink': '#f4f4f5',
    '--pc-muted': 'rgba(244, 244, 245, 0.6)',
    '--pc-hover': 'brightness(1.12)',
    '--pc-press': 'brightness(0.8)',
    '--pc-shade': 'rgba(0, 0, 0, 0.4)',
  },
  light: {
    '--pc-frame': 'rgba(240, 240, 243, 0.8)',
    '--pc-frame-edge': 'rgba(24, 24, 27, 0.07)',
    '--pc-frame-highlight': 'rgba(255, 255, 255, 0.95)',
    '--pc-frame-shadow': '0 22px 44px -22px rgba(24, 24, 27, 0.3), 0 6px 16px -10px rgba(24, 24, 27, 0.16)',
    '--pc-tile': 'linear-gradient(180deg, #ffffff 0%, #f6f6f8 100%)',
    '--pc-tile-edge': 'rgba(24, 24, 27, 0.08)',
    '--pc-tile-highlight': 'rgba(255, 255, 255, 1)',
    '--pc-tile-shadow': '0 4px 10px -5px rgba(24, 24, 27, 0.25)',
    '--pc-ink': '#27272a',
    '--pc-muted': 'rgba(39, 39, 42, 0.6)',
    '--pc-hover': 'brightness(0.97)',
    '--pc-press': 'brightness(0.92)',
    '--pc-shade': 'rgba(24, 24, 27, 0.14)',
  },
};

/** Cómo se funde la lámina holográfica según el fondo sea oscuro o claro. */
export const LAMINAS: Record<'dark' | 'light', Record<string, string>> = {
  dark: { '--pc-blend': 'color-dodge', '--pc-holo-filter': 'hue-rotate(0deg)', '--pc-sheen': 'rgba(255, 255, 255, 0.16)' },
  light: { '--pc-blend': 'multiply', '--pc-holo-filter': 'invert(1) hue-rotate(180deg)', '--pc-sheen': 'rgba(255, 255, 255, 0)' },
};

/** Ruido fino que da textura al brillo. */
export const GRANO = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500'><filter id='g' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0.55 0 0 0 -0.24 0.55 0 0 0 -0.24 0.55 0 0 0 -0.24 0 0 0 0 1'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>"
)}")`;

/**
 * Patrón repetible de engranajes con cruces (blanco sobre transparente): la lámina holográfica solo se ve a través de él.
 * Es el patrón por defecto de la pantalla Mi perfil.
 */
export const PATRON_ENGRANAJES = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120' fill='none' stroke='#fff'><circle cx='30' cy='30' r='12' stroke-width='6'/><circle cx='30' cy='30' r='19' stroke-width='7' stroke-dasharray='5 5.9'/><circle cx='90' cy='90' r='12' stroke-width='6'/><circle cx='90' cy='90' r='19' stroke-width='7' stroke-dasharray='5 5.9'/><path d='M90 24h16M98 16v16M14 96h16M22 88v16' stroke-width='4' stroke-linecap='round'/></svg>"
)}`;

/** ¿Es oscuro el color (#rgb o #rrggbb)? `null` si no se puede leer. */
export function esColorOscuro(color: string): boolean | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return null;
  const hex = m[1].length === 3 ? m[1].replace(/./g, (d) => d + d) : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
}
