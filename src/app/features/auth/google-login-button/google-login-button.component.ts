import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { GoogleIdentityService } from '../../../core/services/google-identity.service';
import { despuesDelPrimerPintado } from '../../../core/utils/primer-pintado';

@Component({
  selector: 'app-google-login-button',
  standalone: false,
  templateUrl: './google-login-button.component.html',
})
export class GoogleLoginButtonComponent implements AfterViewInit, OnDestroy {
  @ViewChild('googleBtn', { static: true }) private googleBtnRef!: ElementRef<HTMLDivElement>;

  errorMensaje: string | null = null;

  private credenciales?: Subscription;
  private cancelarEspera: (() => void) | null = null;
  private destruido = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private google: GoogleIdentityService
  ) {}

  /**
   * El botón se dibuja una sola vez, después del primer pintado: el script de Google no compite con el arranque y el
   * formulario se puede usar desde el primer cuadro. El espacio del botón ya está reservado en la plantilla.
   */
  ngAfterViewInit(): void {
    this.credenciales = this.google.credencial$.subscribe((credencial) => this.zone.run(() => this.onCredencial(credencial)));
    this.cancelarEspera = despuesDelPrimerPintado(() => this.dibujar());
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.cancelarEspera?.();
    this.credenciales?.unsubscribe();
  }

  private dibujar(): void {
    const contenedor = this.googleBtnRef.nativeElement;
    const ancho = contenedor.offsetWidth || 384;
    this.google.dibujarBoton(contenedor, ancho).then(
      () => undefined,
      () => {
        if (this.destruido) return;
        this.errorMensaje = 'No fue posible cargar el inicio de sesión con Google.';
        this.cdr.markForCheck();
      }
    );
  }

  private onCredencial(credencial: string): void {
    this.errorMensaje = null;

    this.authService.loginConGoogle(credencial).subscribe({
      next: (response) => {
        this.cdr.markForCheck();
        this.authService.redirigirSegunRolYPerfil(this.router, response.perfilCompleto);
      },
      error: (err) => {
        this.errorMensaje = err?.error?.detail ?? 'No fue posible iniciar sesión con Google. Intenta de nuevo.';
        this.cdr.markForCheck();
      },
    });
  }
}
