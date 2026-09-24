import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { AdminService, CrearAdministradorRequest } from '../../../../core/services/admin.service';

@Component({
  selector: 'app-crear-administrador-modal',
  standalone: false,
  templateUrl: './crear-administrador-modal.component.html',
  styleUrls: ['./crear-administrador-modal.component.css'],
})
export class CrearAdministradorModalComponent implements OnChanges {
  @Input() abierto = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() creado = new EventEmitter<void>();

  form: FormGroup;
  mostrarContrasena = false;
  cargando = false;
  errorMensaje: string | null = null;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required]],
      apellido: ['', [Validators.required]],
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(8)]],
      telefono: [''],
      tipoDocumento: ['', [Validators.required]],
      numeroDocumento: [''],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['abierto'] && this.abierto) {
      this.errorMensaje = null;
      this.cargando = false;
      this.mostrarContrasena = false;
      this.form.reset({
        nombre: '',
        apellido: '',
        correo: '',
        contrasena: '',
        telefono: '',
        tipoDocumento: '',
        numeroDocumento: '',
      });
    }
  }

  get nombre() {
    return this.form.get('nombre');
  }

  get apellido() {
    return this.form.get('apellido');
  }

  get correo() {
    return this.form.get('correo');
  }

  get contrasena() {
    return this.form.get('contrasena');
  }

  get tipoDocumento() {
    return this.form.get('tipoDocumento');
  }

  alternarContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.abierto && !this.cargando) {
      this.onCancelar();
    }
  }

  onCancelar(): void {
    this.cerrar.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMensaje = null;
    this.cargando = true;

    const datos: CrearAdministradorRequest = this.form.value;

    this.adminService.crearAdministrador(datos).subscribe({
      next: () => {
        this.cargando = false;
        this.creado.emit();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje =
          err?.status === 409
            ? 'Ya existe un usuario registrado con ese correo.'
            : 'No fue posible crear el administrador. Intenta de nuevo.';
        this.cdr.markForCheck();
      },
    });
  }
}
