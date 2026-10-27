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
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';

import { TecnicoAdminService } from '../../../../core/services/tecnico-admin.service';
import { EspecialidadResponse, TecnicoResponse, TecnicoService } from '../../../../core/services/tecnico.service';
import {
  aActualizarTecnico,
  aCrearTecnico,
  crearFormularioPersona,
  valoresFormularioTecnico,
} from '../../../../core/utils/formulario-persona';
import { obtenerMensajeError, obtenerMensajeErrorEscritura } from '../../../../core/utils/manejo-errores';

export interface TecnicoGuardado {
  tecnico: TecnicoResponse;
  creado: boolean;
}

/** Crear (tecnico = null) o editar un técnico con el mismo formulario. */
@Component({
  selector: 'app-tecnico-modal',
  standalone: false,
  templateUrl: './tecnico-modal.component.html',
})
export class TecnicoModalComponent implements OnChanges, OnDestroy {
  @Input() abierto = false;
  @Input() tecnico: TecnicoResponse | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<TecnicoGuardado>();

  form: FormGroup;
  catalogo: EspecialidadResponse[] = [];
  cargandoCatalogo = false;
  errorCatalogo: string | null = null;
  cargando = false;
  errorMensaje: string | null = null;

  private cargaCatalogo?: Subscription;

  constructor(
    private fb: FormBuilder,
    private tecnicoService: TecnicoService,
    private tecnicoAdminService: TecnicoAdminService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.crearFormulario();
  }

  get esEdicion(): boolean {
    return this.tecnico !== null;
  }

  get controlEspecialidades(): FormControl<number[] | null> {
    return this.form.get('especialidadIds') as FormControl<number[] | null>;
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (!cambios['abierto'] || !this.abierto) return;

    this.errorMensaje = null;
    this.cargando = false;
    this.form = this.crearFormulario();
    this.form.patchValue(valoresFormularioTecnico(this.tecnico));
    this.cargarCatalogo();
  }

  ngOnDestroy(): void {
    this.cargaCatalogo?.unsubscribe();
  }

  onCancelar(): void {
    this.cerrar.emit();
  }

  cargarCatalogo(): void {
    this.cargaCatalogo?.unsubscribe();
    this.cargandoCatalogo = true;
    this.errorCatalogo = null;

    this.cargaCatalogo = this.tecnicoService.obtenerEspecialidades().subscribe({
      next: (catalogo) => {
        this.catalogo = Array.isArray(catalogo) ? catalogo : [];
        this.cargandoCatalogo = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargandoCatalogo = false;
        this.errorCatalogo = obtenerMensajeError(err, 'No pudimos cargar las especialidades.');
        this.cdr.markForCheck();
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMensaje = 'Revisa los campos marcados en rojo para continuar.';
      return;
    }

    this.errorMensaje = null;
    this.cargando = true;

    const valor = this.form.value;
    const peticion = this.tecnico
      ? this.tecnicoAdminService.actualizar(this.tecnico.id, aActualizarTecnico(valor))
      : this.tecnicoAdminService.crear(aCrearTecnico(valor));

    peticion.subscribe({
      next: (tecnico) => {
        this.cargando = false;
        this.guardado.emit({ tecnico, creado: !this.esEdicion });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje = this.mensajeDeError(err);
        this.cdr.markForCheck();
      },
    });
  }

  private crearFormulario(): FormGroup {
    return crearFormularioPersona(this.fb, { tecnico: true, edicion: this.esEdicion });
  }

  private mensajeDeError(err: unknown): string {
    return obtenerMensajeErrorEscritura(
      err,
      this.esEdicion ? 'guardar los cambios' : 'crear el técnico',
      'Algún dato no es válido. Revisa la ubicación y las especialidades.'
    );
  }
}
