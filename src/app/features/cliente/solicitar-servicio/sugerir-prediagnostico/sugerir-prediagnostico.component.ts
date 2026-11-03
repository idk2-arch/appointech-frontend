import {
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { Subscription } from 'rxjs';

import { PreDiagnosticoService } from '../../../../core/services/pre-diagnostico.service';
import { armarSolicitudIA } from '../../../../core/utils/solicitud-ia';

export const MENSAJE_PREDIAGNOSTICO_NO_DISPONIBLE =
  'El pre-diagnóstico no está disponible en este momento';
export const ETIQUETA_ORIENTATIVO = 'Orientativo: no reemplaza la revisión del técnico';

/**
 * Pide una sugerencia de pre-diagnóstico a la IA para la descripción escrita. Es opcional y nunca
 * bloquea el formulario: ante cualquier fallo solo muestra un aviso neutro. No se guarda ni se envía con la cita.
 */
@Component({
  selector: 'app-sugerir-prediagnostico',
  standalone: false,
  templateUrl: './sugerir-prediagnostico.component.html',
})
export class SugerirPrediagnosticoComponent implements OnChanges, OnDestroy {
  @Input() descripcion: string | null | undefined = '';
  @Input() especialidad: string | null | undefined = null;

  readonly etiquetaOrientativo = ETIQUETA_ORIENTATIVO;

  cargando = false;
  /** Texto de la sugerencia (solo cuando la IA respondió con disponible=true). */
  sugerencia: string | null = null;
  /** Aviso neutro cuando no hay sugerencia: el mensaje recibido o el genérico. */
  aviso: string | null = null;

  private peticion?: Subscription;

  constructor(
    private servicio: PreDiagnosticoService,
    private cdr: ChangeDetectorRef,
  ) {}

  get textoDescripcion(): string {
    return (this.descripcion ?? '').trim();
  }

  get puedeSugerir(): boolean {
    return this.textoDescripcion.length > 0 && !this.cargando;
  }

  ngOnChanges(cambios: SimpleChanges): void {
    // Una sugerencia de otra descripción ya no aplica.
    if (cambios['descripcion'] && !cambios['descripcion'].firstChange && !this.cargando) {
      this.sugerencia = null;
      this.aviso = null;
    }
  }

  ngOnDestroy(): void {
    this.peticion?.unsubscribe();
  }

  sugerir(): void {
    if (!this.puedeSugerir) return;

    this.cargando = true;
    this.sugerencia = null;
    this.aviso = null;

    this.peticion = this.servicio
      .sugerir(armarSolicitudIA(this.descripcion, this.especialidad))
      .subscribe({
        next: ({ disponible, sugerencia }) => {
          const texto = (sugerencia ?? '').trim();
          if (disponible && texto) {
            this.sugerencia = texto;
          } else {
            this.aviso = texto || MENSAJE_PREDIAGNOSTICO_NO_DISPONIBLE;
          }
          this.terminar();
        },
        // Red, 401, 500 o tiempo agotado: nunca se muestra el detalle técnico.
        error: () => {
          this.aviso = MENSAJE_PREDIAGNOSTICO_NO_DISPONIBLE;
          this.terminar();
        },
      });
  }

  private terminar(): void {
    this.cargando = false;
    this.cdr.markForCheck();
  }
}
