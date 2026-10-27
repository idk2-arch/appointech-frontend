import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/** Rango aceptado por el backend: el punto debe estar en Colombia. */
export const LIMITES_COLOMBIA = {
  latitudMin: -5,
  latitudMax: 14,
  longitudMin: -82,
  longitudMax: -66,
} as const;

export const MENSAJE_FUERA_DE_COLOMBIA = 'La ubicación debe estar en Colombia.';

export const validadoresLatitud: ValidatorFn[] = [
  Validators.min(LIMITES_COLOMBIA.latitudMin),
  Validators.max(LIMITES_COLOMBIA.latitudMax),
];

export const validadoresLongitud: ValidatorFn[] = [
  Validators.min(LIMITES_COLOMBIA.longitudMin),
  Validators.max(LIMITES_COLOMBIA.longitudMax),
];

export function estaEnColombia(latitud: number, longitud: number): boolean {
  return (
    latitud >= LIMITES_COLOMBIA.latitudMin &&
    latitud <= LIMITES_COLOMBIA.latitudMax &&
    longitud >= LIMITES_COLOMBIA.longitudMin &&
    longitud <= LIMITES_COLOMBIA.longitudMax
  );
}

function tieneValor(valor: unknown): boolean {
  return valor !== null && valor !== undefined && valor !== '';
}

/**
 * Validador de grupo para un par latitud/longitud.
 *  - `coordenadasIncompletas`: hay una sin la otra (aplica cuando el par es opcional).
 *  - `coordenadasInvertidas`: los valores encajan en Colombia si se intercambian
 *    (p. ej. latitud -74.36 y longitud 4.33), error típico al copiarlas.
 */
export function parCoordenadasValidator(campoLatitud = 'latitud', campoLongitud = 'longitud'): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const latitud = grupo.get(campoLatitud)?.value;
    const longitud = grupo.get(campoLongitud)?.value;
    const hayLatitud = tieneValor(latitud);
    const hayLongitud = tieneValor(longitud);

    if (hayLatitud !== hayLongitud) {
      return { coordenadasIncompletas: true };
    }
    if (hayLatitud && hayLongitud) {
      const lat = Number(latitud);
      const lng = Number(longitud);
      if (!estaEnColombia(lat, lng) && estaEnColombia(lng, lat)) {
        return { coordenadasInvertidas: true };
      }
    }
    return null;
  };
}
