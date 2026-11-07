import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Cita, CrearSolicitudRequest, SolicitudServicio } from '../../../../core/models/cita';
import { FranjaDisponible } from '../../../../core/models/disponibilidad';
import { CitaService } from '../../../../core/services/cita.service';
import { PagoService } from '../../../../core/services/pago.service';
import { SolicitudService } from '../../../../core/services/solicitud.service';
import { ClienteModule } from '../../cliente.module';
import { ConfirmarCitaComponent } from './confirmar-cita.component';

describe('ConfirmarCitaComponent', () => {
  let fixture: ComponentFixture<ConfirmarCitaComponent>;
  const confirmarCita = vi.fn();
  const crearSolicitud = vi.fn();
  const DATOS: CrearSolicitudRequest = { especialidadId: 3, descripcionProblema: 'x', direccionServicio: 'y', latitud: 4.3, longitud: -74.3 };
  const CREADA = { id: 11, descripcionProblema: 'x', direccionServicio: 'y', estado: 'PENDIENTE' } as SolicitudServicio;

  async function crear(cotizacion: unknown): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ClienteModule],
      providers: [
        { provide: PagoService, useValue: { cotizarEspecialidad: vi.fn().mockReturnValue(cotizacion) } },
        { provide: CitaService, useValue: { confirmarCita } },
        { provide: SolicitudService, useValue: { crearSolicitud } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ConfirmarCitaComponent);
    fixture.componentRef.setInput('especialidad', { id: 3, nombre: 'Lavadoras', descripcion: '' });
    fixture.componentRef.setInput('datos', DATOS);
    fixture.componentRef.setInput('franja', {
      tecnicoId: 2,
      inicio: '2026-11-04T14:00:00',
      fin: '2026-11-04T15:00:00',
      distanciaKm: 3,
    } as FranjaDisponible);
    fixture.detectChanges();
  }

  beforeEach(() => {
    confirmarCita.mockReset();
    crearSolicitud.mockReset().mockReturnValue(of(CREADA));
  });

  const boton = (): HTMLButtonElement => {
    const raiz: HTMLElement = fixture.nativeElement;
    return Array.from(raiz.querySelectorAll('button')).find((b) => b.textContent?.includes('Confirmar cita'))!;
  };

  it('muestra la cotización estimada de la especialidad elegida en el último paso', async () => {
    await crear(
      of({ especialidadId: 3, especialidad: 'Lavadoras', montoEstimado: 80000, moneda: 'COP', disponible: true, nota: null })
    );

    const texto = (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ');
    expect(texto).toContain('Cotización estimada');
    expect(texto).toContain('$ 80.000');
  });

  it('si la cotización falla, no bloquea confirmar la cita', async () => {
    await crear(throwError(() => new HttpErrorResponse({ status: 500, error: { detail: 'Error interno.' } })));
    confirmarCita.mockReturnValue(of({ id: 1 } as Cita));
    const confirmada = vi.fn();
    fixture.componentInstance.confirmada.subscribe(confirmada);

    expect(boton().disabled).toBe(false);
    boton().click();

    expect(confirmarCita).toHaveBeenCalledOnce();
    expect(confirmada).toHaveBeenCalledOnce();
  });

  describe('crear y confirmar en un solo momento', () => {
    const sinCotizacion = of({ especialidadId: 3, especialidad: 'Lavadoras', montoEstimado: null, moneda: 'COP', disponible: false, nota: null });
    const texto = (): string => (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ');

    it('muestra el resumen con lo que el cliente describió (todavía sin guardar nada)', async () => {
      await crear(sinCotizacion);
      expect(texto()).toContain('Lavadoras');
      expect(texto()).toContain('Revisa y confirma tu cita');
      expect(crearSolicitud).not.toHaveBeenCalled();
      expect(confirmarCita).not.toHaveBeenCalled();
    });

    it('al confirmar crea la solicitud con los datos y enseguida confirma la cita con su id y la franja elegida', async () => {
      confirmarCita.mockReturnValue(of({ id: 11 } as Cita));
      await crear(sinCotizacion);
      const creada = vi.fn();
      const confirmada = vi.fn();
      fixture.componentInstance.solicitudCreada.subscribe(creada);
      fixture.componentInstance.confirmada.subscribe(confirmada);

      boton().click();

      expect(crearSolicitud).toHaveBeenCalledOnce();
      expect(crearSolicitud).toHaveBeenCalledWith(DATOS);
      expect(confirmarCita).toHaveBeenCalledWith({ solicitudId: 11, tecnicoId: 2, inicio: '2026-11-04T14:00:00', fin: '2026-11-04T15:00:00' });
      expect(creada).toHaveBeenCalledWith(CREADA);
      expect(confirmada).toHaveBeenCalledWith({ id: 11 });
    });

    it('si ya hay una solicitud creada (intento anterior) la reutiliza en vez de crear otra', async () => {
      confirmarCita.mockReturnValue(of({ id: 11 } as Cita));
      await crear(sinCotizacion);
      fixture.componentRef.setInput('solicitud', CREADA);
      const creada = vi.fn();
      fixture.componentInstance.solicitudCreada.subscribe(creada);

      boton().click();

      expect(crearSolicitud).not.toHaveBeenCalled();
      expect(creada).not.toHaveBeenCalled();
      expect(confirmarCita).toHaveBeenCalledWith(expect.objectContaining({ solicitudId: 11 }));
    });

    it('un error al crear (400) muestra el mensaje del backend, no confirma nada y deja volver a intentar con lo elegido', async () => {
      crearSolicitud.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { status: 400, error: 'La longitud debe estar en Colombia' } })));
      await crear(sinCotizacion);
      const confirmada = vi.fn();
      fixture.componentInstance.confirmada.subscribe(confirmada);

      boton().click();
      fixture.detectChanges();

      expect(texto()).toContain('La longitud debe estar en Colombia');
      expect(confirmarCita).not.toHaveBeenCalled();
      expect(confirmada).not.toHaveBeenCalled();
      expect(boton().disabled).toBe(false);
      expect(texto()).toContain('Lavadoras');
    });

    it('un error sin mensaje usa el texto de siempre', async () => {
      crearSolicitud.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      await crear(sinCotizacion);
      boton().click();
      fixture.detectChanges();
      expect(texto()).toContain('No fue posible confirmar la cita. Intenta de nuevo.');
    });

    it('un 409 al confirmar (el horario se ocupó) avisa al asistente, con la solicitud ya creada para reutilizarla', async () => {
      confirmarCita.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'La franja ya no está disponible' } })));
      await crear(sinCotizacion);
      const noDisponible = vi.fn();
      const creada = vi.fn();
      fixture.componentInstance.franjaNoDisponible.subscribe(noDisponible);
      fixture.componentInstance.solicitudCreada.subscribe(creada);

      boton().click();

      expect(creada).toHaveBeenCalledWith(CREADA);
      expect(noDisponible).toHaveBeenCalledWith('La franja ya no está disponible');
    });

    it('un error al confirmar que no es 409 se muestra en el paso, sin perder lo elegido', async () => {
      confirmarCita.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500, error: { error: 'Servicio caído' } })));
      await crear(sinCotizacion);
      boton().click();
      fixture.detectChanges();
      expect(texto()).toContain('Servicio caído');
      expect(boton().disabled).toBe(false);
    });

    it('si el backend marca la solicitud para coordinación manual, no confirma y avisa', async () => {
      const manual = { ...CREADA, agendamientoManual: true, motivoSolicitudEspecial: 'SIN_TECNICOS_ESPECIALIDAD' } as SolicitudServicio;
      crearSolicitud.mockReturnValue(of(manual));
      await crear(sinCotizacion);
      const detectada = vi.fn();
      fixture.componentInstance.manualDetectada.subscribe(detectada);

      boton().click();

      expect(confirmarCita).not.toHaveBeenCalled();
      expect(detectada).toHaveBeenCalledWith(manual);
    });

    it('mientras envía el botón queda apagado con su indicador', async () => {
      crearSolicitud.mockReturnValue(new Subject());
      await crear(sinCotizacion);
      boton().click();
      fixture.detectChanges();
      expect(fixture.componentInstance.cargando).toBe(true);
      expect(texto()).toContain('Confirmando…');
    });
  });
});
