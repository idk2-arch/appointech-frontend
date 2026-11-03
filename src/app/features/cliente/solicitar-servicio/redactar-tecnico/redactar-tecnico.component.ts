import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Subscription } from 'rxjs';

import { PreDiagnosticoService } from '../../../../core/services/pre-diagnostico.service';
import { armarSolicitudIA } from '../../../../core/utils/solicitud-ia';

export const MENSAJE_REDACCION_NO_DISPONIBLE =
  'No pudimos redactarlo ahora; puedes continuar con tu descripción';

/**
 * Pide a la IA reescribir la descripción en lenguaje técnico. No toca el campo por sí mismo: avisa el
 * texto nuevo (`redactado`) o el original por restaurar (`restaurar`) y quien lo usa decide qué hacer.
 * Nunca bloquea el formulario: si falla, la descripción del cliente queda como estaba.
 */
@Component({
  selector: 'app-redactar-tecnico',
  standalone: false,
  templateUrl: './redactar-tecnico.component.html',
})
export class RedactarTecnicoComponent implements OnChanges, OnDestroy {
  @Input() descripcion: string | null | undefined = '';
  @Input() especialidad: string | null | undefined = null;
  @Output() redactado = new EventEmitter<string>();
  @Output() restaurar = new EventEmitter<string>();

  cargando = false;
  aviso: string | null = null;

  /** Texto del cliente antes de redactar; solo existe mientras el campo conserve el texto redactado. */
  private original: string | null = null;
  private textoAplicado: string | null = null;
  private peticion?: Subscription;

  constructor(
    private servicio: PreDiagnosticoService,
    private cdr: ChangeDetectorRef,
  ) {}

  get puedeRedactar(): boolean {
    return (this.descripcion ?? '').trim().length > 0 && !this.cargando;
  }

  get puedeDeshacer(): boolean {
    return this.original !== null;
  }

  ngOnChanges(cambios: SimpleChanges): void {
    // Si la persona edita lo redactado, ya no hay un original que restaurar de forma limpia.
    if (
      cambios['descripcion'] &&
      this.original !== null &&
      this.descripcion !== this.textoAplicado
    ) {
      this.olvidarOriginal();
    }
  }

  ngOnDestroy(): void {
    this.peticion?.unsubscribe();
  }

  redactar(): void {
    if (!this.puedeRedactar) return;

    this.cargando = true;
    this.aviso = null;
    const textoCliente = this.descripcion ?? '';

    this.peticion = this.servicio
      .redactarTecnico(armarSolicitudIA(textoCliente, this.especialidad))
      .subscribe({
        next: ({ disponible, textoTecnico }) => {
          const texto = (textoTecnico ?? '').trim();
          if (disponible && texto) {
            this.original = textoCliente;
            this.textoAplicado = texto;
            this.redactado.emit(texto);
          } else {
            this.aviso = MENSAJE_REDACCION_NO_DISPONIBLE;
          }
          this.terminar();
        },
        // Red, 401, 500 o tiempo agotado: nunca se muestra el detalle técnico.
        error: () => {
          this.aviso = MENSAJE_REDACCION_NO_DISPONIBLE;
          this.terminar();
        },
      });
  }

  deshacer(): void {
    if (this.original === null) return;
    const original = this.original;
    this.olvidarOriginal();
    this.restaurar.emit(original);
  }

  private olvidarOriginal(): void {
    this.original = null;
    this.textoAplicado = null;
  }

  private terminar(): void {
    this.cargando = false;
    this.cdr.markForCheck();
  }
}
