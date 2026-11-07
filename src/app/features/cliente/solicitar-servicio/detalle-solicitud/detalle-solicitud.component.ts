import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { CrearSolicitudRequest, UrgenciaCita } from '../../../../core/models/cita';
import { EspecialidadResponse } from '../../../../core/services/tecnico.service';
import {
  estaEnColombia,
  validadoresLatitud,
  validadoresLongitud,
} from '../../../../core/utils/coordenadas';
import { MAX_TEXTO_ELECTRODOMESTICO } from '../../../../core/utils/validadores-cita';
import { PuntoMapa } from '../../../../shared/mapa-ubicacion/mapa-ubicacion.component';
import { OpcionSelect } from '../../../../shared/select/select.component';
import { UbicacionElegida } from '../../../../shared/selector-direccion/selector-direccion.component';

export interface BorradorDetalle {
  descripcionProblema: string;
  direccionServicio: string;
  latitud: number | null;
  longitud: number | null;
  marcaElectrodomestico?: string;
  modeloElectrodomestico?: string;
  urgencia?: UrgenciaCita;
  /** Fotos elegidas (data URL) que se suben cuando la cita ya existe. */
  fotos?: string[];
}

/**
 * Lo que el formulario ya validó. Nada se envía al backend en este paso: la solicitud se crea una sola vez,
 * al confirmar la cita en el último paso, y las fotos se suben entonces a la cita creada.
 */
export interface DetallesListos {
  datos: CrearSolicitudRequest;
  fotos: string[];
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
  @Output() listos = new EventEmitter<DetallesListos>();
  @Output() volver = new EventEmitter<void>();

  readonly maxTexto = MAX_TEXTO_ELECTRODOMESTICO;
  readonly opcionesUrgencia: OpcionSelect[] = [
    { value: 'NORMAL', label: 'Normal' },
    { value: 'URGENTE', label: 'Urgente' },
  ];

  form: FormGroup;
  fotos: string[] = [];

  /** Ubicación elegida (dirección, GPS o pin); null hasta que se elija. Las coordenadas nunca se muestran. */
  puntoMapa: PuntoMapa | null = null;

  private cambiosForm?: Subscription;

  constructor(private fb: FormBuilder) {
    // direccionServicio, latitud y longitud viajan en el POST con estos nombres exactos.
    // latitud/longitud no se muestran ni se escriben: las llena el selector de dirección.
    this.form = this.fb.group({
      descripcionProblema: ['', [Validators.required]],
      direccionServicio: ['', [Validators.required]],
      latitud: [null as number | null, [Validators.required, ...validadoresLatitud]],
      longitud: [null as number | null, [Validators.required, ...validadoresLongitud]],
      marcaElectrodomestico: ['', [Validators.maxLength(MAX_TEXTO_ELECTRODOMESTICO)]],
      modeloElectrodomestico: ['', [Validators.maxLength(MAX_TEXTO_ELECTRODOMESTICO)]],
      urgencia: ['NORMAL' as UrgenciaCita],
    });
  }

  ngOnInit(): void {
    if (this.borrador) {
      this.form.patchValue(this.borrador);
      this.fotos = this.borrador.fotos ?? [];
      const { latitud, longitud } = this.borrador;
      if (latitud !== null && longitud !== null) {
        this.puntoMapa = { latitud, longitud };
      }
    }
    this.cambiosForm = this.form.valueChanges.subscribe(() => this.emitirBorrador());
  }

  ngOnDestroy(): void {
    this.cambiosForm?.unsubscribe();
  }

  alCambiarFotos(fotos: string[]): void {
    this.fotos = fotos;
    this.emitirBorrador();
  }

  get marca() {
    return this.form.get('marcaElectrodomestico');
  }

  get modelo() {
    return this.form.get('modeloElectrodomestico');
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

  /** Texto que entra por la IA (redactado o restaurado): el campo queda editable, válido y modificado. */
  reemplazarDescripcion(texto: string): void {
    this.descripcionProblema?.setValue(texto);
    this.descripcionProblema?.markAsDirty();
    this.descripcionProblema?.markAsTouched();
  }

  // ---- Ubicación ----

  /** Dirección elegida de la lista, GPS o pin movido: se guardan dirección y coordenadas (ocultas). */
  onUbicacionCambio(ubicacion: UbicacionElegida): void {
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

  private emitirBorrador(): void {
    this.borradorCambio.emit({ ...this.form.value, fotos: this.fotos });
  }

  // ---- Envío ----

  /** Con todo válido, entrega los datos al asistente; no llama al backend. */
  onSubmit(): void {
    if (!this.puedeContinuar) {
      this.form.markAllAsTouched();
      return;
    }

    const marca = String(this.marca?.value ?? '').trim();
    const modelo = String(this.modelo?.value ?? '').trim();

    this.listos.emit({
      datos: {
        especialidadId: this.especialidad.id,
        descripcionProblema: String(this.descripcionProblema?.value).trim(),
        direccionServicio: String(this.direccionServicio?.value).trim(),
        latitud: Number(this.form.get('latitud')?.value),
        longitud: Number(this.form.get('longitud')?.value),
        ...(marca && { marcaElectrodomestico: marca }),
        ...(modelo && { modeloElectrodomestico: modelo }),
        urgencia: this.form.get('urgencia')?.value as UrgenciaCita,
      },
      fotos: this.fotos,
    });
  }
}
