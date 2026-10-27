import { Component } from '@angular/core';

import { Cita, SolicitudServicio } from '../../../core/models/cita';
import { FranjaDisponible } from '../../../core/models/disponibilidad';
import { EspecialidadResponse } from '../../../core/services/tecnico.service';
import { hoyIso } from '../../../core/utils/fecha-local';
import { BorradorDetalle, SolicitudCreada } from './detalle-solicitud/detalle-solicitud.component';

type Paso = 'especialidad' | 'detalle' | 'franja' | 'confirmar' | 'confirmada';

@Component({
  selector: 'app-solicitar-servicio',
  standalone: false,
  templateUrl: './solicitar-servicio.component.html',
})
export class SolicitarServicioComponent {
  readonly pasos: { id: Paso; etiqueta: string }[] = [
    { id: 'especialidad', etiqueta: 'Especialidad' },
    { id: 'detalle', etiqueta: 'Detalles' },
    { id: 'franja', etiqueta: 'Horario' },
    { id: 'confirmar', etiqueta: 'Confirmar' },
  ];

  paso: Paso = 'especialidad';

  especialidad: EspecialidadResponse | null = null;
  borradorDetalle: BorradorDetalle | null = null;
  solicitud: SolicitudServicio | null = null;
  latitud: number | null = null;
  longitud: number | null = null;
  fecha = hoyIso();
  franja: FranjaDisponible | null = null;
  avisoFranjas: string | null = null;
  cita: Cita | null = null;

  get indicePaso(): number {
    const indice = this.pasos.findIndex((p) => p.id === this.paso);
    return indice === -1 ? this.pasos.length : indice;
  }

  onEspecialidadSeleccionada(especialidad: EspecialidadResponse): void {
    this.especialidad = especialidad;
    this.irA('detalle');
  }

  onSolicitudCreada(evento: SolicitudCreada): void {
    // A partir de aquí la solicitud ya existe (PENDIENTE) en el backend: no se
    // permite volver a editar los detalles para no crear solicitudes duplicadas.
    this.solicitud = evento.solicitud;
    this.latitud = evento.latitud;
    this.longitud = evento.longitud;
    this.borradorDetalle = null;
    this.irA('franja');
  }

  onFranjaSeleccionada(franja: FranjaDisponible): void {
    this.franja = franja;
    this.avisoFranjas = null;
    this.irA('confirmar');
  }

  onFranjaNoDisponible(mensaje: string): void {
    this.franja = null;
    this.avisoFranjas = mensaje;
    this.irA('franja');
  }

  onCitaConfirmada(cita: Cita): void {
    this.cita = cita;
    this.irA('confirmada');
  }

  volverAEspecialidad(): void {
    this.irA('especialidad');
  }

  volverAFranjas(): void {
    this.franja = null;
    this.irA('franja');
  }

  solicitarOtroServicio(): void {
    this.especialidad = null;
    this.borradorDetalle = null;
    this.solicitud = null;
    this.latitud = null;
    this.longitud = null;
    this.fecha = hoyIso();
    this.franja = null;
    this.avisoFranjas = null;
    this.cita = null;
    this.irA('especialidad');
  }

  private irA(paso: Paso): void {
    this.paso = paso;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
