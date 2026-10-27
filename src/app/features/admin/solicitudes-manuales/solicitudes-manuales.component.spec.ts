import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SolicitudManualAdmin, SolicitudManualAdminService } from '../../../core/services/solicitud-manual-admin.service';
import { TecnicoService } from '../../../core/services/tecnico.service';
import { AdminModule } from '../admin.module';
import { SolicitudesManualesComponent } from './solicitudes-manuales.component';

function solicitud(datos: Partial<SolicitudManualAdmin>): SolicitudManualAdmin {
  return {
    id: 1,
    clienteId: 1,
    clienteNombre: 'Ana',
    clienteApellido: 'Pérez',
    telefono: '300 123 4567',
    direccionServicio: 'Vereda El Peñón',
    descripcionProblema: 'La lavadora no centrifuga',
    especialidadId: 1,
    especialidadNombre: 'Lavadoras',
    latitud: 4.3,
    longitud: -74.3,
    creadaEn: '2026-10-27T11:55:00',
    ...datos,
  };
}

const ANA = solicitud({ id: 1, creadaEn: '2026-10-27T11:55:00' });
const LUIS = solicitud({
  id: 2,
  clienteNombre: 'Luis',
  clienteApellido: 'Gómez',
  telefono: null,
  direccionServicio: 'Calle 6 # 12-34',
  descripcionProblema: 'La nevera no enfría',
  especialidadNombre: 'Neveras',
  creadaEn: '2026-10-25T09:00:00',
});

describe('SolicitudesManualesComponent', () => {
  let fixture: ComponentFixture<SolicitudesManualesComponent>;
  let servicio: { listar: ReturnType<typeof vi.fn>; asignar: ReturnType<typeof vi.fn> };

  async function crear(lista: SolicitudManualAdmin[]): Promise<void> {
    servicio = { listar: vi.fn().mockReturnValue(of(lista)), asignar: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [AdminModule, RouterModule.forRoot([])],
      providers: [
        { provide: SolicitudManualAdminService, useValue: servicio },
        { provide: TecnicoService, useValue: { obtenerTecnicos: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SolicitudesManualesComponent);
    fixture.detectChanges();
  }

  const raiz = (): HTMLElement => fixture.nativeElement;
  const nombres = (): string[] =>
    Array.from(raiz().querySelectorAll('li h2')).map((h) => h.textContent?.trim() ?? '');

  /** Sin zona, un cambio hecho directo en el componente (no por un evento) debe marcarse a mano. */
  const refrescar = (): void => {
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 9, 27, 12, 0, 0) });
  });

  afterEach(() => vi.useRealTimers());

  it('muestra una tarjeta por solicitud con su tiempo y el contador', async () => {
    await crear([ANA, LUIS]);

    expect(nombres()).toEqual(['Luis Gómez', 'Ana Pérez']);
    expect(raiz().textContent).toContain('Hace 5 min');
    expect(raiz().textContent).toContain('Hace 2 días');
    expect(raiz().textContent).toContain('2 pendientes');
  });

  it('resalta la que espera más de 24 horas', async () => {
    await crear([ANA, LUIS]);

    const avisos = raiz().textContent?.match(/Espera hace más de 1 día/g) ?? [];
    expect(avisos).toHaveLength(1);
  });

  it('muestra el estado vacío cuando no hay solicitudes', async () => {
    await crear([]);

    expect(raiz().textContent).toContain('No hay solicitudes por coordinar');
    expect(raiz().querySelectorAll('li')).toHaveLength(0);
  });

  it('busca por cliente, dirección o descripción sin importar tildes', async () => {
    await crear([ANA, LUIS]);
    const componente = fixture.componentInstance;

    componente.buscar('gomez');
    refrescar();
    expect(nombres()).toEqual(['Luis Gómez']);

    componente.buscar('peñón');
    refrescar();
    expect(nombres()).toEqual(['Ana Pérez']);

    componente.buscar('enfria');
    refrescar();
    expect(nombres()).toEqual(['Luis Gómez']);
    expect(raiz().textContent).toContain('1 de 2 pendientes');

    componente.buscar('zzz');
    refrescar();
    expect(raiz().textContent).toContain('No encontramos solicitudes con ese texto');
  });

  it('ordena por antigüedad y cambia el orden', async () => {
    await crear([ANA, LUIS]);
    const componente = fixture.componentInstance;

    expect(nombres()).toEqual(['Luis Gómez', 'Ana Pérez']);

    componente.cambiarOrden('recientes');
    refrescar();
    expect(nombres()).toEqual(['Ana Pérez', 'Luis Gómez']);
  });

  it('ofrece Llamar y WhatsApp solo si hay teléfono', async () => {
    await crear([ANA, LUIS]);

    const enlaces = Array.from(raiz().querySelectorAll<HTMLAnchorElement>('li a')).map((a) => a.getAttribute('href'));
    expect(enlaces.filter((h) => h?.startsWith('tel:'))).toEqual(['tel:3001234567']);
    expect(enlaces.filter((h) => h?.startsWith('https://wa.me/573001234567?text='))).toHaveLength(1);
  });

  it('"Asignar técnico" abre el modal de la solicitud', async () => {
    await crear([ANA]);

    const boton = Array.from(raiz().querySelectorAll<HTMLButtonElement>('li button')).find((b) =>
      b.textContent?.includes('Asignar técnico')
    );
    boton?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.solicitudAsignando?.id).toBe(1);
    expect(raiz().querySelector('app-asignar-solicitud-modal')?.textContent).toContain('Asignar solicitud');
  });

  it('al asignar, la tarjeta se desvanece, sale de la lista y se confirma', async () => {
    await crear([ANA, LUIS]);
    const componente = fixture.componentInstance;

    componente.onAsignada(ANA);
    refrescar();
    expect(nombres()).toContain('Ana Pérez');
    expect(raiz().textContent).toContain('quedó agendada');

    vi.advanceTimersByTime(400);
    refrescar();
    expect(nombres()).toEqual(['Luis Gómez']);
  });
});
