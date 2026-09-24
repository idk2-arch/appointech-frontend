import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { GOOGLE_CLIENT_ID } from '../../../core/config/api.config';

declare const google: any;

interface GoogleCredentialResponse {
  credential: string;
}

@Component({
  selector: 'app-google-login-button',
  standalone: false,
  templateUrl: './google-login-button.component.html',
})
export class GoogleLoginButtonComponent implements AfterViewInit, OnDestroy {
  @ViewChild('googleBtn', { static: true }) private googleBtnRef!: ElementRef<HTMLDivElement>;

  errorMensaje: string | null = null;

  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private intentos = 0;
  private readonly MAX_INTENTOS = 50;

  constructor(
    private authService: AuthService,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    this.esperarGoogle();
  }

  ngOnDestroy(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
    }
  }

  private esperarGoogle(): void {
    if (this.googleDisponible()) {
      this.inicializarBoton();
      return;
    }

    this.pollHandle = setInterval(() => {
      this.intentos++;

      if (this.googleDisponible()) {
        this.detenerEspera();
        this.inicializarBoton();
      } else if (this.intentos >= this.MAX_INTENTOS) {
        this.detenerEspera();
        this.errorMensaje = 'No fue posible cargar el inicio de sesión con Google.';
        this.cdr.markForCheck();
      }
    }, 100);
  }

  private googleDisponible(): boolean {
    return typeof google !== 'undefined' && !!google?.accounts?.id;
  }

  private detenerEspera(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  private inicializarBoton(): void {
    const contenedor = this.googleBtnRef.nativeElement;
    const ancho = contenedor.offsetWidth || 384;

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (respuesta: GoogleCredentialResponse) => this.zone.run(() => this.onCredencial(respuesta)),
    });

    google.accounts.id.renderButton(contenedor, {
      theme: 'filled_black',
      size: 'large',
      text: 'signin_with',
      locale: 'es',
      shape: 'rectangular',
      width: ancho,
    });
  }

  private onCredencial(respuesta: GoogleCredentialResponse): void {
    this.errorMensaje = null;

    this.authService.loginConGoogle(respuesta.credential).subscribe({
      next: (response) => {
        this.cdr.markForCheck();
        this.authService.redirigirSegunRolYPerfil(this.router, response.perfilCompleto);
      },
      error: (err) => {
        this.errorMensaje = err?.error?.mensaje ?? 'No fue posible iniciar sesión con Google. Intenta de nuevo.';
        this.cdr.markForCheck();
      },
    });
  }
}
