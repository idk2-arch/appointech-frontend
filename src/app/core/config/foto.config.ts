/** Límites de las fotos de perfil. El navegador reduce la imagen antes de enviarla al servidor. */
export const FOTO_LADO_MAXIMO_PX = 512;
export const FOTO_CALIDAD = 0.85;
export const FOTO_TIPO_SALIDA = 'image/jpeg';
export const FOTO_TIPOS_PERMITIDOS: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];
/** Tamaño máximo de la imagen ya reducida. */
export const FOTO_TAMANIO_MAXIMO_BYTES = 1024 * 1024;
