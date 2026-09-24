import { ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  form: FormGroup;
  mostrarContrasena = false;
  cargando = false;
  errorMensaje: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  get correo() {
    return this.form.get('correo');
  }

  get contrasena() {
    return this.form.get('contrasena');
  }

  alternarContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMensaje = null;
    this.cargando = true;

    this.authService.login(this.form.value).subscribe({
      next: (response) => {
        this.cargando = false;
        this.cdr.markForCheck();
        this.authService.redirigirSegunRolYPerfil(this.router, response.perfilCompleto);
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje =
          err?.status === 401
            ? 'Correo o contraseña incorrectos.'
            : 'No fue posible iniciar sesión. Intenta de nuevo.';
        this.cdr.markForCheck();
      },
    });
  }
}