import { FOTO_TAMANIO_MAXIMO_BYTES, FOTO_TIPOS_PERMITIDOS } from '../config/foto.config';

export interface Dimensiones {
  ancho: number;
  alto: number;
}

/** Error con un mensaje listo para mostrar a la persona. */
export class ErrorImagen extends Error {}

/** Reduce proporcionalmente para que el lado mayor no pase de `maximo`; nunca amplía. */
export function dimensionesReducidas(ancho: number, alto: number, maximo: number): Dimensiones {
  const escala = Math.min(1, maximo / Math.max(ancho, alto));
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) };
}

export function validarTipoImagen(tipo: string): void {
  if (!FOTO_TIPOS_PERMITIDOS.includes(tipo)) {
    throw new ErrorImagen('Elige una imagen JPEG, PNG o WebP.');
  }
}

/** Bytes que ocupa la imagen de una data URL en base64. */
export function bytesDeDataUrl(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const relleno = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - relleno;
}

export function validarTamanioFinal(dataUrl: string): void {
  if (bytesDeDataUrl(dataUrl) > FOTO_TAMANIO_MAXIMO_BYTES) {
    throw new ErrorImagen('La imagen sigue pesando más de 1 MB después de reducirla. Prueba con otra más pequeña.');
  }
}
