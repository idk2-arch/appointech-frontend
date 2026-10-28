import {
  afterNextRender,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { finalize, Subscription } from 'rxjs';

import { FotoPerfilService } from '../../../../core/services/foto-perfil.service';
import { obtenerMensajeError } from '../../../../core/utils/manejo-errores';
import { FilaUsuario } from '../tabla-usuarios/tabla-usuarios.modelos';

/** Cambia la foto de otro usuario (PUT /admin/usuarios/{id}/foto). El backend no ofrece quitarla. */
@Component({
  selector: 'app-foto-usuario-modal',
  standalone: false,
  templateUrl: './foto-usuario-modal.component.html',
})
export class FotoUsuarioModalComponent implements OnChanges, OnDestroy {
  @Input() fila: FilaUsuario | null = null;
  @Output() cerrar = new EventEmitter<void>();
  /** Se emite con cada foto guardada, para que la lista se actualice. */
  @Output() actualizada = new EventEmitter<void>();

  @ViewChild('botonCerrar') private botonCerrar?: ElementRef<HTMLButtonElement>;

  fotoActual: string | null | undefined = null;
  enviando = false;
  errorMensaje: string | null = null;
  mensajeExito: string | null = null;

  private peticion?: Subscription;
  private readonly injector = inject(Injector);

  constructor(
    private fotoService: FotoPerfilService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['fila'] && this.fila) {
      this.fotoActual = this.fila.fotoUrl;
      this.errorMensaje = null;
      this.mensajeExito = null;
      this.enviando = false;
      afterNextRender(() => this.botonCerrar?.nativeElement.focus(), { injector: this.injector });
    }
  }

  ngOnDestroy(): void {
    this.peticion?.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    if (this.fila && !this.enviando) this.cerrar.emit();
  }

  guardar(imagenBase64: string): void {
    if (!this.fila) return;
    this.enviando = true;
    this.errorMensaje = null;
    this.mensajeExito = null;

    this.peticion?.unsubscribe();
    this.peticion = this.fotoService
      .subirDeUsuario(this.fila.usuarioId, imagenBase64)
      .pipe(
        finalize(() => {
          this.enviando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: ({ fotoUrl }) => {
          this.fotoActual = fotoUrl;
          this.mensajeExito = 'La foto fue actualizada.';
          this.actualizada.emit();
        },
        error: (err) => (this.errorMensaje = obtenerMensajeError(err, 'No fue posible guardar la foto.')),
      });
  }
}
