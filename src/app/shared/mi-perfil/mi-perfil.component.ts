import { ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { finalize, Subscription } from 'rxjs';

import { FotoPerfilService } from '../../core/services/foto-perfil.service';
import { SesionService } from '../../core/services/sesion.service';
import { obtenerMensajeError } from '../../core/utils/manejo-errores';

/** Página "Mi perfil" de cualquier rol: por ahora, la foto propia. */
@Component({
  selector: 'app-mi-perfil',
  standalone: false,
  templateUrl: './mi-perfil.component.html',
})
export class MiPerfilComponent implements OnDestroy {
  private readonly sesion = inject(SesionService);

  readonly fotoUrl$ = this.sesion.fotoUrl$;

  enviando = false;
  errorMensaje: string | null = null;
  mensajeExito: string | null = null;

  private peticion?: Subscription;

  constructor(
    private fotoService: FotoPerfilService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnDestroy(): void {
    this.peticion?.unsubscribe();
  }

  guardar(imagenBase64: string): void {
    this.comenzar();
    this.peticion = this.fotoService
      .subirPropia(imagenBase64)
      .pipe(finalize(() => this.terminar()))
      .subscribe({
        next: ({ fotoUrl }) => this.confirmar(fotoUrl, 'Tu foto fue actualizada.'),
        error: (err) => (this.errorMensaje = obtenerMensajeError(err, 'No fue posible guardar la foto.')),
      });
  }

  quitar(): void {
    this.comenzar();
    this.peticion = this.fotoService
      .quitarPropia()
      .pipe(finalize(() => this.terminar()))
      .subscribe({
        next: () => this.confirmar(null, 'Tu foto fue eliminada.'),
        error: (err) => (this.errorMensaje = obtenerMensajeError(err, 'No fue posible quitar la foto.')),
      });
  }

  private comenzar(): void {
    this.peticion?.unsubscribe();
    this.enviando = true;
    this.errorMensaje = null;
    this.mensajeExito = null;
  }

  private confirmar(fotoUrl: string | null, mensaje: string): void {
    this.sesion.establecerFoto(fotoUrl);
    this.mensajeExito = mensaje;
  }

  private terminar(): void {
    this.enviando = false;
    this.cdr.markForCheck();
  }
}
