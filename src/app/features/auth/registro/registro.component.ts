import { ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { aSolicitudCliente, crearFormularioPersona } from '../../../core/utils/formulario-persona';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { NEGOCIO_DRIFT_WALL_ITEMS } from '../../../shared/drift-wall/negocio-drift-wall-items';

@Component({
  selector: 'app-registro',
  standalone: false,
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css'],
})
export class RegistroComponent {
  form: FormGroup;
  cargando = false;
  errorMensaje: string | null = null;
  readonly driftWallItems = NEGOCIO_DRIFT_WALL_ITEMS;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.form = crearFormularioPersona(this.fb, { confirmarContrasena: true });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMensaje = 'Revisa los campos marcados en rojo para continuar.';
      return;
    }

    this.errorMensaje = null;
    this.cargando = true;

    this.authService.registrarCliente(aSolicitudCliente(this.form.value)).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate([this.authService.estaAutenticado() ? '/' : '/login']);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje =
          err?.status === 409
            ? 'Ya existe una cuenta con ese correo. Prueba con otro o inicia sesión.'
            : obtenerMensajeError(err, 'No fue posible crear la cuenta. Revisa los datos e intenta de nuevo.');
        this.cdr.markForCheck();
      },
    });
  }
}
