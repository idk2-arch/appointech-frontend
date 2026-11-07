import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { finalize, map, Observable, Subscription } from 'rxjs';

import type { ActualizarPerfilRequest, Perfil } from '../../core/models/perfil';
import { AuthService } from '../../core/services/auth.service';
import { FotoPerfilService } from '../../core/services/foto-perfil.service';
import { PerfilService } from '../../core/services/perfil.service';
import { SesionService } from '../../core/services/sesion.service';
import { obtenerMensajeError, obtenerMensajeErrorEscritura } from '../../core/utils/manejo-errores';
import { etiquetaRol, nombreCompleto } from '../../core/utils/nombre-persona';
import { resolverUrlFoto } from '../../core/utils/url-foto';
import { PATRON_ENGRANAJES } from '../profile-card/profile-card.temas';

/** Página "Mi perfil" de cualquier rol: la foto y los datos de la persona, que puede editar. */
@Component({
  selector: 'app-mi-perfil',
  standalone: false,
  templateUrl: './mi-perfil.component.html',
})
export class MiPerfilComponent implements OnInit, OnDestroy {
  private readonly sesion = inject(SesionService);

  readonly fotoUrl$ = this.sesion.fotoUrl$;
  /** Patrón de engranajes por el que se ve la lámina holográfica de la tarjeta. */
  readonly patron = PATRON_ENGRANAJES;
  /** Filas del esqueleto del panel de datos mientras llega el perfil. */
  readonly esqueletoFilas = [1, 2, 3, 4];

  perfil: Perfil | null = null;
  cargando = true;
  errorCarga: string | null = null;

  guardandoDatos = false;
  errorDatos: string | null = null;

  enviando = false;
  errorMensaje: string | null = null;
  mensajeExito: string | null = null;

  private peticion?: Subscription;
  private consulta?: Subscription;
  private guardado?: Subscription;

  constructor(
    private fotoService: FotoPerfilService,
    private perfilService: PerfilService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  /** Rol del token; el perfil puede traer el suyo, que manda si existe. */
  get rol(): string | null {
    return this.perfil?.rol ?? this.authService.obtenerRol();
  }

  get nombreTarjeta(): string {
    return this.perfil ? nombreCompleto(this.perfil.nombre, this.perfil.apellido) : '';
  }

  get rolTarjeta(): string {
    return etiquetaRol(this.rol);
  }

  /** Foto de la sesión lista para la tarjeta; sin foto, la tarjeta muestra las iniciales. */
  urlFoto(fotoUrl: string | null): string {
    return resolverUrlFoto(fotoUrl) ?? '';
  }

  /** Con el perfil ya en memoria se pinta de inmediato y se refresca en segundo plano. */
  ngOnInit(): void {
    this.perfil = this.sesion.perfilActual;
    this.cargarPerfil();
  }

  ngOnDestroy(): void {
    this.peticion?.unsubscribe();
    this.consulta?.unsubscribe();
    this.guardado?.unsubscribe();
  }

  cargarPerfil(): void {
    this.consulta?.unsubscribe();
    this.cargando = this.perfil === null;
    this.errorCarga = null;

    this.consulta = this.perfilService
      .obtener()
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (perfil) => {
          this.perfil = perfil;
          this.sincronizarSesion(perfil);
        },
        // Si ya hay un perfil a la vista, un fallo al refrescar no lo reemplaza por un error.
        error: (err) => {
          if (this.perfil === null) this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar tu perfil.');
        },
      });
  }

  guardarDatos(solicitud: ActualizarPerfilRequest): void {
    this.guardado?.unsubscribe();
    this.guardandoDatos = true;
    this.errorDatos = null;
    this.mensajeExito = null;

    this.guardado = this.perfilService
      .actualizar(solicitud)
      .pipe(
        finalize(() => {
          this.guardandoDatos = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (actualizado) => {
          // Si el servidor no devuelve todo el perfil, se conserva lo que ya se tenía.
          const anterior = this.perfil;
          if (!anterior) return;
          this.perfil = { ...anterior, ...solicitud, ...actualizado };
          this.sincronizarSesion(this.perfil);
          this.mensajeExito = 'Tus datos fueron actualizados.';
        },
        error: (err) =>
          (this.errorDatos = obtenerMensajeErrorEscritura(err, 'guardar tus datos', 'Revisa los datos e intenta de nuevo.', {
            401: 'Tu sesión expiró. Inicia sesión de nuevo.',
          })),
      });
  }

  guardar(imagenBase64: string): void {
    this.cambiarFoto(this.fotoService.subirPropia(imagenBase64).pipe(map((r) => r.fotoUrl)), 'Tu foto fue actualizada.', 'No fue posible guardar la foto.');
  }

  quitar(): void {
    this.cambiarFoto(this.fotoService.quitarPropia().pipe(map(() => null)), 'Tu foto fue eliminada.', 'No fue posible quitar la foto.');
  }

  /** Envía el cambio de foto y, si sale bien, deja la nueva foto (o ninguna) en la sesión. */
  private cambiarFoto(cambio: Observable<string | null>, mensajeExito: string, mensajeFallo: string): void {
    this.peticion?.unsubscribe();
    this.enviando = true;
    this.errorMensaje = null;
    this.mensajeExito = null;

    this.peticion = cambio
      .pipe(
        finalize(() => {
          this.enviando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (fotoUrl) => {
          this.sesion.establecerFoto(fotoUrl);
          this.mensajeExito = mensajeExito;
        },
        error: (err) => (this.errorMensaje = obtenerMensajeError(err, mensajeFallo)),
      });
  }

  /** El menú lateral muestra el nombre y la foto de la sesión: se mantienen al día sin recargar la página. */
  private sincronizarSesion(perfil: Perfil): void {
    this.sesion.establecerPerfil(perfil);
    this.sesion.establecerNombre(nombreCompleto(perfil.nombre, perfil.apellido));
    if (perfil.fotoUrl !== undefined) this.sesion.establecerFoto(perfil.fotoUrl);
  }
}
