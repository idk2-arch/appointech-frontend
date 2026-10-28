import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { finalize, Subscription } from 'rxjs';

import { Cita, SolicitudServicio } from '../../../core/models/cita';
import { FranjaDisponible } from '../../../core/models/disponibilidad';
import { FotoElectrodomesticoService } from '../../../core/services/foto-electrodomestico.service';
import { EspecialidadResponse } from '../../../core/services/tecnico.service';
import { hoyIso } from '../../../core/utils/fecha-local';
import { BorradorDetalle, SolicitudCreada } from './detalle-solicitud/detalle-solicitud.component';

type Paso = 'especialidad' | 'detalle' | 'franja' | 'confirmar' | 'confirmada';

@Component({
  selector: 'app-solicitar-servicio',
  standalone: false,
  templateUrl: './solicitar-servicio.component.html',
})
export class SolicitarServicioComponent implements OnDestroy {
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

  /** Subida de las fotos del electrodoméstico, que ocurre una vez creada la cita. */
  subiendoFotos = false;
  fotosPendientes: string[] = [];
  avisoFotos: string | null = null;

  private citaId: number | null = null;
  private subida?: Subscription;

  constructor(
    private fotoService: FotoElectrodomesticoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnDestroy(): void {
    this.subida?.unsubscribe();
  }

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
    this.citaId = evento.solicitud.id;
    this.subirFotos(evento.fotos);
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

  reintentarFotos(): void {
    this.subirFotos(this.fotosPendientes);
  }

  /**
   * La cita ya existe: si alguna foto falla, la cita sigue en pie y se avisa para reintentar
   * (o agregarlas después desde el detalle de la cita).
   */
  private subirFotos(fotos: string[]): void {
    this.avisoFotos = null;
    this.fotosPendientes = [];
    if (this.citaId === null || fotos.length === 0) return;

    this.subiendoFotos = true;
    this.subida?.unsubscribe();
    this.subida = this.fotoService
      .subirVarias(this.citaId, fotos)
      .pipe(
        finalize(() => {
          this.subiendoFotos = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (resultado) => this.avisarFallidas(resultado.fallidas, resultado.mensajeError),
        error: () => this.avisarFallidas(fotos, null),
      });
  }

  private avisarFallidas(fallidas: string[], motivo: string | null): void {
    this.fotosPendientes = fallidas;
    if (fallidas.length === 0) return;

    const cuantas = fallidas.length === 1 ? 'una foto' : `${fallidas.length} fotos`;
    this.avisoFotos =
      `Tu cita quedó creada, pero no pudimos subir ${cuantas}. ${motivo ? motivo + ' ' : ''}` +
      'Puedes reintentar ahora o agregarlas después desde Mis citas, mientras la cita esté pendiente o confirmada.';
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
    this.citaId = null;
    this.subida?.unsubscribe();
    this.subiendoFotos = false;
    this.fotosPendientes = [];
    this.avisoFotos = null;
    this.irA('especialidad');
  }

  private irA(paso: Paso): void {
    this.paso = paso;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
