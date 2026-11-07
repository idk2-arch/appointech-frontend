import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CitaResumen, EstadoCita } from '../../../core/models/cita';
import type { Calificacion } from '../../../core/models/calificacion';
import { CalificacionService } from '../../../core/services/calificacion.service';
import { CitaClienteService } from '../../../core/services/cita-cliente.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { CalificarModalComponent } from '../calificar-modal/calificar-modal.component';
import { ClienteModule } from '../cliente.module';
import { CONSULTAS_SIMULTANEAS, HistorialClienteComponent, TAMANO_TANDA } from './historial-cliente.component';

function cita(id: number, estado: EstadoCita, inicio = '2026-11-04T14:00:00'): CitaResumen {
  return {
    id,
    estado,
    tecnicoId: 1,
    tecnicoNombre: 'Luis',
    tecnicoApellido: 'Gómez',
    especialidadId: 1,
    especialidadNombre: 'Lavadoras',
    descripcionProblema: 'No centrifuga',
    direccionServicio: 'Calle 6 # 12-34',
    fechaHoraInicio: inicio,
    fechaHoraFin: inicio.replace('14:00', '15:00'),
  };
}

const calificacion = (citaId: number, puntuacion = 5, comentario: string | null = 'Excelente'): Calificacion => ({
  citaId,
  puntuacion,
  comentario,
  fecha: '2026-11-05T10:00:00',
});

const noEncontrada = () => throwError(() => new HttpErrorResponse({ status: 404 }));
const conflicto = (detail: string) => throwError(() => new HttpErrorResponse({ status: 409, error: { detail } }));

describe('HistorialClienteComponent', () => {
  let fixture: ComponentFixture<HistorialClienteComponent>;
  const obtener = vi.fn();
  const calificar = vi.fn();
  const exito = vi.fn();
  const error = vi.fn();

  async function crear(citas: Observable<CitaResumen[]>): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ClienteModule, RouterModule.forRoot([])],
      providers: [
        { provide: CitaClienteService, useValue: { listar: vi.fn().mockReturnValue(citas) } },
        { provide: CalificacionService, useValue: { obtener, calificar } },
        { provide: ToastService, useValue: { exito, error } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HistorialClienteComponent);
    fixture.detectChanges();
    await refrescar();
  }

  const refrescar = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const raiz = (): HTMLElement => fixture.nativeElement;
  const tarjetas = (): HTMLElement[] => Array.from(raiz().querySelectorAll<HTMLElement>('li'));
  const boton = (texto: string): HTMLButtonElement | undefined =>
    Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim().startsWith(texto));
  const texto = (): string => (raiz().textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 10, 20, 12, 0, 0), toFake: ['Date'] });
    obtener.mockReset().mockImplementation(() => noEncontrada());
    calificar.mockReset();
    exito.mockReset();
    error.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('muestra solo las finalizadas, la más reciente primero, con técnico y fecha', async () => {
    await crear(of([cita(1, 'FINALIZADA', '2026-11-01T14:00:00'), cita(2, 'CANCELADA'), cita(3, 'FINALIZADA', '2026-11-10T14:00:00'), cita(4, 'PENDIENTE')]));

    expect(tarjetas()).toHaveLength(2);
    expect(obtener.mock.calls.map((c) => c[0])).toEqual([3, 1]);
    expect(texto()).toContain('Lavadoras');
    expect(texto()).toContain('Luis Gómez');
    expect(texto()).toContain('Finalizadas (2)');
    expect(texto()).toContain('Canceladas (1)');
  });

  it('el encabezado y la lista entran con la animación de aparecer', async () => {
    await crear(of([cita(1, 'FINALIZADA')]));
    expect(raiz().querySelector('[appaparecer="simple"] h1')).not.toBeNull();
    expect(raiz().querySelector('ul[appaparecer="lista"]')).not.toBeNull();
  });

  it('muestra el estado de carga mientras llega el listado', async () => {
    await crear(new Subject<CitaResumen[]>());
    expect(raiz().querySelector('[role="status"]')?.textContent).toContain('Cargando tu historial');
  });

  it('muestra el estado vacío con un enlace para solicitar un servicio', async () => {
    await crear(of([]));
    expect(texto()).toContain('Aún no tienes servicios en tu historial');
    expect(raiz().querySelector('a')?.getAttribute('href')).toBe('/cliente/solicitar');
  });

  it('avisa cuando hay citas pero ninguna finalizada', async () => {
    await crear(of([cita(1, 'CANCELADA')]));
    expect(texto()).toContain('Aún no tienes servicios finalizados');
    expect(obtener).not.toHaveBeenCalled();
  });

  it('muestra el mensaje del backend si falla la carga y reintenta', async () => {
    await crear(throwError(() => new HttpErrorResponse({ status: 500, error: { error: 'Servicio no disponible' } })));
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Servicio no disponible');

    fixture.componentInstance.citas.set([]);
    boton('Reintentar')!.click();
    await refrescar();
    expect(raiz().querySelector('[role="alert"]')).not.toBeNull();
  });

  it('trata una respuesta que no es lista como vacía', async () => {
    await crear(of(null as unknown as CitaResumen[]));
    expect(texto()).toContain('Aún no tienes servicios en tu historial');
  });

  describe('calificación de cada cita', () => {
    it('con calificación muestra las estrellas y el comentario, sin botón', async () => {
      obtener.mockReset().mockReturnValue(of(calificacion(1, 4, 'Muy amable')));
      await crear(of([cita(1, 'FINALIZADA')]));

      expect(raiz().querySelector('app-peek-rating [role="img"]')?.getAttribute('aria-label')).toBe('4 de 5 estrellas');
      expect(texto()).toContain('Muy amable');
      expect(boton('Calificar')).toBeUndefined();
    });

    it('con calificación sin comentario muestra solo las estrellas', async () => {
      obtener.mockReset().mockReturnValue(of(calificacion(1, 5, null)));
      await crear(of([cita(1, 'FINALIZADA')]));

      expect(raiz().querySelector('app-peek-rating [role="img"]')).not.toBeNull();
      expect(raiz().querySelector('li p.break-words.text-white\\/80')).toBeNull();
    });

    it('sin calificación (404) ofrece Calificar', async () => {
      await crear(of([cita(1, 'FINALIZADA', '2026-11-10T14:00:00')]));
      expect(boton('Calificar')).toBeDefined();
      expect(texto()).not.toContain('El plazo para calificar venció');
    });

    it('pasados 30 días sin calificar no ofrece el botón y explica el plazo', async () => {
      await crear(of([cita(1, 'FINALIZADA', '2026-09-01T14:00:00')]));
      expect(boton('Calificar')).toBeUndefined();
      expect(texto()).toContain('El plazo para calificar venció');
    });

    it('mientras consulta muestra un esqueleto', async () => {
      obtener.mockReset().mockReturnValue(new Subject<Calificacion>());
      await crear(of([cita(1, 'FINALIZADA')]));
      expect(raiz().querySelector('li [aria-label="Cargando calificación"]')).not.toBeNull();
      expect(boton('Calificar')).toBeUndefined();
    });

    it('si la consulta falla (no 404) lo dice y permite reintentar', async () => {
      obtener.mockReset().mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500, error: { error: 'Caído' } })));
      await crear(of([cita(1, 'FINALIZADA', '2026-11-10T14:00:00')]));
      expect(texto()).toContain('No pudimos consultar tu calificación');

      obtener.mockReturnValue(of(calificacion(1, 3, null)));
      boton('Reintentar')!.click();
      await refrescar();
      expect(raiz().querySelector('app-peek-rating [role="img"]')?.getAttribute('aria-label')).toBe('3 de 5 estrellas');
    });

    it('limita las consultas a una tanda y pide más al pulsar Ver más', async () => {
      const muchas = Array.from({ length: 25 }, (_, i) => cita(i + 1, 'FINALIZADA', `2026-10-${String(i + 1).padStart(2, '0')}T14:00:00`));
      await crear(of(muchas));

      expect(tarjetas()).toHaveLength(TAMANO_TANDA);
      expect(obtener).toHaveBeenCalledTimes(TAMANO_TANDA);
      expect(boton('Ver más')!.textContent).toContain('15');

      boton('Ver más')!.click();
      await refrescar();
      expect(tarjetas()).toHaveLength(TAMANO_TANDA * 2);
      expect(obtener).toHaveBeenCalledTimes(TAMANO_TANDA * 2);
    });

    it('nunca hay más de las consultas simultáneas permitidas', async () => {
      const pendientes: Subject<Calificacion>[] = [];
      obtener.mockReset().mockImplementation(() => {
        const s = new Subject<Calificacion>();
        pendientes.push(s);
        return s;
      });
      await crear(of(Array.from({ length: 8 }, (_, i) => cita(i + 1, 'FINALIZADA'))));

      expect(obtener).toHaveBeenCalledTimes(CONSULTAS_SIMULTANEAS);
      pendientes[0].error(new HttpErrorResponse({ status: 404 }));
      expect(obtener).toHaveBeenCalledTimes(CONSULTAS_SIMULTANEAS + 1);
    });
  });

  describe('canceladas', () => {
    it('se ven en su pestaña, sin calificación, y vuelven las finalizadas', async () => {
      await crear(of([cita(1, 'FINALIZADA'), cita(2, 'CANCELADA')]));
      obtener.mockClear();

      boton('Canceladas')!.click();
      await refrescar();
      expect(tarjetas()).toHaveLength(1);
      expect(texto()).toContain('Cancelada');
      expect(boton('Calificar')).toBeUndefined();
      expect(obtener).not.toHaveBeenCalled();

      boton('Finalizadas')!.click();
      await refrescar();
      expect(tarjetas()).toHaveLength(1);
      expect(obtener).not.toHaveBeenCalled();
    });

    it('sin canceladas lo dice', async () => {
      await crear(of([cita(1, 'FINALIZADA')]));
      boton('Canceladas')!.click();
      await refrescar();
      expect(texto()).toContain('No tienes citas canceladas');
    });
  });

  describe('modal de calificar', () => {
    const abrir = async (): Promise<void> => {
      await crear(of([cita(1, 'FINALIZADA', '2026-11-10T14:00:00')]));
      boton('Calificar')!.click();
      await refrescar();
    };
    const elegirYEnviar = async (n = 5): Promise<void> => {
      const modal = fixture.debugElement.query(By.directive(CalificarModalComponent));
      modal.componentInstance.elegir(n);
      modal.injector.get(ChangeDetectorRef).markForCheck();
      await refrescar();
      document.body.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      await refrescar();
    };

    it('se abre con el enviar apagado y se cierra con Cancelar', async () => {
      await abrir();
      expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
      expect(document.body.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);

      boton('Cancelar')!.click();
      await refrescar();
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    });

    it('al calificar con éxito agradece en el mismo diálogo, avisa y actualiza solo esa tarjeta', async () => {
      calificar.mockReturnValue(of(calificacion(1, 5, null)));
      await abrir();

      await elegirYEnviar(5);

      expect(calificar).toHaveBeenCalledWith(1, { puntuacion: 5 });
      expect(exito).toHaveBeenCalledWith('Gracias por tu calificación');
      expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('¡Gracias por tu calificación!');
      expect(document.body.querySelector('[role="dialog"] textarea')).toBeNull();
      expect(raiz().querySelector('li app-peek-rating [role="img"]')?.getAttribute('aria-label')).toBe('5 de 5 estrellas');
      expect(obtener).toHaveBeenCalledTimes(1);

      boton('Cerrar')!.click();
      await refrescar();
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();

      expect(fixture.componentInstance.calificacionEnviada()).toBe(false);
    });

    it('mientras envía no se puede cerrar ni volver a enviar', async () => {
      const envio = new Subject<Calificacion>();
      calificar.mockReturnValue(envio);
      await abrir();
      await elegirYEnviar(4);

      fixture.componentInstance.cerrarCalificar();
      fixture.componentInstance.calificar({ puntuacion: 4 });
      expect(calificar).toHaveBeenCalledTimes(1);
      expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();

      envio.next(calificacion(1, 4));
      envio.complete();
      await refrescar();
      expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('¡Gracias por tu calificación!');
    });

    it('un error de red muestra el aviso, deja abierto el modal con el mensaje y permite reintentar', async () => {
      calificar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      await abrir();
      await elegirYEnviar(2);

      expect(error).toHaveBeenCalledWith(expect.stringContaining('No fue posible conectar con el servidor'));
      expect(document.body.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain('No fue posible conectar');
      expect(document.body.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
    });

    it('un 409 "ya calificada" avisa con el mensaje del backend, cierra y refresca la tarjeta', async () => {
      calificar.mockReturnValue(conflicto('La cita ya fue calificada'));
      await abrir();
      obtener.mockReset().mockReturnValue(of(calificacion(1, 3, 'Antes')));

      await elegirYEnviar(5);

      expect(error).toHaveBeenCalledWith('La cita ya fue calificada');
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
      expect(obtener).toHaveBeenCalledWith(1);
      expect(raiz().querySelector('app-peek-rating [role="img"]')?.getAttribute('aria-label')).toBe('3 de 5 estrellas');
    });

    it('un 409 por plazo vencido avisa, cierra y reemplaza el botón por el texto del plazo', async () => {
      calificar.mockReturnValue(conflicto('El plazo para calificar venció'));
      await abrir();

      await elegirYEnviar(5);

      expect(error).toHaveBeenCalledWith('El plazo para calificar venció');
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
      expect(boton('Calificar')).toBeUndefined();
      expect(texto()).toContain('El plazo para calificar venció');
    });

    it('otro 409 (cita no finalizada) muestra el mensaje y deja el modal abierto', async () => {
      calificar.mockReturnValue(conflicto('La cita no está finalizada'));
      await abrir();

      await elegirYEnviar(5);

      expect(error).toHaveBeenCalledWith('La cita no está finalizada');
      expect(document.body.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain('La cita no está finalizada');
    });

    it('si ya no hay cita elegida, calificar no hace nada', async () => {
      await crear(of([]));
      fixture.componentInstance.calificar({ puntuacion: 3 });
      expect(calificar).not.toHaveBeenCalled();
    });
  });

  it('al destruir el componente cancela las consultas pendientes', async () => {
    const pendiente = new Subject<Calificacion>();
    obtener.mockReset().mockReturnValue(pendiente);
    await crear(of([cita(1, 'FINALIZADA')]));

    fixture.destroy();

    expect(pendiente.observed).toBe(false);
  });
});
