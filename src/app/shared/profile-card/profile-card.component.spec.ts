import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SharedModule } from '../shared.module';
import { ProfileCardComponent } from './profile-card.component';
import { esColorOscuro, PATRON_ENGRANAJES } from './profile-card.temas';

class ObservadorFalso {
  static instancias: ObservadorFalso[] = [];
  desconectado = false;
  constructor(public alCambiar: () => void) {
    ObservadorFalso.instancias.push(this);
  }
  observe(): void {
    /* sin efecto */
  }
  disconnect(): void {
    this.desconectado = true;
  }
}

describe('ProfileCardComponent', () => {
  let cuadros: Map<number, FrameRequestCallback>;
  let siguienteId: number;
  let reducido: boolean;
  let configurado: boolean;
  const cancelar = vi.fn();

  /** Corre los cuadros pendientes, avanzando 16 ms cada vez, hasta que el motor se detenga. */
  const correrCuadros = (maximo = 400): void => {
    let tiempo = performance.now();
    for (let i = 0; i < maximo && cuadros.size > 0; i++) {
      tiempo += 16;
      const pendientes = [...cuadros.entries()];
      cuadros.clear();
      for (const [, cb] of pendientes) cb(tiempo);
    }
  };

  beforeEach(() => {
    cuadros = new Map();
    siguienteId = 0;
    reducido = false;
    configurado = false;
    cancelar.mockReset();
    ObservadorFalso.instancias = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cuadros.set(++siguienteId, cb);
      return siguienteId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      cancelar(id);
      cuadros.delete(id);
    });
    vi.stubGlobal('ResizeObserver', ObservadorFalso);
    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: reducido && consulta.includes('reduced-motion') }));
  });

  afterEach(() => vi.unstubAllGlobals());

  async function crear(entradas: Partial<ProfileCardComponent> = {}) {
    if (!configurado) {
      configurado = true;
      await TestBed.configureTestingModule({ imports: [SharedModule] }).compileComponents();
    }
    const fixture = TestBed.createComponent(ProfileCardComponent);
    fixture.componentRef.setInput('name', 'Ana Pérez');
    for (const [clave, valor] of Object.entries(entradas)) fixture.componentRef.setInput(clave, valor);
    fixture.detectChanges();
    const raiz = fixture.nativeElement.querySelector('.profile-card') as HTMLElement;
    return { fixture, raiz, el: fixture.nativeElement as HTMLElement };
  }

  const variable = (raiz: HTMLElement, nombre: string): string => raiz.style.getPropertyValue(nombre);
  const puntero = (tipo: string, tipoPuntero: string, extra: Record<string, unknown> = {}): Event => {
    const e = new MouseEvent(tipo, { bubbles: true, clientX: 0, clientY: 0, ...extra });
    Object.defineProperty(e, 'pointerType', { value: tipoPuntero });
    Object.defineProperty(e, 'pointerId', { value: extra['pointerId'] ?? 1 });
    return e;
  };
  const conCaja = (raiz: HTMLElement): void => {
    raiz.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
  };

  describe('contenido', () => {
    it('con foto la muestra con su texto alternativo y sin iniciales', async () => {
      const { el } = await crear({ avatarUrl: '/foto.jpg' });
      const img = el.querySelector<HTMLImageElement>('.profile-card__photo')!;
      expect(img.getAttribute('src')).toBe('/foto.jpg');
      expect(img.alt).toBe('Ana Pérez');
      expect(el.querySelector('.profile-card__initials')).toBeNull();
    });

    it('sin foto muestra las iniciales de nombre y apellido', async () => {
      const { el } = await crear();
      expect(el.querySelector('.profile-card__photo')).toBeNull();
      expect(el.querySelector('.profile-card__initials')?.textContent?.trim()).toBe('AP');
    });

    it('sin foto ni nombre no muestra letras', async () => {
      const { el } = await crear({ name: '' });
      expect(el.querySelector('.profile-card__initials')?.textContent?.trim()).toBe('');
      expect(el.querySelector('.profile-card__info')).toBeNull();
    });

    it('si la foto no carga vuelve a las iniciales, y una foto nueva lo intenta de nuevo', async () => {
      const { fixture, el } = await crear({ avatarUrl: '/rota.jpg' });
      el.querySelector('img')!.dispatchEvent(new Event('error'));
      fixture.detectChanges();
      expect(el.querySelector('.profile-card__photo')).toBeNull();
      expect(el.querySelector('.profile-card__initials')).not.toBeNull();

      fixture.componentRef.setInput('avatarUrl', '/buena.jpg');
      fixture.detectChanges();
      expect(el.querySelector('.profile-card__photo')).not.toBeNull();
    });

    it('muestra nombre, título, el handle con su prefijo y el estado', async () => {
      const { el } = await crear({ title: 'Cliente', handle: 'ana', status: 'Activo' });
      expect(el.querySelector('.profile-card__name')?.textContent).toBe('Ana Pérez');
      expect(el.querySelector('.profile-card__title')?.textContent).toBe('Cliente');
      expect(el.querySelector('.profile-card__handle')?.textContent).toBe('@ana');
      expect(el.querySelector('.profile-card__status')?.textContent).toBe('Activo');
    });

    it('con handlePrefix vacío muestra un correo sin arroba y con título completo', async () => {
      const { el } = await crear({ handle: 'ana@correo.co', handlePrefix: '' });
      const handle = el.querySelector('.profile-card__handle')!;
      expect(handle.textContent).toBe('ana@correo.co');
      expect(handle.getAttribute('title')).toBe('ana@correo.co');
    });

    it('sin título ni nombre omite el bloque de información; sin showUserInfo omite el pie', async () => {
      const { el } = await crear({ name: '', title: '', showUserInfo: false });
      expect(el.querySelector('.profile-card__info')).toBeNull();
      expect(el.querySelector('.profile-card__footer')).toBeNull();
    });

    it('solo muestra el nombre o solo el título si falta el otro', async () => {
      const soloTitulo = await crear({ name: '', title: 'Técnico' });
      expect(soloTitulo.el.querySelector('.profile-card__name')).toBeNull();
      expect(soloTitulo.el.querySelector('.profile-card__title')).not.toBeNull();
    });

    it('muestra el mini avatar solo si se indica', async () => {
      const sin = await crear();
      expect(sin.el.querySelector('.profile-card__avatar')).toBeNull();
      const con = await crear({ miniAvatarUrl: '/mini.jpg' });
      expect(con.el.querySelector('.profile-card__avatar img')?.getAttribute('src')).toBe('/mini.jpg');
    });
  });

  describe('botón de contacto', () => {
    it('sin contactText no hay botón', async () => {
      const { el } = await crear({ handle: 'ana', status: 'Activo' });
      expect(el.querySelector('button')).toBeNull();
    });

    it('con contactText hay un botón con aria-label, sobre inline, y emite contactClick', async () => {
      const { fixture, el } = await crear({ contactText: 'Contactar' });
      const emitir = vi.fn();
      fixture.componentInstance.contactClick.subscribe(emitir);

      const boton = el.querySelector('button.profile-card__contact') as HTMLButtonElement;
      expect(boton.type).toBe('button');
      expect(boton.getAttribute('aria-label')).toBe('Contactar Ana Pérez');
      expect(boton.querySelector('svg')).not.toBeNull();
      boton.click();
      expect(emitir).toHaveBeenCalledTimes(1);
    });

    it('sin nombre el aria-label es solo el texto', async () => {
      const { el } = await crear({ name: '', contactText: 'Contactar' });
      expect(el.querySelector('button')?.getAttribute('aria-label')).toBe('Contactar');
    });
  });

  describe('variables CSS', () => {
    it('aplica el tema oscuro por defecto y el claro cuando se pide', async () => {
      const oscuro = await crear();
      expect(variable(oscuro.raiz, '--pc-ink')).toBe('#f4f4f5');
      expect(variable(oscuro.raiz, '--pc-blend')).toBe('color-dodge');

      const claro = await crear({ theme: 'light' });
      expect(variable(claro.raiz, '--pc-ink')).toBe('#27272a');
      expect(variable(claro.raiz, '--pc-blend')).toBe('multiply');
    });

    it('un backdropColor oscuro mantiene la lámina oscura y uno claro la cambia', async () => {
      const oscuro = await crear({ backdropColor: '#0f1a36' });
      expect(variable(oscuro.raiz, '--pc-backdrop')).toContain('color-mix(in srgb, #0f1a36');
      expect(variable(oscuro.raiz, '--pc-blend')).toBe('color-dodge');

      const claro = await crear({ backdropColor: '#fff' });
      expect(variable(claro.raiz, '--pc-blend')).toBe('multiply');

      const raro = await crear({ backdropColor: 'rojo', theme: 'light' });
      expect(variable(raro.raiz, '--pc-blend')).toBe('multiply');
    });

    it('limita holo y glare entre 0 y 1 y no permite radios negativos', async () => {
      const { raiz } = await crear({ holo: 3, glare: -2, radius: -5, parallax: -1 });
      expect(variable(raiz, '--pc-holo')).toBe('1');
      expect(variable(raiz, '--pc-glare')).toBe('0');
      expect(variable(raiz, '--pc-radius')).toBe('0px');
      expect(variable(raiz, '--pc-parallax')).toBe('0px');
    });

    it('con iconUrl usa el patrón; sin él, uno liso y menos intenso', async () => {
      const con = await crear({ iconUrl: PATRON_ENGRANAJES });
      expect(variable(con.raiz, '--pc-pattern')).toContain('data:image/svg+xml');
      expect(variable(con.raiz, '--pc-holo-detail')).toBe('1');
      expect(variable(con.raiz, '--pc-holo-gain')).toBe('1.25');

      const sin = await crear();
      expect(variable(sin.raiz, '--pc-pattern')).toBe('linear-gradient(#000, #000)');
      expect(variable(sin.raiz, '--pc-holo-detail')).toBe('0');
    });

    it('el estado lleva su color', async () => {
      const { raiz } = await crear({ statusColor: '#ff0000' });
      expect(variable(raiz, '--pc-status')).toBe('#ff0000');
    });

    it('reacciona a cambios de los inputs', async () => {
      const { fixture, raiz } = await crear({ theme: 'dark' });
      fixture.componentRef.setInput('theme', 'light');
      fixture.componentRef.setInput('parallax', 20);
      fixture.detectChanges();
      expect(variable(raiz, '--pc-ink')).toBe('#27272a');
      expect(variable(raiz, '--pc-parallax')).toBe('20px');
    });

    it('esColorOscuro lee #rgb y #rrggbb y devuelve null si no entiende el color', () => {
      expect(esColorOscuro('#000')).toBe(true);
      expect(esColorOscuro('ffffff')).toBe(false);
      expect(esColorOscuro('nada')).toBeNull();
    });
  });

  describe('movimiento', () => {
    it('la entrada "atrapa la luz" una vez y termina quieta', async () => {
      const { raiz } = await crear();
      expect(Number(variable(raiz, '--pc-active'))).toBe(1);
      expect(variable(raiz, '--pc-rotate-x')).not.toBe('0.000deg');

      correrCuadros();

      expect(cuadros.size).toBe(0);
      expect(variable(raiz, '--pc-rotate-x')).toBe('0.000deg');
      expect(variable(raiz, '--pc-rotate-y')).toBe('0.000deg');
      expect(Number(variable(raiz, '--pc-active'))).toBe(0);
    });

    it('sin intro arranca quieta', async () => {
      const { raiz } = await crear({ intro: false });
      expect(cuadros.size).toBe(0);
      expect(variable(raiz, '--pc-rotate-x')).toBe('0.000deg');
    });

    it('el mouse inclina hacia el cursor y al salir suelta la luz', async () => {
      const { raiz } = await crear({ intro: false, tiltStrength: 10 });
      conCaja(raiz);

      raiz.dispatchEvent(puntero('pointerenter', 'mouse', { clientX: 200, clientY: 50 }));
      correrCuadros();
      expect(Number(variable(raiz, '--pc-rotate-y').replace('deg', ''))).toBeCloseTo(-10, 0);
      expect(Number(variable(raiz, '--pc-active'))).toBe(1);

      raiz.dispatchEvent(puntero('pointermove', 'mouse', { clientX: 0, clientY: 100 }));
      correrCuadros();
      expect(Number(variable(raiz, '--pc-rotate-x').replace('deg', ''))).toBeCloseTo(10, 0);

      raiz.dispatchEvent(puntero('pointerleave', 'mouse'));
      correrCuadros();
      expect(Number(variable(raiz, '--pc-active'))).toBe(0);
      expect(variable(raiz, '--pc-rotate-x')).toBe('0.000deg');
    });

    it('el toque sigue al dedo solo mientras está apoyado y suelta al levantarlo', async () => {
      const { raiz } = await crear({ intro: false });
      conCaja(raiz);

      raiz.dispatchEvent(puntero('pointerdown', 'touch', { clientX: 200, clientY: 50, pointerId: 7 }));
      raiz.dispatchEvent(puntero('pointermove', 'touch', { clientX: 100, clientY: 50, pointerId: 9 }));
      correrCuadros();
      expect(Number(variable(raiz, '--pc-active'))).toBe(1);
      expect(Number(variable(raiz, '--pc-pointer-x').replace('%', ''))).toBeCloseTo(100, 0);

      raiz.dispatchEvent(puntero('pointermove', 'touch', { clientX: 100, clientY: 50, pointerId: 7 }));
      correrCuadros();
      expect(Number(variable(raiz, '--pc-pointer-x').replace('%', ''))).toBeCloseTo(50, 0);

      raiz.dispatchEvent(puntero('pointerup', 'touch', { pointerId: 9 }));
      correrCuadros();
      expect(Number(variable(raiz, '--pc-active'))).toBe(1);

      raiz.dispatchEvent(puntero('pointerup', 'touch', { pointerId: 7 }));
      correrCuadros();
      expect(Number(variable(raiz, '--pc-active'))).toBe(0);

      raiz.dispatchEvent(puntero('pointerdown', 'touch', { pointerId: 3 }));
      raiz.dispatchEvent(puntero('pointercancel', 'touch', { pointerId: 3 }));
      correrCuadros();
      expect(Number(variable(raiz, '--pc-active'))).toBe(0);
    });

    it('un mouse que presiona no activa el modo toque, y un toque que entra o sale no hace nada', async () => {
      const { raiz } = await crear({ intro: false });
      conCaja(raiz);
      raiz.dispatchEvent(puntero('pointerdown', 'mouse', { clientX: 100, clientY: 50 }));
      raiz.dispatchEvent(puntero('pointerenter', 'touch', { clientX: 100, clientY: 50 }));
      raiz.dispatchEvent(puntero('pointerleave', 'touch'));
      expect(cuadros.size).toBe(0);
    });

    it('un elemento sin tamaño no mueve nada', async () => {
      const { raiz } = await crear({ intro: false });
      raiz.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 }) as DOMRect;
      raiz.dispatchEvent(puntero('pointerenter', 'mouse'));
      expect(cuadros.size).toBe(0);
    });

    it('enableTilt apagado deja la inclinación en cero y el parallax sigue', async () => {
      const { raiz } = await crear({ intro: false, enableTilt: false, parallax: 10 });
      conCaja(raiz);
      raiz.dispatchEvent(puntero('pointerenter', 'mouse', { clientX: 200, clientY: 100 }));
      correrCuadros();
      expect(variable(raiz, '--pc-rotate-x')).toBe('0.000deg');
      expect(Number(variable(raiz, '--pc-shift-x').replace('px', ''))).toBeCloseTo(10, 0);
    });

    it('un cambio de tiltStrength se refleja de inmediato', async () => {
      const { fixture, raiz } = await crear({ intro: false, tiltStrength: 10 });
      conCaja(raiz);
      raiz.dispatchEvent(puntero('pointerenter', 'mouse', { clientX: 100, clientY: 100 }));
      correrCuadros();
      fixture.componentRef.setInput('tiltStrength', 20);
      fixture.detectChanges();
      expect(Number(variable(raiz, '--pc-rotate-x').replace('deg', ''))).toBeCloseTo(20, 0);
    });

    it('al cambiar el tamaño recalcula la posición de la luz', async () => {
      const { raiz } = await crear({ intro: false });
      Object.defineProperty(raiz, 'offsetWidth', { value: 400, configurable: true });
      Object.defineProperty(raiz, 'offsetHeight', { value: 200, configurable: true });
      ObservadorFalso.instancias[0].alCambiar();
      expect(variable(raiz, '--pc-light-x')).toBe('200.0px');
      expect(variable(raiz, '--pc-light-y')).toBe('100.0px');
    });

    it('funciona aunque el navegador no tenga ResizeObserver ni matchMedia', async () => {
      vi.stubGlobal('ResizeObserver', undefined);
      vi.stubGlobal('matchMedia', undefined);
      const { raiz } = await crear({ intro: false });
      expect(variable(raiz, '--pc-active')).toBe('0.0000');
    });
  });

  describe('movimiento reducido', () => {
    it('sin intro, sin inclinación y sin parallax', async () => {
      reducido = true;
      const { raiz } = await crear({ intro: true, tiltStrength: 20, parallax: 10 });
      expect(cuadros.size).toBe(0);
      conCaja(raiz);
      raiz.dispatchEvent(puntero('pointerenter', 'mouse', { clientX: 200, clientY: 100 }));
      correrCuadros();
      expect(variable(raiz, '--pc-rotate-x')).toBe('0.000deg');
      expect(variable(raiz, '--pc-rotate-y')).toBe('0.000deg');
      expect(variable(raiz, '--pc-shift-x')).toBe('0.00px');
    });
  });

  describe('inclinación por orientación del teléfono', () => {
    const orientar = (gamma: number | null, beta: number | null): void => {
      const e = new Event('deviceorientation');
      Object.assign(e, { gamma, beta });
      window.dispatchEvent(e);
    };

    it('apagada por defecto: ni el clic ni la orientación hacen nada', async () => {
      const { raiz } = await crear({ intro: false });
      raiz.click();
      orientar(30, 50);
      expect(cuadros.size).toBe(0);
    });

    it('encendida, el primer toque empieza a escuchar y la orientación mueve la tarjeta', async () => {
      const { raiz } = await crear({ intro: false, enableMobileTilt: true, mobileTiltSensitivity: 5 });
      raiz.click();
      raiz.click();
      orientar(150, 20);
      correrCuadros();
      expect(Number(variable(raiz, '--pc-pointer-x').replace('%', ''))).toBeGreaterThan(50);
      orientar(null, null);
    });

    it('en iPhone pide permiso: concedido escucha, denegado o con error no hace nada', async () => {
      const permiso = vi.fn().mockResolvedValue('granted');
      vi.stubGlobal('DeviceOrientationEvent', { requestPermission: permiso });
      const { raiz } = await crear({ intro: false, enableMobileTilt: true });
      raiz.click();
      await Promise.resolve();
      await Promise.resolve();
      orientar(150, 20);
      expect(cuadros.size).toBeGreaterThan(0);
      correrCuadros();

      permiso.mockResolvedValue('denied');
      const otra = await crear({ intro: false, enableMobileTilt: true });
      otra.raiz.click();
      await Promise.resolve();

      permiso.mockRejectedValue(new Error('no'));
      const fallida = await crear({ intro: false, enableMobileTilt: true });
      fallida.raiz.click();
      await Promise.resolve();
      await Promise.resolve();
      expect(permiso).toHaveBeenCalledTimes(3);
    });

    it('al apagar enableMobileTilt deja de escuchar el clic', async () => {
      const permiso = vi.fn().mockResolvedValue('denied');
      vi.stubGlobal('DeviceOrientationEvent', { requestPermission: permiso });
      const { fixture, raiz } = await crear({ intro: false, enableMobileTilt: true });
      fixture.componentRef.setInput('enableMobileTilt', false);
      fixture.detectChanges();
      raiz.click();
      expect(permiso).not.toHaveBeenCalled();
    });
  });

  describe('limpieza', () => {
    it('al destruir cancela el cuadro pendiente, desconecta el observador y quita todos los eventos', async () => {
      const { fixture, raiz } = await crear({ enableMobileTilt: true });
      const quitados: string[] = [];
      const quitar = raiz.removeEventListener.bind(raiz);
      raiz.removeEventListener = ((tipo: string, ...resto: unknown[]) => {
        quitados.push(tipo);
        (quitar as (...a: unknown[]) => void)(tipo, ...resto);
      }) as typeof raiz.removeEventListener;
      const quitarVentana = vi.spyOn(window, 'removeEventListener');
      expect(cuadros.size).toBe(1);

      fixture.destroy();

      expect(cancelar).toHaveBeenCalled();
      expect(cuadros.size).toBe(0);
      expect(ObservadorFalso.instancias[0].desconectado).toBe(true);
      expect(quitados.sort()).toEqual(['click', 'pointercancel', 'pointerdown', 'pointerenter', 'pointerleave', 'pointermove', 'pointerup']);
      expect(quitarVentana).toHaveBeenCalledWith('deviceorientation', expect.any(Function));
    });

    it('después de destruida ya no reacciona al cursor', async () => {
      const { fixture, raiz } = await crear({ intro: false });
      conCaja(raiz);
      fixture.destroy();
      raiz.dispatchEvent(puntero('pointerenter', 'mouse', { clientX: 100, clientY: 50 }));
      expect(cuadros.size).toBe(0);
    });
  });
});
