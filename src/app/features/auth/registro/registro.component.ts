import { ChangeDetectorRef, Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

function contrasenasCoincidenValidator(group: AbstractControl): ValidationErrors | null {
  const contrasena = group.get('contrasena')?.value;
  const confirmarContrasena = group.get('confirmarContrasena')?.value;
  return contrasena === confirmarContrasena ? null : { contrasenasNoCoinciden: true };
}

@Component({
  selector: 'app-registro',
  standalone: false,
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css'],
})
export class RegistroComponent {
  form: FormGroup;
  mostrarContrasena = false;
  mostrarConfirmarContrasena = false;
  cargando = false;
  errorMensaje: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group(
      {
        nombre: ['', [Validators.required]],
        correo: ['', [Validators.required, Validators.email]],
        contrasena: ['', [Validators.required, Validators.minLength(8)]],
        confirmarContrasena: ['', [Validators.required]],
        telefono: ['', [Validators.required]],
        numeroDocumento: ['', [Validators.required]],
        direccion: ['', [Validators.required]],
      },
      { validators: contrasenasCoincidenValidator }
    );
  }

  get nombre() {
    return this.form.get('nombre');
  }

  get correo() {
    return this.form.get('correo');
  }

  get contrasena() {
    return this.form.get('contrasena');
  }

  get confirmarContrasena() {
    return this.form.get('confirmarContrasena');
  }

  get telefono() {
    return this.form.get('telefono');
  }

  get numeroDocumento() {
    return this.form.get('numeroDocumento');
  }

  get direccion() {
    return this.form.get('direccion');
  }

  alternarContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  alternarConfirmarContrasena(): void {
    this.mostrarConfirmarContrasena = !this.mostrarConfirmarContrasena;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMensaje = null;
    this.cargando = true;

    const { confirmarContrasena, ...datos } = this.form.value;

    this.authService.registrarCliente(datos).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate([this.authService.estaAutenticado() ? '/' : '/login']);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje =
          err?.status === 409
            ? 'Ya existe una cuenta registrada con ese correo.'
            : 'No fue posible completar el registro. Intenta de nuevo.';
        this.cdr.markForCheck();
      },
    });
  }
}
