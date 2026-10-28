import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CitaTecnico } from '../../../core/models/tecnico-agenda';
import { AgendaTecnicoService } from '../../../core/services/agenda-tecnico.service';
import { FotoCitaService } from '../../../core/services/foto-cita.service';
import { TecnicoModule } from '../tecnico.module';
import { MiAgendaComponent } from './mi-agenda.component';

function cita(datos: Partial<CitaTecnico> = {}): CitaTecnico {
  return {
    id: 1,
    estado: 'CONFIRMADA',
    fechaHoraInicio: '2026-10-27T10:00:00',
    fechaHoraFin: '2026-10-27T11:00:00',
    descripcionProblema: 'La lavadora no centrifuga',
    direccionServicio: 'Calle 6 # 12-34',
    latitud: 4.3,
    longitud: -74.3,
    cliente: { nombre: 'Ana', apellido: 'Pérez', telefono: null },
    ...datos,
  };
}

describe('MiAgendaComponent: electrodoméstico, fotos y pre-diagnóstico', () => {
  let fixture: ComponentFixture<MiAgendaComponent>;
  const raiz = (): HTMLElement => fixture.nativeElement;

  async function crear(citas: CitaTecnico[]): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [TecnicoModule, RouterModule.forRoot([])],
      providers: [provideHttpClient(), { provide: AgendaTecnicoService, useValue: { obtenerCitas: () => of(citas) } }],
    }).compileComponents();
    fixture = TestBed.createComponent(MiAgendaComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.spyOn(FotoCitaService.prototype, 'urlSegura').mockImplementation(() => of('blob:foto'));
  });

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
  });

  it('una cita sin datos del equipo no muestra nada extra', async () => {
    await crear([cita()]);
    expect(raiz().textContent).not.toContain('Electrodoméstico');
    expect(raiz().textContent).not.toContain('Urgente');
    expect(raiz().querySelector('app-prediagnostico')).toBeNull();
    expect(raiz().textContent).not.toContain('Ver fotos');
  });

  it('muestra marca y modelo', async () => {
    await crear([cita({ marcaElectrodomestico: 'Samsung', modeloElectrodomestico: 'WW90' })]);
    expect(raiz().textContent).toContain('Electrodoméstico: Samsung WW90');
  });

  it('destaca las citas urgentes', async () => {
    await crear([cita({ urgencia: 'URGENTE' }), cita({ id: 2, urgencia: 'NORMAL' })]);
    const chips = Array.from(raiz().querySelectorAll('li span')).filter((s) => s.textContent?.trim() === 'Urgente');
    expect(chips).toHaveLength(1);
  });

  it('muestra el pre-diagnóstico de IA cuando la cita lo trae', async () => {
    await crear([
      cita({
        preDiagnostico: {
          causasProbables: ['Bomba obstruida'],
          urgenciaSugerida: 'ALTA',
          preguntasParaElTecnico: ['¿Hace ruido?'],
          generadoPorIA: true,
        },
      }),
    ]);
    expect(raiz().querySelector('app-prediagnostico')).not.toBeNull();
    expect(raiz().textContent).toContain('Bomba obstruida');
    expect(raiz().textContent).toContain('No reemplaza el diagnóstico del técnico.');
  });

  it('las fotos se piden solo al desplegarlas', async () => {
    await crear([cita({ fotosElectrodomestico: [{ id: 1, url: '/api/citas/1/fotos/1' }, { id: 2, url: '/api/citas/1/fotos/2' }] })]);
    const boton = Array.from(raiz().querySelectorAll('button')).find((b) => b.textContent?.includes('Ver fotos (2)'))!;

    expect(FotoCitaService.prototype.urlSegura).not.toHaveBeenCalled();
    expect(raiz().querySelector('app-fotos-electrodomestico')).toBeNull();
    expect(boton.getAttribute('aria-expanded')).toBe('false');

    boton.click();
    fixture.detectChanges();

    expect(raiz().querySelector('app-fotos-electrodomestico')).not.toBeNull();
    expect(FotoCitaService.prototype.urlSegura).toHaveBeenCalledTimes(2);
    expect(boton.textContent).toContain('Ocultar fotos');

    boton.click();
    fixture.detectChanges();
    expect(raiz().querySelector('app-fotos-electrodomestico')).toBeNull();
  });

  it('las fotos de una cita no se despliegan al abrir las de otra', async () => {
    const fotos = (id: number) => [{ id, url: `/api/citas/${id}/fotos/${id}` }];
    await crear([cita({ id: 1, fotosElectrodomestico: fotos(1) }), cita({ id: 2, fotosElectrodomestico: fotos(2) })]);

    (raiz().querySelectorAll('li')[0].querySelector('button.boton-fila-admin') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(raiz().querySelectorAll('app-fotos-electrodomestico')).toHaveLength(1);
  });
});
