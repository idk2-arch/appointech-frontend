import { ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-completar-perfil',
  standalone: false,
  templateUrl: './completar-perfil.component.html',
  styleUrls: ['./completar-perfil.component.css'],
})
export class CompletarPerfilComponent {
  form: FormGroup;
  cargando = false;
  errorMensaje: string | null = null;
  readonly esCliente: boolean;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.esCliente = this.authService.obtenerRol() === 'CLIENTE';

    this.form = this.fb.group({
      telefono: ['', [Validators.required]],
      tipoDocumento: ['', [Validators.required]],
      numeroDocumento: ['', [Validators.required]],
      direccion: [
        '',
        this.esCliente ? [Validators.required] : [],
      ],
    });
  }

  get telefono() {
    return this.form.get('telefono');
  }

  get tipoDocumento() {
    return this.form.get('tipoDocumento');
  }

  get numeroDocumento() {
    return this.form.get('numeroDocumento');
  }

  get direccion() {
    return this.form.get('direccion');
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMensaje = null;
    this.cargando = true;

    const { telefono, tipoDocumento, numeroDocumento, direccion } = this.form.value;
    const datos = {
      telefono,
      tipoDocumento,
      numeroDocumento,
      ...(this.esCliente ? { direccion } : {}),
    };

    this.authService.completarPerfil(datos).subscribe({
      next: () => {
        this.cargando = false;
        this.cdr.markForCheck();
        this.authService.redirigirSegunRol(this.router);
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje = err?.error?.mensaje ?? 'No fue posible guardar tus datos. Intenta de nuevo.';
        this.cdr.markForCheck();
      },
    });
  }
}
