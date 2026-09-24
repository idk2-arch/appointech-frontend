import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { AdminService, UsuarioAdmin } from '../../../../core/services/admin.service';

@Component({
  selector: 'app-usuario-editar-modal',
  standalone: false,
  templateUrl: './usuario-editar-modal.component.html',
})
export class UsuarioEditarModalComponent implements OnChanges {
  @Input() usuario: UsuarioAdmin | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() actualizado = new EventEmitter<void>();

  form: FormGroup;
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
      telefono: [''],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['usuario'] && this.usuario) {
      this.errorMensaje = null;
      this.cargando = false;
      this.form.reset({
        nombre: this.usuario.nombre,
        apellido: this.usuario.apellido,
        telefono: this.usuario.telefono ?? '',
      });
    }
  }

  get nombre() {
    return this.form.get('nombre');
  }

  get apellido() {
    return this.form.get('apellido');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.usuario && !this.cargando) {
      this.onCancelar();
    }
  }

  onCancelar(): void {
    this.cerrar.emit();
  }

  onSubmit(): void {
    if (!this.usuario || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMensaje = null;
    this.cargando = true;

    this.adminService.actualizarUsuario(this.usuario.id, this.form.value).subscribe({
      next: () => {
        this.cargando = false;
        this.actualizado.emit();
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargando = false;
        this.errorMensaje = 'No fue posible guardar los cambios. Intenta de nuevo.';
        this.cdr.markForCheck();
      },
    });
  }
}
