import { ChangeDetectorRef, ElementRef, NgZone } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Los módulos se importan por sus componentes: así Angular compila las plantillas con su contexto.
import './auth.module';
import '../completar-perfil/completar-perfil.module';
import '../en-construccion/en-construccion.module';
import { AuthService } from '../../core/services/auth.service';
import { CompletarPerfilComponent } from '../completar-perfil/completar-perfil.component';
import { GoogleIdentityService } from '../../core/services/google-identity.service';
import { EnConstruccionComponent } from '../en-construccion/en-construccion.component';
import { GoogleLoginButtonComponent } from './google-login-button/google-login-button.component';
import { LoginComponent } from './login/login.component';
import { RegistroComponent } from './registro/registro.component';

const cdr = { markForCheck: vi.fn() } as unknown as ChangeDetectorRef;
const router = {} as Router;
const falloHttp = (status: number, error?: unknown): HttpErrorResponse => new HttpErrorResponse({ status, error });

function authFalso(extra: Record<string, unknown> = {}): Record<string, ReturnType<typeof vi.fn>> {
  return {
    login: vi.fn(),
    loginConGoogle: vi.fn(),
    registrarCliente: vi.fn(),
    completarPerfil: vi.fn(),
    redirigirSegunRol: vi.fn(),
    redirigirSegunRolYPerfil: vi.fn(),
    obtenerRol: vi.fn().mockReturnValue(null),
    estaAutenticado: vi.fn().mockReturnValue(false),
    cerrarSesion: vi.fn(),
    ...extra,
  } as Record<string, ReturnType<typeof vi.fn>>;
}

describe('LoginComponent', () => {
  let auth: Record<string, ReturnType<typeof vi.fn>>;
  let login: LoginComponent;

  beforeEach(() => {
    auth = authFalso();
    login = new LoginComponent(new FormBuilder(), auth as unknown as AuthService, router, cdr);
  });

  it('empieza vacío, sin error, y la contraseña oculta', () => {
    expect(login.cargando).toBe(false);
    expect(login.errorMensaje).toBeNull();
    expect(login.mostrarContrasena).toBe(false);
    expect(login.form.valid).toBe(false);
  });

  it('valida el correo y el largo mínimo de la contraseña (6)', () => {
    login.form.setValue({ correo: 'no-es-correo', contrasena: '123' });
    expect(login.correo?.hasError('email')).toBe(true);
    expect(login.contrasena?.hasError('minlength')).toBe(true);

    login.form.setValue({ correo: 'ana@correo.co', contrasena: '123456' });
    expect(login.form.valid).toBe(true);
  });

  it('alterna la visibilidad de la contraseña', () => {
    login.alternarContrasena();
    expect(login.mostrarContrasena).toBe(true);
    login.alternarContrasena();
    expect(login.mostrarContrasena).toBe(false);
  });

  it('con el formulario inválido no llama al backend y marca los campos', () => {
    login.onSubmit();

    expect(auth['login']).not.toHaveBeenCalled();
    expect(login.correo?.touched).toBe(true);
    expect(login.contrasena?.touched).toBe(true);
  });

  it('con credenciales válidas inicia sesión y redirige según el perfil', () => {
    auth['login'].mockReturnValue(of({ token: 't', perfilCompleto: true }));
    login.form.setValue({ correo: 'ana@correo.co', contrasena: '123456' });

    login.onSubmit();

    expect(auth['login']).toHaveBeenCalledWith({ correo: 'ana@correo.co', contrasena: '123456' });
    expect(auth['redirigirSegunRolYPerfil']).toHaveBeenCalledWith(router, true);
    expect(login.cargando).toBe(false);
    expect(login.errorMensaje).toBeNull();
  });

  it('un perfil incompleto se pasa tal cual a la redirección', () => {
    auth['login'].mockReturnValue(of({ token: 't', perfilCompleto: false }));
    login.form.setValue({ correo: 'ana@correo.co', contrasena: '123456' });
    login.onSubmit();
    expect(auth['redirigirSegunRolYPerfil']).toHaveBeenCalledWith(router, false);
  });

  it('401: muestra "Correo o contraseña incorrectos." y no redirige', () => {
    auth['login'].mockReturnValue(throwError(() => falloHttp(401)));
    login.form.setValue({ correo: 'ana@correo.co', contrasena: '123456' });

    login.onSubmit();

    expect(login.errorMensaje).toBe('Correo o contraseña incorrectos.');
    expect(login.cargando).toBe(false);
    expect(auth['redirigirSegunRolYPerfil']).not.toHaveBeenCalled();
  });

  it('cualquier otro error: mensaje genérico en español', () => {
    auth['login'].mockReturnValue(throwError(() => falloHttp(500)));
    login.form.setValue({ correo: 'ana@correo.co', contrasena: '123456' });
    login.onSubmit();
    expect(login.errorMensaje).toBe('No fue posible iniciar sesión. Intenta de nuevo.');
  });

  it('un nuevo intento limpia el error anterior', () => {
    auth['login'].mockReturnValueOnce(throwError(() => falloHttp(401))).mockReturnValueOnce(of({ token: 't', perfilCompleto: true }));
    login.form.setValue({ correo: 'ana@correo.co', contrasena: '123456' });
    login.onSubmit();
    expect(login.errorMensaje).not.toBeNull();

    login.onSubmit();
    expect(login.errorMensaje).toBeNull();
  });
});

describe('RegistroComponent', () => {
  let auth: Record<string, ReturnType<typeof vi.fn>>;
  let navegar: ReturnType<typeof vi.fn>;
  let registro: RegistroComponent;

  const llenar = (): void =>
    registro.form.patchValue({
      nombre: 'Ana',
      apellido: 'Pérez',
      correo: 'ana@correo.co',
      tipoDocumento: 'CC',
      contrasena: 'secreta123',
      confirmarContrasena: 'secreta123',
      direccion: 'Calle 6',
    });

  beforeEach(() => {
    auth = authFalso();
    navegar = vi.fn().mockResolvedValue(true);
    registro = new RegistroComponent(new FormBuilder(), auth as unknown as AuthService, { navigate: navegar } as unknown as Router, cdr);
  });

  it('el formulario vacío es inválido', () => {
    expect(registro.form.valid).toBe(false);
  });

  it('con el formulario inválido avisa y no llama al backend', () => {
    registro.onSubmit();

    expect(auth['registrarCliente']).not.toHaveBeenCalled();
    expect(registro.errorMensaje).toBe('Revisa los campos marcados en rojo para continuar.');
    expect(registro.form.get('nombre')?.touched).toBe(true);
  });

  it('contraseñas distintas dejan el formulario inválido', () => {
    llenar();
    registro.form.patchValue({ confirmarContrasena: 'otra-distinta' });
    registro.onSubmit();
    expect(auth['registrarCliente']).not.toHaveBeenCalled();
  });

  it('registra al cliente con los datos normalizados y, si quedó con sesión, va al inicio', () => {
    auth['registrarCliente'].mockReturnValue(of({ token: 't' }));
    auth['estaAutenticado'].mockReturnValue(true);
    llenar();

    registro.onSubmit();

    expect(auth['registrarCliente']).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Ana', correo: 'ana@correo.co', contrasena: 'secreta123', direccion: 'Calle 6' })
    );
    expect(navegar).toHaveBeenCalledWith(['/']);
    expect(registro.cargando).toBe(false);
  });

  it('si el registro no devuelve sesión, lleva al login', () => {
    auth['registrarCliente'].mockReturnValue(of({}));
    llenar();
    registro.onSubmit();
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });

  it('409: avisa que ya existe una cuenta con ese correo', () => {
    auth['registrarCliente'].mockReturnValue(throwError(() => falloHttp(409)));
    llenar();

    registro.onSubmit();

    expect(registro.errorMensaje).toBe('Ya existe una cuenta con ese correo. Prueba con otro o inicia sesión.');
    expect(registro.cargando).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('400: muestra el mensaje del backend', () => {
    auth['registrarCliente'].mockReturnValue(throwError(() => falloHttp(400, { status: 400, error: 'La contraseña es muy débil' })));
    llenar();
    registro.onSubmit();
    expect(registro.errorMensaje).toBe('La contraseña es muy débil');
  });

  it('un error sin mensaje usa uno genérico en español', () => {
    auth['registrarCliente'].mockReturnValue(throwError(() => new Error('x')));
    llenar();
    registro.onSubmit();
    expect(registro.errorMensaje).toBe('No fue posible crear la cuenta. Revisa los datos e intenta de nuevo.');
  });
});

describe('CompletarPerfilComponent', () => {
  let auth: Record<string, ReturnType<typeof vi.fn>>;

  const crear = (rol: string | null): CompletarPerfilComponent => {
    auth = authFalso({ obtenerRol: vi.fn().mockReturnValue(rol) });
    return new CompletarPerfilComponent(new FormBuilder(), auth as unknown as AuthService, router, cdr);
  };

  it('el cliente debe dar también su dirección', () => {
    const cliente = crear('CLIENTE');
    expect(cliente.esCliente).toBe(true);

    cliente.form.patchValue({ telefono: '300', tipoDocumento: 'CC', numeroDocumento: '1' });
    expect(cliente.form.valid).toBe(false);
    expect(cliente.direccion?.hasError('required')).toBe(true);

    cliente.form.patchValue({ direccion: 'Calle 6' });
    expect(cliente.form.valid).toBe(true);
  });

  it('el técnico o el administrador no tienen dirección obligatoria', () => {
    const tecnico = crear('TECNICO');
    expect(tecnico.esCliente).toBe(false);
    tecnico.form.patchValue({ telefono: '300', tipoDocumento: 'CC', numeroDocumento: '1' });
    expect(tecnico.form.valid).toBe(true);
  });

  it('teléfono, tipo y número de documento son obligatorios', () => {
    const componente = crear('TECNICO');
    expect(componente.telefono?.hasError('required')).toBe(true);
    expect(componente.tipoDocumento?.hasError('required')).toBe(true);
    expect(componente.numeroDocumento?.hasError('required')).toBe(true);
  });

  it('inválido: marca los campos y no llama al backend', () => {
    const componente = crear('CLIENTE');
    componente.onSubmit();
    expect(auth['completarPerfil']).not.toHaveBeenCalled();
    expect(componente.telefono?.touched).toBe(true);
  });

  it('cliente: envía la dirección y redirige según el rol', () => {
    const cliente = crear('CLIENTE');
    auth['completarPerfil'].mockReturnValue(of({}));
    cliente.form.setValue({ telefono: '300', tipoDocumento: 'CC', numeroDocumento: '1', direccion: 'Calle 6' });

    cliente.onSubmit();

    expect(auth['completarPerfil']).toHaveBeenCalledWith({ telefono: '300', tipoDocumento: 'CC', numeroDocumento: '1', direccion: 'Calle 6' });
    expect(auth['redirigirSegunRol']).toHaveBeenCalledWith(router);
    expect(cliente.cargando).toBe(false);
  });

  it('técnico: no envía dirección', () => {
    const tecnico = crear('TECNICO');
    auth['completarPerfil'].mockReturnValue(of({}));
    tecnico.form.patchValue({ telefono: '300', tipoDocumento: 'CE', numeroDocumento: '9', direccion: 'ignorada' });

    tecnico.onSubmit();

    expect(auth['completarPerfil']).toHaveBeenCalledWith({ telefono: '300', tipoDocumento: 'CE', numeroDocumento: '9' });
  });

  it('error con detalle del backend: lo muestra', () => {
    const cliente = crear('CLIENTE');
    auth['completarPerfil'].mockReturnValue(throwError(() => falloHttp(400, { detail: 'El documento ya está registrado' })));
    cliente.form.setValue({ telefono: '300', tipoDocumento: 'CC', numeroDocumento: '1', direccion: 'Calle 6' });

    cliente.onSubmit();

    expect(cliente.errorMensaje).toBe('El documento ya está registrado');
    expect(cliente.cargando).toBe(false);
    expect(auth['redirigirSegunRol']).not.toHaveBeenCalled();
  });

  it('error sin detalle: mensaje genérico en español', () => {
    const cliente = crear('CLIENTE');
    auth['completarPerfil'].mockReturnValue(throwError(() => falloHttp(500)));
    cliente.form.setValue({ telefono: '300', tipoDocumento: 'CC', numeroDocumento: '1', direccion: 'Calle 6' });
    cliente.onSubmit();
    expect(cliente.errorMensaje).toBe('No fue posible guardar tus datos. Intenta de nuevo.');
  });
});

describe('EnConstruccionComponent', () => {
  const crear = (rol: string | null): { componente: EnConstruccionComponent; auth: Record<string, ReturnType<typeof vi.fn>>; navegar: ReturnType<typeof vi.fn> } => {
    const auth = authFalso({ obtenerRol: vi.fn().mockReturnValue(rol) });
    const navegar = vi.fn().mockResolvedValue(true);
    const componente = new EnConstruccionComponent(auth as unknown as AuthService, { navigate: navegar } as unknown as Router);
    return { componente, auth, navegar };
  };

  it.each(['CLIENTE', 'ADMINISTRADOR', 'TECNICO'])('el rol %s ya tiene panel: se le redirige', (rol) => {
    const { componente, auth } = crear(rol);
    componente.ngOnInit();
    expect(auth['redirigirSegunRol']).toHaveBeenCalled();
  });

  it('sin rol conocido se queda en la pantalla', () => {
    const { componente, auth } = crear(null);
    componente.ngOnInit();
    expect(auth['redirigirSegunRol']).not.toHaveBeenCalled();
  });

  it('cerrar sesión borra la sesión y lleva al login', () => {
    const { componente, auth, navegar } = crear(null);
    componente.cerrarSesion();
    expect(auth['cerrarSesion']).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });
});

describe('GoogleLoginButtonComponent', () => {
  let auth: Record<string, ReturnType<typeof vi.fn>>;
  let contenedor: HTMLDivElement;
  let componente: GoogleLoginButtonComponent;
  let credencial$: Subject<string>;
  const dibujarBoton = vi.fn();

  const crear = (): GoogleLoginButtonComponent => {
    auth = authFalso();
    contenedor = document.createElement('div');
    credencial$ = new Subject<string>();
    const zona = { run: (fn: () => void) => fn() } as unknown as NgZone;
    const google = { credencial$: credencial$.asObservable(), dibujarBoton } as unknown as GoogleIdentityService;
    const c = new GoogleLoginButtonComponent(auth as unknown as AuthService, router, zona, cdr, google);
    (c as unknown as { googleBtnRef: ElementRef<HTMLDivElement> }).googleBtnRef = new ElementRef(contenedor);
    return c;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    dibujarBoton.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => vi.useRealTimers());

  it('no toca a Google antes del primer pintado: el botón se dibuja después, una sola vez', () => {
    componente = crear();
    componente.ngAfterViewInit();
    expect(dibujarBoton).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    expect(dibujarBoton).toHaveBeenCalledOnce();
    expect(dibujarBoton).toHaveBeenCalledWith(contenedor, 384);
    vi.advanceTimersByTime(5000);
    expect(dibujarBoton).toHaveBeenCalledOnce();
  });

  it('si Google no carga, avisa con un mensaje en español', async () => {
    dibujarBoton.mockRejectedValue(new Error('x'));
    componente = crear();
    componente.ngAfterViewInit();

    await vi.advanceTimersByTimeAsync(500);

    expect(componente.errorMensaje).toBe('No fue posible cargar el inicio de sesión con Google.');
  });

  it('si la pantalla ya se destruyó cuando Google falla, no toca nada', async () => {
    dibujarBoton.mockRejectedValue(new Error('x'));
    componente = crear();
    componente.ngAfterViewInit();
    await vi.advanceTimersByTimeAsync(500);
    componente.errorMensaje = null;
    componente.ngOnDestroy();
    dibujarBoton.mockClear();

    vi.advanceTimersByTime(500);
    expect(dibujarBoton).not.toHaveBeenCalled();
    expect(componente.errorMensaje).toBeNull();
  });

  it('destruirse antes del primer pintado cancela el dibujo y no deja temporizadores', () => {
    componente = crear();
    componente.ngAfterViewInit();
    componente.ngOnDestroy();

    vi.advanceTimersByTime(1000);

    expect(dibujarBoton).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('al recibir la credencial inicia sesión con Google y redirige según el perfil', () => {
    componente = crear();
    componente.ngAfterViewInit();
    auth['loginConGoogle'].mockReturnValue(of({ token: 't', perfilCompleto: false }));

    credencial$.next('id-token');

    expect(auth['loginConGoogle']).toHaveBeenCalledWith('id-token');
    expect(auth['redirigirSegunRolYPerfil']).toHaveBeenCalledWith(router, false);
    expect(componente.errorMensaje).toBeNull();
  });

  it('si el backend rechaza la credencial, muestra su detalle', () => {
    componente = crear();
    componente.ngAfterViewInit();
    auth['loginConGoogle'].mockReturnValue(throwError(() => falloHttp(401, { detail: 'Cuenta de Google no verificada' })));

    credencial$.next('id-token');

    expect(componente.errorMensaje).toBe('Cuenta de Google no verificada');
    expect(auth['redirigirSegunRolYPerfil']).not.toHaveBeenCalled();
  });

  it('un error sin detalle usa un mensaje genérico en español', () => {
    componente = crear();
    componente.ngAfterViewInit();
    auth['loginConGoogle'].mockReturnValue(throwError(() => falloHttp(500)));

    credencial$.next('id-token');

    expect(componente.errorMensaje).toBe('No fue posible iniciar sesión con Google. Intenta de nuevo.');
  });

  it('al destruirse deja de escuchar las credenciales (sin fugas)', () => {
    componente = crear();
    componente.ngAfterViewInit();
    expect(credencial$.observed).toBe(true);

    componente.ngOnDestroy();

    expect(credencial$.observed).toBe(false);
  });
});
