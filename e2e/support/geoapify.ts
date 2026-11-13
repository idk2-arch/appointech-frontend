import type { Page } from '@playwright/test';

// Direccion fija dentro del radio del tecnico de pruebas (su base en Fusagasuga): la busqueda de direcciones es de
// un servicio externo (Geoapify) y se sustituye por una respuesta local para que las pruebas no dependan de la red.
export const DIRECCION_PRUEBA = {
  formatted: 'Carrera 12 # 7-18, Fusagasugá, Cundinamarca, Colombia',
  lat: 4.3432,
  lon: -74.3657,
};

const CABECERAS_CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
};

export async function simularGeocodificacion(page: Page): Promise<void> {
  await page.route('https://api.geoapify.com/**', (ruta) => {
    if (ruta.request().method() === 'OPTIONS') {
      return ruta.fulfill({ status: 204, headers: CABECERAS_CORS });
    }
    const cuerpo = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { formatted: DIRECCION_PRUEBA.formatted, lat: DIRECCION_PRUEBA.lat, lon: DIRECCION_PRUEBA.lon, place_id: 'e2e-direccion-1' },
          geometry: { type: 'Point', coordinates: [DIRECCION_PRUEBA.lon, DIRECCION_PRUEBA.lat] },
        },
      ],
    };
    return ruta.fulfill({ status: 200, contentType: 'application/json', headers: CABECERAS_CORS, body: JSON.stringify(cuerpo) });
  });
}
