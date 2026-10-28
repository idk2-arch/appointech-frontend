import {
  afterNextRender,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import type { ActualizarPerfilRequest, Perfil } from '../../core/models/perfil';
import { TIPOS_DOCUMENTO } from '../../core/utils/formulario-persona';
import { etiquetaRol, nombreCompleto } from '../../core/utils/nombre-persona';
import { noSoloEspacios } from '../../core/utils/validadores-cita';

/**
 * Datos del perfil en modo lectura, con un botón "Editar" que abre el formulario de los cuatro
 * campos editables (nombre, apellido, teléfono y dirección). Lo comparten cliente, técnico y
 * administrador. No habla con el servidor: quien lo usa recibe la solicitud en `guardar`, informa
 * si está `guardando` o hubo un `errorMensaje`, y el formulario se cierra solo cuando el guardado termina bien.
 */
@Component({
  selector: 'app-perfil-datos',
  standalone: false,
  templateUrl: './perfil-datos.component.html',
})
export class PerfilDatosComponent implements OnChanges {
  @Input({ required: true }) perfil!: Perfil;
  /** Rol de la persona (ADMINISTRADOR, CLIENTE o TECNICO); el administrador no tiene dirección. */
  @Input() rol: string | null = null;
  @Input() guardando = false;
  @Input() errorMensaje: string | null = null;
  @Output() guardar = new EventEmitter<ActualizarPerfilRequest>();

  readonly form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, noSoloEspacios]],
    apellido: ['', [Validators.required, noSoloEspacios]],
    telefono: [''],
    direccion: [''],
  });

  editando = false;

  /** Se envió el formulario y falta saber cómo terminó el guardado. */
  private envioPendiente = false;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  get conDireccion(): boolean {
    return this.rol !== 'ADMINISTRADOR';
  }

  get esTecnico(): boolean {
    return this.rol === 'TECNICO';
  }

  get nombre(): string {
    return nombreCompleto(this.perfil.nombre, this.perfil.apellido);
  }

  get etiquetaRol(): string {
    return etiquetaRol(this.rol ?? this.perfil.rol);
  }

  get documento(): string {
    const tipo = TIPOS_DOCUMENTO.find((t) => t.valor === this.perfil.tipoDocumento)?.etiqueta;
    return [tipo, this.perfil.numeroDocumento].filter(Boolean).join(' ');
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (!this.envioPendiente || this.guardando) return;
    if (this.errorMensaje) {
      // El guardado falló: el formulario sigue abierto para corregir.
      this.envioPendiente = false;
      return;
    }
    // Terminó bien (llegó el perfil actualizado o acabó de guardar): vuelve a la vista de lectura.
    if (cambios['perfil'] || cambios['guardando']) {
      this.envioPendiente = false;
      this.cerrarEdicion();
    }
  }

  editar(): void {
    this.form.reset({
      nombre: this.perfil.nombre,
      apellido: this.perfil.apellido,
      telefono: this.perfil.telefono ?? '',
      direccion: this.perfil.direccion ?? '',
    });
    const direccion = this.form.controls.direccion;
    direccion.setValidators(this.conDireccion ? [Validators.required, noSoloEspacios] : []);
    direccion.updateValueAndValidity();
    this.editando = true;
    this.enfocar('input');
  }

  cancelar(): void {
    if (!this.guardando) this.cerrarEdicion();
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { nombre, apellido, telefono, direccion } = this.form.getRawValue();
    const solicitud: ActualizarPerfilRequest = { nombre: nombre.trim(), apellido: apellido.trim() };
    // Los campos opcionales vacíos se omiten: el backend no modifica lo ausente.
    if (telefono.trim()) solicitud.telefono = telefono.trim();
    if (this.conDireccion && direccion.trim()) solicitud.direccion = direccion.trim();
    this.envioPendiente = true;
    this.guardar.emit(solicitud);
  }

  invalido(campo: 'nombre' | 'apellido' | 'direccion'): boolean {
    const control = this.form.controls[campo];
    return control.invalid && control.touched;
  }

  private cerrarEdicion(): void {
    this.envioPendiente = false;
    this.editando = false;
    this.enfocar('[data-editar]');
  }

  /** Lleva el foco al primer campo al abrir el formulario y al botón "Editar" al cerrarlo. */
  private enfocar(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), { injector: this.injector });
  }
}
