export const API_BASE_URL = 'http://localhost:8080/api';
export const GOOGLE_CLIENT_ID = '807071502568-l82mul3juccjja49frlrhfia92pgqha7.apps.googleusercontent.com';

/** Búsqueda de direcciones (geocodificación) con Geoapify. La clave está en geoapify.config.ts. */
export const GEOAPIFY_URL = 'https://api.geoapify.com/v1/geocode';
/** Espera máxima por una respuesta de geocodificación; pasado este tiempo se avisa del fallo. */
export const GEOCODIFICACION_TIMEOUT_MS = 8000;

/** Centro por defecto del mapa (Fusagasugá, Cundinamarca): latitud, longitud. */
export const UBICACION_POR_DEFECTO = { latitud: 4.3365, longitud: -74.3638 } as const;
