import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterModule, convertToParamMap } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Pago } from '../../../core/models/pago';
import { pagoDe } from '../../../core/models/pago.mock';
import { NavegadorService } from '../../../core/services/navegador.service';
import { PagoService } from '../../../core/services/pago.service';
import { RetornoPagoService } from '../../../core/services/retorno-pago.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { ClienteModule } from '../cliente.module';
import { ResultadoPagoComponent } from './resultado-pago.component';

describe('ResultadoPagoComponent', () => {
  let fixture: ComponentFixture<ResultadoPagoComponent>;
  const sincronizar = vi.fn();
  const elegirMetodo = vi.fn();
  const redirigir = vi.fn();
  const guardar = vi.fn();
  const leer = vi.fn();
  const olvidar = vi.fn();

  const raiz = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => (raiz().textContent ?? '').replace(/\s+/g, ' ');
  const boton = (nombre: string): HTMLButtonElement | undefined =>
    Array.from(raiz().querySelectorAll('button')).find((b) => b.textContent?.includes(nombre));

  async function crear(consulta: Record<string, string>, citaGuardada: number | null = 7): Promise<void> {
    for (const mock of [sincronizar, elegirMetodo, redirigir, guardar, leer, olvidar]) mock.mockReset();
    leer.mockReturnValue(citaGuardada);
    await TestBed.configureTestingModule({
      imports: [ClienteModule, RouterModule.forRoot([])],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(consulta) } } },
        { provide: PagoService, useValue: { sincronizar, elegirMetodo } },
        { provide: NavegadorService, useValue: { redirigir } },
        { provide: RetornoPagoService, useValue: { guardar, leer, olvidar } },
      ],
    }).compileComponents();
  }

  function iniciar(): void {
    fixture = TestBed.createComponent(ResultadoPagoComponent);
    fixture.detectChanges();
  }

  describe('sincronización', () => {
    it('lee el parámetro id de la URL y sincroniza con la cita guardada', async () => {
      await crear({ id: 'tx-55' });
      sincronizar.mockReturnValue(of(pagoDe({ estado: 'PAGADO', metodo: 'EN_LINEA' })));
      iniciar();

      expect(sincronizar).toHaveBeenCalledWith(7, 'tx-55');
      expect(texto()).toContain('Pagado');
      expect(texto()).toContain('Tu pago fue exitoso');
      expect(texto()).toContain('$ 120.000');
      expect(olvidar).toHaveBeenCalledOnce();
      expect(raiz().querySelector('a')?.getAttribute('href')).toBe('/cliente/citas/7');
    });

    it('prefiere la cita que viene en la URL', async () => {
      await crear({ id: 'tx-55', citaId: '12' }, 7);
      sincronizar.mockReturnValue(of(pagoDe({ citaId: 12, estado: 'PAGADO' })));
      iniciar();

      expect(sincronizar).toHaveBeenCalledWith(12, 'tx-55');
    });

    it('pendiente: lo dice y conserva la cita guardada', async () => {
      await crear({ id: 'tx-55' });
      sincronizar.mockReturnValue(of(pagoDe({ metodo: 'EN_LINEA', estado: 'PENDIENTE' })));
      iniciar();

      expect(texto()).toContain('Pendiente');
      expect(texto()).toContain('todavía está en proceso');
      expect(olvidar).not.toHaveBeenCalled();
    });

    it('muestra un estado de carga', async () => {
      await crear({ id: 'tx-55' });
      sincronizar.mockReturnValue(new Subject<Pago>());
      iniciar();
      expect(raiz().querySelector('[role="status"]')?.textContent).toContain('Verificando');
    });

    it('sin el parámetro id sincroniza solo con la cita (por la referencia guardada)', async () => {
      await crear({ citaId: '12' });
      sincronizar.mockReturnValue(of(pagoDe({ citaId: 12, estado: 'PAGADO' })));
      iniciar();

      expect(sincronizar).toHaveBeenCalledWith(12, undefined);
      expect(texto()).toContain('Pagado');
    });

    it('sin citaId en la URL usa la cita guardada como respaldo', async () => {
      await crear({});
      sincronizar.mockReturnValue(of(pagoDe({ estado: 'PAGADO' })));
      iniciar();

      expect(sincronizar).toHaveBeenCalledWith(7, undefined);
    });

    it('sin cita conocida explica el problema, enlaza a mis citas y no ofrece reintentar', async () => {
      await crear({ id: 'tx-55', citaId: 'abc' }, null);
      iniciar();

      expect(sincronizar).not.toHaveBeenCalled();
      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('No pudimos identificar la cita');
      expect(raiz().querySelector('a')?.textContent).toContain('Mis citas');
      expect(raiz().querySelector('a')?.getAttribute('href')).toBe('/cliente/citas');
      expect(boton('Reintentar')).toBeUndefined();
    });

    it('si la verificación falla muestra el mensaje del backend y permite reintentarla', async () => {
      await crear({ id: 'tx-55' });
      sincronizar.mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status: 404, error: { detail: 'Transacción no encontrada.' } }))
      );
      iniciar();
      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Transacción no encontrada.');

      sincronizar.mockReturnValue(of(pagoDe({ estado: 'PAGADO' })));
      boton('Reintentar la verificación')!.click();
      fixture.detectChanges();
      expect(texto()).toContain('Tu pago fue exitoso');
    });
  });

  describe('pago fallido', () => {
    beforeEach(async () => {
      await crear({ id: 'tx-55' });
      sincronizar.mockReturnValue(of(pagoDe({ metodo: 'EN_LINEA', estado: 'FALLIDO' })));
      iniciar();
    });

    it('muestra el estado y el botón para reintentar', () => {
      expect(texto()).toContain('Fallido');
      expect(texto()).toContain('El pago no se completó');
      expect(boton('Reintentar el pago')).toBeDefined();
    });

    it('reintentar inicia otro pago en línea y redirige a la pasarela', () => {
      elegirMetodo.mockReturnValue(of(pagoDe({ metodo: 'EN_LINEA', urlPago: 'https://pasarela.test/p/2' })));
      redirigir.mockReturnValue(true);

      boton('Reintentar el pago')!.click();

      expect(elegirMetodo).toHaveBeenCalledWith(7, 'EN_LINEA');
      expect(guardar).toHaveBeenCalledWith(7);
      expect(redirigir).toHaveBeenCalledWith('https://pasarela.test/p/2');
    });

    it('deshabilita el botón durante la petición y no la repite', () => {
      const respuesta = new Subject<Pago>();
      elegirMetodo.mockReturnValue(respuesta);

      boton('Reintentar el pago')!.click();
      fixture.detectChanges();
      expect(boton('Procesando')!.disabled).toBe(true);

      fixture.componentInstance.reintentar();
      expect(elegirMetodo).toHaveBeenCalledTimes(1);

      respuesta.complete();
      fixture.detectChanges();
      expect(boton('Reintentar el pago')!.disabled).toBe(false);
    });

    it('avisa si el backend no entrega una dirección de pago válida', () => {
      elegirMetodo.mockReturnValue(of(pagoDe({ metodo: 'EN_LINEA', urlPago: null })));

      boton('Reintentar el pago')!.click();
      fixture.detectChanges();

      expect(redirigir).not.toHaveBeenCalled();
      expect(texto()).toContain('No recibimos una dirección de pago válida');
    });

    it('avisa si la dirección de pago no se puede abrir', () => {
      elegirMetodo.mockReturnValue(of(pagoDe({ metodo: 'EN_LINEA', urlPago: 'javascript:x' })));
      redirigir.mockReturnValue(false);

      boton('Reintentar el pago')!.click();
      fixture.detectChanges();

      expect(texto()).toContain('No recibimos una dirección de pago válida');
    });

    it('muestra el mensaje del backend si no puede reintentar (503)', () => {
      elegirMetodo.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 503, error: { detail: 'El pago en línea no está disponible.' } }))
      );

      boton('Reintentar el pago')!.click();
      fixture.detectChanges();

      expect(raiz().querySelectorAll('[role="alert"]')[0]?.textContent).toContain('El pago en línea no está disponible.');
    });
  });

  describe('avisos emergentes', () => {
    const avisos = (): [string, string][] => TestBed.inject(ToastService).visibles().map((a) => [a.tipo, a.titulo]);

    beforeEach(() => sessionStorage.clear());

    it('pagado: éxito "Pago recibido" con la acción para ver el comprobante', async () => {
      await crear({ id: 'tx-55' });
      sincronizar.mockReturnValue(of(pagoDe({ estado: 'PAGADO', metodo: 'EN_LINEA' })));
      iniciar();

      expect(avisos()).toEqual([['exito', 'Pago recibido']]);
      expect(TestBed.inject(ToastService).visibles()[0].accion?.etiqueta).toBe('Ver comprobante');
      expect(texto()).toContain('Tu pago fue exitoso');
    });

    it('fallido: error; pendiente: información', async () => {
      await crear({ id: 'tx-55' });
      sincronizar.mockReturnValue(of(pagoDe({ estado: 'FALLIDO', metodo: 'EN_LINEA' })));
      iniciar();
      expect(avisos()).toEqual([['error', 'El pago no se completó']]);

      TestBed.resetTestingModule();
      sessionStorage.clear();
      await crear({ id: 'tx-55' });
      sincronizar.mockReturnValue(of(pagoDe({ estado: 'PENDIENTE', metodo: 'EN_LINEA' })));
      iniciar();
      expect(avisos()).toEqual([['info', 'Pago en proceso']]);
    });

    it('volver a la pantalla con el mismo resultado no repite el aviso', async () => {
      await crear({ id: 'tx-55' });
      sincronizar.mockReturnValue(of(pagoDe({ estado: 'PAGADO', metodo: 'EN_LINEA' })));
      iniciar();
      const toast = TestBed.inject(ToastService);
      toast.cerrar(toast.visibles()[0].id);

      fixture.destroy();
      fixture = TestBed.createComponent(ResultadoPagoComponent);
      fixture.detectChanges();

      expect(avisos()).toEqual([]);
    });

    it('si la verificación falla, error con el mensaje de la pantalla', async () => {
      await crear({ id: 'tx-55' });
      sincronizar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'Pago en proceso.' } })));
      iniciar();

      expect(TestBed.inject(ToastService).visibles().map((a) => [a.tipo, a.titulo, a.descripcion])).toEqual([
        ['error', 'No se pudo verificar el pago', 'Pago en proceso.'],
      ]);
    });

    it('reintentar el pago permite anunciar el resultado del nuevo intento', async () => {
      await crear({ id: 'tx-55' });
      sincronizar.mockReturnValue(of(pagoDe({ estado: 'FALLIDO', metodo: 'EN_LINEA' })));
      iniciar();
      const toast = TestBed.inject(ToastService);
      toast.cerrar(toast.visibles()[0].id);
      elegirMetodo.mockReturnValue(of(pagoDe({ metodo: 'EN_LINEA', urlPago: 'https://pasarela.test/pagar' })));
      redirigir.mockReturnValue(true);

      boton('Reintentar el pago')!.click();
      fixture.detectChanges();
      fixture.destroy();
      fixture = TestBed.createComponent(ResultadoPagoComponent);
      fixture.detectChanges();

      expect(avisos()).toEqual([['error', 'El pago no se completó']]);
    });

    it('si el reintento falla, error con el mensaje de la pantalla', async () => {
      await crear({ id: 'tx-55' });
      sincronizar.mockReturnValue(of(pagoDe({ estado: 'FALLIDO', metodo: 'EN_LINEA' })));
      iniciar();
      const toast = TestBed.inject(ToastService);
      toast.cerrar(toast.visibles()[0].id);
      elegirMetodo.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503, error: { detail: 'Sin pasarela.' } })));

      boton('Reintentar el pago')!.click();
      fixture.detectChanges();

      expect(toast.visibles().map((a) => [a.tipo, a.titulo, a.descripcion])).toEqual([['error', 'No se pudo iniciar el pago', 'Sin pasarela.']]);
    });
  });
});
