import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { aFechaHoraLocal, parsearFechaLocal } from './fecha-local';

export const MAX_MOTIVO = 500;
export const MAX_TEXTO_ELECTRODOMESTICO = 60;
export const MAX_DIAGNOSTICO = 2000;
export const MAX_RECOMENDACIONES = 1000;

/** Un motivo compuesto solo de espacios cuenta como vacío. */
export const noSoloEspacios: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.length > 0 && control.value.trim() === ''
    ? { required: true }
    : null;

export const validadoresMotivo = (obligatorio: boolean): ValidatorFn[] => [
  ...(obligatorio ? [Validators.required, noSoloEspacios] : []),
  Validators.maxLength(MAX_MOTIVO),
];

export const validadoresDiagnostico: ValidatorFn[] = [
  Validators.required,
  noSoloEspacios,
  Validators.maxLength(MAX_DIAGNOSTICO),
];

export const validadoresRecomendaciones: ValidatorFn[] = [Validators.maxLength(MAX_RECOMENDACIONES)];

/**
 * Valida un grupo con `fecha` (YYYY-MM-DD) y `hora` (HH:mm): la hora elegida no puede estar en el pasado.
 * `ahora` se inyecta para poder probarlo.
 */
export function validadorFechaHoraFutura(ahora: () => Date = () => new Date()): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const fecha = grupo.get('fecha')?.value;
    const hora = grupo.get('hora')?.value;
    if (!fecha || !hora) return null;
    return parsearFechaLocal(aFechaHoraLocal(fecha, hora)).getTime() <= ahora().getTime()
      ? { enElPasado: true }
      : null;
  };
}
