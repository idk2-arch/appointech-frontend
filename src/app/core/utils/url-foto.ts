import { API_BASE_URL } from '../config/api.config';

const URL_ABSOLUTA = /^(https?:|data:|blob:)/i;

/**
 * Las fotos llegan como ruta relativa del servidor ("/api/fotos/abc"). Se completa con el origen
 * de API_BASE_URL (el mismo host o proxy que usan las demás peticiones), sin repetir "/api".
 * Devuelve null cuando no hay foto.
 */
export function resolverUrlFoto(fotoUrl: string | null | undefined): string | null {
  if (!fotoUrl) return null;
  if (URL_ABSOLUTA.test(fotoUrl)) return fotoUrl;
  const origen = new URL(API_BASE_URL, document.baseURI).origin;
  return `${origen}${fotoUrl.startsWith('/') ? '' : '/'}${fotoUrl}`;
}
