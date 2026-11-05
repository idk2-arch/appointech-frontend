import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CitaResumen, EstadoCita } from '../../../core/models/cita';
import { Pago } from '../../../core/models/pago';
import { pagoDe } from '../../../core/models/pago.mock';
import { PagoService } from '../../../core/services/pago.service';
import { CitaClienteService } from '../../../core/services/cita-cliente.service';
import { ClienteModule } from '../cliente.module';
import { MisCitasComponent } from './mis-citas.component';

function cita(id: number, estado: EstadoCita): CitaResumen {
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
    fechaHoraInicio: '2026-11-04T14:00:00',
    fechaHoraFin: '2026-11-04T15:00:00',
  };
}

describe('MisCitasComponent', () => {
  let fixture: ComponentFixture<MisCitasComponent>;
  const obtener = vi.fn();

  async function crear(respuesta: Observable<CitaResumen[]>): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ClienteModule, RouterModule.forRoot([])],
      providers: [
        { provide: CitaClienteService, useValue: { listar: vi.fn().mockReturnValue(respuesta) } },
        { provide: PagoService, useValue: { obtener } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MisCitasComponent);
    fixture.detectChanges();
  }

  const raiz = (): HTMLElement => fixture.nativeElement;
  const abrirPrimera = async (): Promise<void> => {
    raiz().querySelector<HTMLButtonElement>('.tarjeta-expandible__abrir')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const enlacesDelDialogo = (): string[] =>
    Array.from(document.body.querySelectorAll<HTMLAnchorElement>('[role="dialog"] a, .tarjeta-expandible__capa a')).map(
      (a) => `${a.textContent?.trim()}|${a.getAttribute('href')}`
    );
  const tarjetas = (): number => raiz().querySelectorAll('li').length;

  it('lista las citas con su insignia de estado y su técnico', async () => {
    await crear(of([cita(1, 'CONFIRMADA'), cita(2, 'CANCELADA')]));

    expect(tarjetas()).toBe(2);
    expect(raiz().textContent).toContain('Confirmada');
    expect(raiz().textContent).toContain('Cancelada');
    expect(raiz().textContent).toContain('Luis Gómez');
  });

  it('filtra por estado y avisa cuando ninguna coincide', async () => {
    await crear(of([cita(1, 'CONFIRMADA'), cita(2, 'CANCELADA')]));
    const filtrar = (texto: string): void => {
      raiz().querySelector<HTMLButtonElement>('#citas-filtro')!.click();
      fixture.detectChanges();
      Array.from(raiz().querySelectorAll<HTMLElement>('[role="option"]')).find((o) => o.textContent?.trim() === texto)!.click();
      fixture.detectChanges();
    };

    filtrar('Cancelada');
    expect(tarjetas()).toBe(1);

    filtrar('Finalizada');
    expect(tarjetas()).toBe(0);
    expect(raiz().textContent).toContain('No tienes citas con ese estado');
  });

  it('muestra el estado vacío', async () => {
    await crear(of([]));
    expect(raiz().textContent).toContain('Aún no tienes citas');
  });

  it('muestra el mensaje del backend si falla la carga', async () => {
    await crear(throwError(() => new HttpErrorResponse({ status: 500, error: { error: 'Servicio no disponible' } })));
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Servicio no disponible');
  });

  it('una cita sin fecha ni técnico muestra los textos por defecto', async () => {
    await crear(of([{ ...cita(3, 'PENDIENTE'), fechaHoraInicio: '', tecnicoNombre: null, tecnicoApellido: null, especialidadNombre: null }]));

    expect(raiz().textContent).toContain('Por coordinar');
    expect(raiz().textContent).toContain('Sin asignar');
    expect(raiz().textContent).toContain('Servicio');
  });

  describe('tarjeta compacta', () => {
    it('muestra horario completo, dirección, problema y técnico sin pedir ningún pago', async () => {
      obtener.mockReset();
      await crear(of(Array.from({ length: 14 }, (_, i) => cita(i + 1, 'FINALIZADA'))));

      expect(tarjetas()).toBe(14);
      const primera = raiz().querySelector('li')!;
      const texto = (primera.textContent ?? '').replace(/\s+/g, ' ');
      expect(texto).toMatch(/2:00\s*p\.\s*m\.\s*–\s*3:00\s*p\.\s*m\./);
      expect(texto).toContain('Calle 6 # 12-34');
      expect(texto).toContain('No centrifuga');
      expect(texto).toContain('Luis Gómez');
      expect(primera.querySelector('p.truncate')?.getAttribute('title')).toBe('Calle 6 # 12-34');
      expect(primera.querySelector('p.line-clamp-2')).not.toBeNull();
      expect(primera.querySelector('app-insignia-pago')).toBeNull();
      expect(obtener).not.toHaveBeenCalled();
    });

    it('tras expandir una cita finalizada con costo final, su tarjeta compacta muestra el pago y el monto', async () => {
      obtener.mockReset().mockReturnValue(of(pagoDe({ citaId: 5, estado: 'PENDIENTE' })));
      await crear(of([cita(5, 'FINALIZADA'), cita(6, 'FINALIZADA')]));

      await abrirPrimera();

      const [primera, segunda] = Array.from(raiz().querySelectorAll('li'));
      expect(primera.querySelector('app-insignia-pago')?.textContent).toContain('Pendiente');
      expect((primera.textContent ?? '').replace(/\s+/g, ' ')).toContain('$ 120.000');
      expect(segunda.querySelector('app-insignia-pago')).toBeNull();
      expect(obtener).toHaveBeenCalledTimes(1);
    });

    it('si el pago aún no tiene costo final no se muestra insignia en la tarjeta compacta', async () => {
      obtener.mockReset().mockReturnValue(of(pagoDe({ citaId: 5, montoFinal: null })));
      await crear(of([cita(5, 'FINALIZADA')]));

      await abrirPrimera();

      expect(raiz().querySelector('li app-insignia-pago')).toBeNull();
    });
  });

  describe('tarjeta expandida', () => {
    const acciones = (): string[] => enlacesDelDialogo().map((e) => e.split('|')[0]);
    const dialogo = (): string => document.body.querySelector('.tarjeta-expandible__capa')?.textContent?.replace(/\s+/g, ' ') ?? '';

    it('muestra técnico, horario, dirección, problema y pago con una rejilla de etiqueta y valor', async () => {
      obtener.mockReset().mockReturnValue(of(pagoDe({ citaId: 5, estado: 'PENDIENTE' })));
      await crear(of([cita(5, 'FINALIZADA')]));

      await abrirPrimera();

      const capa = document.body.querySelector('.tarjeta-expandible__capa')!;
      expect(Array.from(capa.querySelectorAll('.tarjeta-expandible__dato dt')).map((dt) => dt.textContent)).toEqual([
        'Fecha',
        'Horario',
        'Técnico',
        'Dirección',
        'Problema',
        'Pago',
      ]);
      expect(dialogo()).toContain('Luis Gómez');
      expect(dialogo()).toContain('Calle 6 # 12-34');
      expect(dialogo()).toContain('No centrifuga');
      expect(dialogo()).toContain('Pendiente');
      expect(obtener).toHaveBeenCalledWith(5);
    });

    it('con costo final y pago pendiente ofrece Pagar', async () => {
      obtener.mockReset().mockReturnValue(of(pagoDe({ citaId: 5, estado: 'PENDIENTE' })));
      await crear(of([cita(5, 'FINALIZADA')]));
      await abrirPrimera();

      expect(enlacesDelDialogo()).toEqual(['Ver detalle|/cliente/citas/5', 'Pagar|/cliente/citas/5']);
    });

    it('con el pago fallido también ofrece Pagar', async () => {
      obtener.mockReset().mockReturnValue(of(pagoDe({ citaId: 5, estado: 'FALLIDO' })));
      await crear(of([cita(5, 'FINALIZADA')]));
      await abrirPrimera();

      expect(acciones()).toEqual(['Ver detalle', 'Pagar']);
    });

    it('con el pago ya hecho NO ofrece Pagar y lleva al comprobante', async () => {
      obtener.mockReset().mockReturnValue(of(pagoDe({ citaId: 5, estado: 'PAGADO' })));
      await crear(of([cita(5, 'FINALIZADA')]));
      await abrirPrimera();

      expect(enlacesDelDialogo()).toEqual(['Ver detalle|/cliente/citas/5', 'Ver comprobante|/cliente/citas/5']);
      expect(dialogo()).not.toContain('Pagar');
    });

    it('sin costo final no ofrece Pagar y explica que se espera al técnico', async () => {
      obtener.mockReset().mockReturnValue(of(pagoDe({ citaId: 5, montoFinal: null })));
      await crear(of([cita(5, 'FINALIZADA')]));
      await abrirPrimera();

      expect(acciones()).toEqual(['Ver detalle']);
      expect(dialogo()).toContain('Esperando el costo final del técnico');
    });

    it('si el backend dice 404 trata el pago como sin costo final', async () => {
      obtener.mockReset().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
      await crear(of([cita(5, 'FINALIZADA')]));
      await abrirPrimera();

      expect(acciones()).toEqual(['Ver detalle']);
      expect(dialogo()).toContain('Esperando el costo final del técnico');
    });

    it('mientras carga el pago no muestra Pagar ni Ver comprobante, solo un esqueleto', async () => {
      obtener.mockReset().mockReturnValue(new Subject<Pago>());
      await crear(of([cita(5, 'FINALIZADA')]));
      await abrirPrimera();

      expect(acciones()).toEqual(['Ver detalle']);
      expect(dialogo()).not.toContain('Esperando el costo final');
      expect(document.body.querySelector('.tarjeta-expandible__acciones .animate-pulse')).not.toBeNull();
    });

    it('si falla la consulta del pago no ofrece acciones de pago', async () => {
      obtener.mockReset().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500, error: { error: 'Pagos caídos' } })));
      await crear(of([cita(5, 'FINALIZADA')]));
      await abrirPrimera();

      expect(acciones()).toEqual(['Ver detalle']);
      expect(dialogo()).toContain('Pagos caídos');
    });

    it('en una cita que no está finalizada solo ofrece Ver detalle y no consulta el pago', async () => {
      obtener.mockReset();
      await crear(of([cita(6, 'CONFIRMADA')]));
      await abrirPrimera();

      expect(enlacesDelDialogo()).toEqual(['Ver detalle|/cliente/citas/6']);
      expect(obtener).not.toHaveBeenCalled();
      expect(document.body.querySelector('.tarjeta-expandible__capa [hidden]')).not.toBeNull();
    });
  });
});
