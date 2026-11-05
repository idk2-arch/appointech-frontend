import type { CitaFinalizadaTecnico } from '../models/tecnico-agenda';
import { parsearFechaLocal } from './fecha-local';

/** Las más recientes primero, según la hora en que terminó el servicio. No modifica la lista original. */
export function ordenarMasRecientesPrimero(citas: readonly CitaFinalizadaTecnico[]): CitaFinalizadaTecnico[] {
  return [...citas].sort(
    (a, b) => parsearFechaLocal(b.fechaHoraFin).getTime() - parsearFechaLocal(a.fechaHoraFin).getTime()
  );
}

export function contarSinCostoFinal(citas: readonly CitaFinalizadaTecnico[]): number {
  return citas.filter((cita) => cita.estadoPago === 'SIN_COSTO_FINAL').length;
}
