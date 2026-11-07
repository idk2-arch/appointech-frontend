import { afterNextRender, Component, ElementRef, EventEmitter, inject, Injector, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import type { CalificarServicioRequest } from '../../../core/models/calificacion';
import type { CitaResumen } from '../../../core/models/cita';
import {
  agregarSugerencia,
  ayudaDePuntuacion,
  ETIQUETAS_PUNTUACION,
  fraseDePuntuacion,
  MAX_COMENTARIO_CALIFICACION,
  quitarSugerencia,
  sugerenciasDePuntuacion,
} from '../../../core/utils/calificacion';

/**
 * Diálogo para calificar un servicio finalizado: de 1 a 5 estrellas, una frase según la nota, sugerencias que
 * ayudan a escribir el comentario (opcional, máx. 500) y, ya enviada, una pantalla de agradecimiento.
 * Solo se envían la puntuación y el comentario; las sugerencias son únicamente ayuda de redacción.
 */
@Component({
  selector: 'app-calificar-modal',
  standalone: false,
  templateUrl: './calificar-modal.component.html',
  styleUrl: './calificar-modal.component.css',
})
export class CalificarModalComponent implements OnChanges {
  /** La cita que se califica: da el técnico, el servicio, la fecha y la dirección del encabezado. */
  @Input() cita: CitaResumen | null = null;
  @Input() cargando = false;
  @Input() errorMensaje: string | null = null;
  /** La calificación ya se guardó: se muestra el agradecimiento en vez del formulario. */
  @Input() enviada = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() confirmar = new EventEmitter<CalificarServicioRequest>();

  readonly etiquetas = ETIQUETAS_PUNTUACION;
  readonly maximo = MAX_COMENTARIO_CALIFICACION;

  puntuacion = 0;
  comentario = '';

  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  get frase(): string {
    return fraseDePuntuacion(this.puntuacion);
  }

  get ayuda(): string {
    return ayudaDePuntuacion(this.puntuacion);
  }

  get sugerencias(): string[] {
    return sugerenciasDePuntuacion(this.puntuacion);
  }

  ngOnChanges(cambios: SimpleChanges): void {
    // El formulario desaparece al enviarse: el foco pasa al botón Cerrar para no quedar perdido.
    if (cambios['enviada']?.currentValue) {
      afterNextRender(() => this.anfitrion.nativeElement.querySelector<HTMLElement>('[data-cerrar]')?.focus(), { injector: this.injector });
    }
  }

  elegir(n: number): void {
    this.puntuacion = n;
  }

  activa(sugerencia: string): boolean {
    return this.comentario.includes(sugerencia);
  }

  alternar(sugerencia: string): void {
    this.comentario = this.activa(sugerencia) ? quitarSugerencia(this.comentario, sugerencia) : agregarSugerencia(this.comentario, sugerencia);
  }

  enviar(): void {
    if (!this.puntuacion || this.cargando) return;
    const comentario = this.comentario.trim();
    this.confirmar.emit(comentario ? { puntuacion: this.puntuacion, comentario } : { puntuacion: this.puntuacion });
  }
}
