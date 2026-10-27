import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { SolicitudServicio } from '../../../../core/models/cita';
import { SolicitudService } from '../../../../core/services/solicitud.service';
import { EspecialidadResponse } from '../../../../core/services/tecnico.service';
import {
  estaEnColombia,
  validadoresLatitud,
  validadoresLongitud,
} from '../../../../core/utils/coordenadas';
import { obtenerMensajeError } from '../../../../core/utils/manejo-errores';
import { PuntoMapa } from '../../../../shared/mapa-ubicacion/mapa-ubicacion.component';
import { UbicacionElegida } from '../../../../shared/selector-direccion/selector-direccion.component';

export interface BorradorDetalle {
  descripcionProblema: string;
  direccionServicio: string;
  latitud: number | null;
  longitud: number | null;
}

export interface SolicitudCreada {
  solicitud: SolicitudServicio;
  latitud: number;
  longitud: number;
}

@Component({
  selector: 'app-detalle-solicitud',
  standalone: false,
  templateUrl: './detalle-solicitud.component.html',
})
export class DetalleSolicitudComponent implements OnInit, OnDestroy {
  @Input({ required: true }) especialidad!: EspecialidadResponse;
  @Input() borrador: BorradorDetalle | null = null;
  @Output() borradorCambio = new EventEmitter<BorradorDetalle>();
  @Output() creada = new EventEmitter<SolicitudCreada>();
  @Output() volver = new EventEmitter<void>();

  form: FormGroup;
  cargando = false;
  errorMensaje: string | null = null;

  /** Ubicación elegida (dirección, GPS o pin); null hasta que se elija. Las coordenadas nunca se muestran. */
  puntoMapa: PuntoMapa | null = null;

  /** Error del backend por coordenadas (400), mostrado junto al mapa. */
  errorUbicacionServidor: string | null = null;

  private cambiosForm?: Subscription;

  constructor(
    private fb: FormBuilder,
    private solicitudService: SolicitudService,
    private cdr: ChangeDetectorRef
  ) {
    // direccionServicio, latitud y longitud viajan en el POST con estos nombres exactos.
    // latitud/longitud no se muestran ni se escriben: las llena el selector de dirección.
    this.form = this.fb.group({
      descripcionProblema: ['', [Validators.required]],
      direccionServicio: ['', [Validators.required]],
      latitud: [null as number | null, [Validators.required, ...validadoresLatitud]],
      longitud: [null as number | null, [Validators.required, ...validadoresLongitud]],
    });
  }

  ngOnInit(): void {
    if (this.borrador) {
      this.form.patchValue(this.borrador);
      const { latitud, longitud } = this.borrador;
      if (latitud !== null && longitud !== null) {
        this.puntoMapa = { latitud, longitud };
      }
    }
    this.cambiosForm = this.form.valueChanges.subscribe((valor) => this.borradorCambio.emit(valor));
  }

  ngOnDestroy(): void {
    this.cambiosForm?.unsubscribe();
  }

  get descripcionProblema() {
    return this.form.get('descripcionProblema');
  }

  get direccionServicio() {
    return this.form.get('direccionServicio');
  }

  get puntoEnColombia(): boolean {
    return !!this.puntoMapa && estaEnColombia(this.puntoMapa.latitud, this.puntoMapa.longitud);
  }

  /** "Confirmar" solo se habilita con descripción, dirección y una ubicación válida. */
  get puedeContinuar(): boolean {
    return this.form.valid && this.puntoEnColombia;
  }

  // ---- Descripción por voz ----

  agregarDictado(texto: string): void {
    const actual = String(this.descripcionProblema?.value ?? '').trimEnd();
    const nuevo = actual ? `${actual} ${texto}` : texto;
    this.descripcionProblema?.setValue(nuevo.charAt(0).toUpperCase() + nuevo.slice(1));
    this.descripcionProblema?.markAsTouched();
  }

  // ---- Ubicación ----

  /** Dirección elegida de la lista, GPS o pin movido: se guardan dirección y coordenadas (ocultas). */
  onUbicacionCambio(ubicacion: UbicacionElegida): void {
    this.errorUbicacionServidor = null;
    this.form.patchValue({ latitud: ubicacion.latitud, longitud: ubicacion.longitud });
    this.puntoMapa = { latitud: ubicacion.latitud, longitud: ubicacion.longitud };
    if (ubicacion.direccion !== null) {
      this.direccionServicio?.setValue(ubicacion.direccion);
      this.direccionServicio?.markAsTouched();
    }
  }

  onDireccionCambio(texto: string): void {
    this.direccionServicio?.setValue(texto);
    this.direccionServicio?.markAsTouched();
  }

  /** Hay texto escrito pero aún no se eligió un lugar. */
  get errorDireccion(): string | null {
    if (!this.puntoMapa && String(this.direccionServicio?.value ?? '').trim()) {
      return 'Elige tu dirección de la lista, o usa tu ubicación actual.';
    }
    return null;
  }

  // ---- Envío ----

  onSubmit(): void {
    if (!this.puedeContinuar) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando = true;
    this.errorMensaje = null;
    this.errorUbicacionServidor = null;

    const latitud = Number(this.form.get('latitud')?.value);
    const longitud = Number(this.form.get('longitud')?.value);

    this.solicitudService
      .crearSolicitud({
        especialidadId: this.especialidad.id,
        descripcionProblema: String(this.descripcionProblema?.value).trim(),
        direccionServicio: String(this.direccionServicio?.value).trim(),
        latitud,
        longitud,
      })
      .subscribe({
        next: (solicitud) => {
          this.cargando = false;
          this.creada.emit({ solicitud, latitud, longitud });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.cargando = false;
          const mensaje = obtenerMensajeError(err, 'No fue posible crear la solicitud. Intenta de nuevo.');
          // 400 por coordenadas: el mensaje del backend va junto al mapa.
          if (err instanceof HttpErrorResponse && err.status === 400 && /latitud|longitud|colombia/i.test(mensaje)) {
            this.errorUbicacionServidor = mensaje;
          } else {
            this.errorMensaje = mensaje;
          }
          this.cdr.markForCheck();
        },
      });
  }

}
