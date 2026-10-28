import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EstadoCita } from '../../../core/models/cita';
import { CitaTecnico } from '../../../core/models/tecnico-agenda';
import { AgendaTecnicoService } from '../../../core/services/agenda-tecnico.service';
import { CitaTecnicoService } from '../../../core/services/cita-tecnico.service';
import { TecnicoModule } from '../tecnico.module';
import { MiAgendaComponent } from './mi-agenda.component';

function cita(id: number, estado: EstadoCita): CitaTecnico {
  return {
    id,
    estado,
    fechaHoraInicio: '2026-10-27T10:00:00',
    fechaHoraFin: '2026-10-27T11:00:00',
    descripcionProblema: 'La lavadora no centrifuga',
    direccionServicio: 'Calle 6 # 12-34',
    latitud: 4.3,
    longitud: -74.3,
    cliente: { nombre: 'Ana', apellido: 'Pérez', telefono: '300 123 4567' },
  };
}

describe('MiAgendaComponent', () => {
  let fixture: ComponentFixture<MiAgendaComponent>;
  let agenda: { obtenerCitas: ReturnType<typeof vi.fn> };
  let acciones: {
    cambiarEstado: ReturnType<typeof vi.fn>;
    cancelar: ReturnType<typeof vi.fn>;
    guardarDiagnostico: ReturnType<typeof vi.fn>;
  };

  async function crear(citas: CitaTecnico[]): Promise<void> {
    agenda = { obtenerCitas: vi.fn().mockReturnValue(of(citas)) };
    acciones = {
      cambiarEstado: vi.fn().mockReturnValue(of({})),
      cancelar: vi.fn().mockReturnValue(of({})),
      guardarDiagnostico: vi.fn().mockReturnValue(of({ diagnostico: 'Bomba dañada', recomendaciones: null, fecha: '' })),
    };
    await TestBed.configureTestingModule({
      imports: [TecnicoModule, RouterModule.forRoot([])],
      providers: [
        { provide: AgendaTecnicoService, useValue: agenda },
        { provide: CitaTecnicoService, useValue: acciones },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MiAgendaComponent);
    fixture.detectChanges();
  }

  const raiz = (): HTMLElement => fixture.nativeElement;
  const etiquetasBotones = (): string[] =>
    Array.from(raiz().querySelectorAll('li button')).map((b) => b.textContent?.trim() ?? '');
  const boton = (texto: string): HTMLButtonElement | undefined =>
    Array.from(raiz().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === texto);

  /** jsdom no implementa requestSubmit(), así que el envío se dispara directo sobre el formulario. */
  const enviarDialogo = (): void => {
    raiz().querySelector<HTMLFormElement>('[role="dialog"] form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.resetTestingModule());

  it('CONFIRMADA muestra la insignia y solo "Voy en camino" y "Cancelar"', async () => {
    await crear([cita(1, 'CONFIRMADA')]);

    expect(raiz().querySelector('app-insignia-estado')?.textContent).toContain('Confirmada');
    expect(etiquetasBotones()).toEqual(['Voy en camino', 'Cancelar']);
  });

  it('EN_CAMINO muestra "Iniciar servicio" y "Cancelar"', async () => {
    await crear([cita(1, 'EN_CAMINO')]);
    expect(etiquetasBotones()).toEqual(['Iniciar servicio', 'Cancelar']);
  });

  it('EN_PROCESO muestra diagnóstico, "Finalizar servicio" y "Cancelar"', async () => {
    await crear([cita(1, 'EN_PROCESO')]);
    expect(etiquetasBotones()).toEqual(['Registrar diagnóstico', 'Finalizar servicio', 'Cancelar']);
  });

  it('una cita ya cerrada no ofrece acciones', async () => {
    await crear([cita(1, 'FINALIZADA')]);
    expect(etiquetasBotones()).toEqual([]);
  });

  it('"Voy en camino" cambia el estado, avisa y recarga la agenda', async () => {
    await crear([cita(5, 'CONFIRMADA')]);

    boton('Voy en camino')!.click();
    fixture.detectChanges();

    expect(acciones.cambiarEstado).toHaveBeenCalledWith(5, 'EN_CAMINO');
    expect(agenda.obtenerCitas).toHaveBeenCalledTimes(2);
    expect(raiz().querySelector('[role="status"]')?.textContent).toContain('actualizado');
  });

  it('"Finalizar servicio" pide confirmación antes de enviar', async () => {
    await crear([cita(5, 'EN_PROCESO')]);

    boton('Finalizar servicio')!.click();
    fixture.detectChanges();
    expect(acciones.cambiarEstado).not.toHaveBeenCalled();
    expect(raiz().querySelector('[role="dialog"]')?.textContent).toContain('¿Confirmas');

    enviarDialogo();
    expect(acciones.cambiarEstado).toHaveBeenCalledWith(5, 'FINALIZADA');
  });

  it('cancelar exige motivo y lo envía recortado', async () => {
    await crear([cita(5, 'CONFIRMADA')]);

    boton('Cancelar')!.click();
    fixture.detectChanges();
    enviarDialogo();
    expect(acciones.cancelar).not.toHaveBeenCalled();
    expect(raiz().querySelector('[role="dialog"]')?.textContent).toContain('Escribe el motivo');

    const campo = raiz().querySelector<HTMLTextAreaElement>('#dialogo-motivo-texto')!;
    campo.value = '  Cliente ausente  ';
    campo.dispatchEvent(new Event('input'));
    enviarDialogo();

    expect(acciones.cancelar).toHaveBeenCalledWith(5, 'Cliente ausente');
  });

  it('muestra el mensaje del backend cuando la transición falla', async () => {
    await crear([cita(5, 'CONFIRMADA')]);
    acciones.cambiarEstado.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { status: 409, error: 'La cita ya cambió de estado' } }))
    );

    boton('Voy en camino')!.click();
    fixture.detectChanges();

    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('La cita ya cambió de estado');
  });

  it('el diagnóstico guardado se reabre para corregirlo', async () => {
    await crear([cita(5, 'EN_PROCESO')]);

    boton('Registrar diagnóstico')!.click();
    fixture.detectChanges();
    const campo = raiz().querySelector<HTMLTextAreaElement>('#diagnostico-texto')!;
    campo.value = 'Bomba dañada';
    campo.dispatchEvent(new Event('input'));
    enviarDialogo();
    fixture.detectChanges();

    expect(acciones.guardarDiagnostico).toHaveBeenCalledWith(5, { diagnostico: 'Bomba dañada' });

    boton('Corregir diagnóstico')!.click();
    fixture.detectChanges();
    expect(raiz().querySelector<HTMLTextAreaElement>('#diagnostico-texto')!.value).toBe('Bomba dañada');
  });
});
