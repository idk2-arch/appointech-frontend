import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GoogleIdentityService } from './google-identity.service';

type GlobalConGoogle = { google?: unknown };

describe('GoogleIdentityService', () => {
  const initialize = vi.fn();
  const renderButton = vi.fn();
  let servicio: GoogleIdentityService;
  let alCredencial: (r: { credential: string }) => void;

  const instalarGoogle = (): void => {
    (globalThis as GlobalConGoogle).google = {
      accounts: { id: { initialize: initialize.mockImplementation((o: { callback: typeof alCredencial }) => (alCredencial = o.callback)), renderButton } },
    };
  };
  const scripts = (): HTMLScriptElement[] => Array.from(document.head.querySelectorAll<HTMLScriptElement>('script[src*="accounts.google.com"]'));

  beforeEach(() => {
    vi.useFakeTimers();
    initialize.mockReset();
    renderButton.mockReset();
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(GoogleIdentityService);
  });

  afterEach(() => {
    scripts().forEach((s) => s.remove());
    delete (globalThis as GlobalConGoogle).google;
    vi.useRealTimers();
  });

  it('si Google ya está cargado, no agrega ningún script', async () => {
    instalarGoogle();
    await servicio.dibujarBoton(document.createElement('div'), 300);
    expect(scripts()).toHaveLength(0);
    expect(renderButton).toHaveBeenCalledOnce();
  });

  it('carga el script una sola vez aunque se pida varias veces a la vez', async () => {
    const a = servicio.dibujarBoton(document.createElement('div'), 300);
    const b = servicio.dibujarBoton(document.createElement('div'), 300);
    expect(scripts()).toHaveLength(1);
    expect(scripts()[0].async).toBe(true);

    instalarGoogle();
    scripts()[0].onload?.(new Event('load'));
    await Promise.all([a, b]);

    expect(scripts()).toHaveLength(1);
  });

  it('initialize se llama UNA sola vez por carga de página, aunque se dibuje el botón muchas veces', async () => {
    instalarGoogle();
    for (let i = 0; i < 5; i++) await servicio.dibujarBoton(document.createElement('div'), 300);

    expect(initialize).toHaveBeenCalledOnce();
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: expect.any(String) }));
    expect(renderButton).toHaveBeenCalledTimes(5);
  });

  it('dibuja el botón con el ancho pedido, en español y con la forma de siempre', async () => {
    instalarGoogle();
    const contenedor = document.createElement('div');
    await servicio.dibujarBoton(contenedor, 321);
    expect(renderButton).toHaveBeenCalledWith(contenedor, { theme: 'filled_black', size: 'large', text: 'signin_with', locale: 'es', shape: 'rectangular', width: 321 });
  });

  it('las credenciales llegan por el Subject, también tras varias pantallas', async () => {
    instalarGoogle();
    await servicio.dibujarBoton(document.createElement('div'), 300);
    const recibidas: string[] = [];
    const suscripcion = servicio.credencial$.subscribe((c) => recibidas.push(c));

    alCredencial({ credential: 'token-1' });
    suscripcion.unsubscribe();
    alCredencial({ credential: 'token-2' });

    expect(recibidas).toEqual(['token-1']);
  });

  it('si el script falla al cargar, rechaza, quita el script y deja reintentar', async () => {
    const intento = servicio.dibujarBoton(document.createElement('div'), 300);
    const rechazo = intento.catch((e: Error) => e.message);
    scripts()[0].onerror?.(new Event('error'));
    expect(await rechazo).toBe('No se pudo cargar el script de Google');
    expect(scripts()).toHaveLength(0);

    const segundo = servicio.dibujarBoton(document.createElement('div'), 300);
    expect(scripts()).toHaveLength(1);
    instalarGoogle();
    scripts()[0].onload?.(new Event('load'));
    await segundo;
    expect(renderButton).toHaveBeenCalledOnce();
  });

  it('si Google tarda más de 5 segundos, se rinde', async () => {
    const rechazo = servicio.dibujarBoton(document.createElement('div'), 300).catch((e: Error) => e.message);
    await vi.advanceTimersByTimeAsync(5001);
    expect(await rechazo).toBe('Google tardó demasiado en cargar');
    expect(scripts()).toHaveLength(0);
  });

  it('si el script carga pero Google no queda disponible, falla con claridad', async () => {
    const rechazo = servicio.dibujarBoton(document.createElement('div'), 300).catch((e: Error) => e.message);
    scripts()[0].onload?.(new Event('load'));
    expect(await rechazo).toBe('Google Identity Services no está disponible');
  });
});
