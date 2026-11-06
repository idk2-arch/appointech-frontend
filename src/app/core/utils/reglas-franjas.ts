import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Límites que el servidor también valida; aquí solo adelantan el mensaje. */
export const RADIO_FRANJAS_MINIMO_KM = 1;
export const RADIO_FRANJAS_MAXIMO_KM = 100;
export const DURACION_BLOQUE_MINIMA_MIN = 15;
export const DURACION_BLOQUE_MAXIMA_MIN = 480;

const FORMATO_HORA = /^(\d{2}):(\d{2})(?::\d{2})?$/;

/** "08:00:00" o "08:00" → "08:00" (lo que entiende un <input type="time">). Vacío si no es una hora. */
export function aHoraInput(valor: string | null | undefined): string {
  const partes = FORMATO_HORA.exec(valor ?? '');
  return partes ? `${partes[1]}:${partes[2]}` : '';
}

/** Minutos desde la medianoche, o null si no es una hora válida ("HH:mm" o "HH:mm:ss"). */
export function minutosDeHora(valor: string | null | undefined): number | null {
  const partes = FORMATO_HORA.exec(valor ?? '');
  if (!partes) return null;
  const horas = Number.parseInt(partes[1], 10);
  const minutos = Number.parseInt(partes[2], 10);
  return horas < 24 && minutos < 60 ? horas * 60 + minutos : null;
}

/**
 * Reglas que dependen de varios campos: el inicio debe ser anterior al fin y la jornada debe contener al menos
 * un bloque completo. Se calla mientras falte un campo o sea inválido: de eso se encarga cada campo.
 */
export function jornadaValidator(grupo: AbstractControl): ValidationErrors | null {
  const inicio = minutosDeHora(grupo.get('horaInicioJornada')?.value);
  const fin = minutosDeHora(grupo.get('horaFinJornada')?.value);
  if (inicio === null || fin === null) return null;
  if (inicio >= fin) return { inicioNoAnterior: true };

  const duracion = Number(grupo.get('duracionBloqueMinutos')?.value);
  return Number.isFinite(duracion) && duracion > 0 && fin - inicio < duracion ? { sinBloqueCompleto: true } : null;
}

export interface ValoresReglasFranjas {
  duracionBloqueMinutos: number;
  horaInicioJornada: string;
  horaFinJornada: string;
}

/** Cambiar la duración o la jornada deja sin efecto las franjas ya ofrecidas; cambiar solo el radio, no. */
export function cambiaDuracionOJornada(antes: ValoresReglasFranjas, despues: ValoresReglasFranjas): boolean {
  return (
    antes.duracionBloqueMinutos !== despues.duracionBloqueMinutos ||
    aHoraInput(antes.horaInicioJornada) !== aHoraInput(despues.horaInicioJornada) ||
    aHoraInput(antes.horaFinJornada) !== aHoraInput(despues.horaFinJornada)
  );
}
