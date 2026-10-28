import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_BASE_URL } from '../../../core/config/api.config';
import { RegistroLog } from '../../../core/models/registro-log';
import { Cobertura, CoberturaService } from '../../../core/services/cobertura.service';
import { LogService } from '../../../core/services/log.service';
import { CoberturaComponent, RADIO_MAXIMO_KM, RADIO_MINIMO_KM } from '../cobertura/cobertura.component';
import { LogsComponent } from './logs.component';
import '../admin.module';

const cdr = { markForCheck: vi.fn() } as unknown as ChangeDetectorRef;
const falloHttp = (status: number, error?: unknown): HttpErrorResponse => new HttpErrorResponse({ status, error });

describe('LogsComponent', () => {
  let servicio: { obtenerLogs: ReturnType<typeof vi.fn> };
  let componente: LogsComponent;
  const LOGS = [{ id: 1, nivel: 'ERROR', tipo: 'SEGURIDAD' }] as unknown as RegistroLog[];

  beforeEach(() => {
    servicio = { obtenerLogs: vi.fn().mockReturnValue(of(LOGS)) };
    componente = new LogsComponent(servicio as unknown as LogService, cdr);
    componente.ngOnInit();
  });

  it('al iniciar pide los últimos 100 registros, sin filtros', () => {
    expect(servicio.obtenerLogs).toHaveBeenCalledWith({ nivel: null, tipo: null, limite: 100 });
    expect(componente.logs).toBe(LOGS);
    expect(componente.cargando).toBe(false);
    expect(componente.hayFiltros).toBe(false);
  });

  it('cambiar el nivel filtra por ese nivel', () => {
    componente.cambiarNivel('ERROR');
    expect(servicio.obtenerLogs).toHaveBeenLastCalledWith({ nivel: 'ERROR', tipo: null, limite: 100 });
    expect(componente.hayFiltros).toBe(true);
  });

  it('volver a "todos" quita el filtro de nivel', () => {
    componente.cambiarNivel('ERROR');
    componente.cambiarNivel('todos');
    expect(servicio.obtenerLogs).toHaveBeenLastCalledWith({ nivel: null, tipo: null, limite: 100 });
  });

  it('cambiar el tipo filtra por ese tipo y vaciarlo lo quita', () => {
    componente.cambiarTipo('SEGURIDAD');
    expect(servicio.obtenerLogs).toHaveBeenLastCalledWith({ nivel: null, tipo: 'SEGURIDAD', limite: 100 });

    componente.cambiarTipo('');
    expect(servicio.obtenerLogs).toHaveBeenLastCalledWith({ nivel: null, tipo: null, limite: 100 });
  });

  it('cambiar el límite lo convierte a número', () => {
    componente.cambiarLimite('200');
    expect(componente.limite).toBe(200);
    expect(servicio.obtenerLogs).toHaveBeenLastCalledWith({ nivel: null, tipo: null, limite: 200 });
  });

  it('limpiar filtros vuelve a pedir sin nivel ni tipo, pero conserva el límite', () => {
    componente.cambiarNivel('WARN');
    componente.cambiarTipo('NEGOCIO');
    componente.cambiarLimite('50');

    componente.limpiarFiltros();

    expect(servicio.obtenerLogs).toHaveBeenLastCalledWith({ nivel: null, tipo: null, limite: 50 });
    expect(componente.hayFiltros).toBe(false);
  });

  it('recargar en silencio no muestra el indicador de carga', () => {
    servicio.obtenerLogs.mockReturnValue(new Subject());
    componente.cargando = false;
    componente.cargarLogs(false);
    expect(componente.cargando).toBe(false);
  });

  it('si falla muestra el mensaje del backend, o uno genérico', () => {
    servicio.obtenerLogs.mockReturnValue(throwError(() => falloHttp(500, { status: 500, error: 'Base de datos caída' })));
    componente.cargarLogs();
    expect(componente.errorCarga).toBe('Base de datos caída');
    expect(componente.cargando).toBe(false);

    servicio.obtenerLogs.mockReturnValue(throwError(() => new Error('x')));
    componente.cargarLogs();
    expect(componente.errorCarga).toBe('No fue posible cargar los logs.');
  });

  it('un nuevo intento limpia el error anterior', () => {
    servicio.obtenerLogs.mockReturnValue(throwError(() => new Error('x')));
    componente.cargarLogs();
    servicio.obtenerLogs.mockReturnValue(of(LOGS));
    componente.cargarLogs();
    expect(componente.errorCarga).toBeNull();
  });

  it('la etiqueta de cada tipo está en español; uno desconocido queda tal cual', () => {
    expect(componente.etiquetaTipo('AUDITORIA')).toBe('Auditoría');
    expect(componente.etiquetaTipo('ERROR_APLICACION')).toBe('Error de aplicación');
    expect(componente.etiquetaTipo('OTRO' as never)).toBe('OTRO');
  });
});

describe('LogService', () => {
  it('consulta /logs enviando solo los filtros con valor', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const servicio = TestBed.inject(LogService);

    servicio.obtenerLogs({ nivel: 'ERROR', tipo: null, limite: 50 }).subscribe();
    const req = http.expectOne((r) => r.url === `${API_BASE_URL}/logs`);
    expect(req.request.params.get('nivel')).toBe('ERROR');
    expect(req.request.params.has('tipo')).toBe(false);
    expect(req.request.params.get('limite')).toBe('50');
    req.flush([]);

    servicio.obtenerLogs().subscribe();
    expect(http.expectOne((r) => r.url === `${API_BASE_URL}/logs`).request.params.keys()).toEqual([]);
    http.verify();
  });
});

describe('CoberturaComponent', () => {
  let servicio: { obtener: ReturnType<typeof vi.fn>; actualizar: ReturnType<typeof vi.fn> };
  let componente: CoberturaComponent;
  const COBERTURA: Cobertura = { radioMaximoKm: 20, telefonoWhatsappAdmin: '573001234567' };

  beforeEach(() => {
    servicio = { obtener: vi.fn().mockReturnValue(of(COBERTURA)), actualizar: vi.fn().mockReturnValue(of(COBERTURA)) };
    componente = new CoberturaComponent(new FormBuilder(), servicio as unknown as CoberturaService, cdr);
    componente.ngOnInit();
  });

  describe('carga', () => {
    it('muestra los valores guardados', () => {
      expect(componente.radio?.value).toBe(20);
      expect(componente.whatsapp?.value).toBe('573001234567');
      expect(componente.cargando).toBe(false);
    });

    it('un teléfono nulo queda como cadena vacía', () => {
      servicio.obtener.mockReturnValue(of({ radioMaximoKm: 10, telefonoWhatsappAdmin: null }));
      componente.cargar();
      expect(componente.whatsapp?.value).toBe('');
    });

    it('si falla muestra el motivo', () => {
      servicio.obtener.mockReturnValue(throwError(() => falloHttp(500)));
      componente.cargar();
      expect(componente.errorCarga).toBe('No fue posible cargar la distancia de atención. Intenta de nuevo.');
      expect(componente.cargando).toBe(false);
    });
  });

  describe('validaciones', () => {
    it('la distancia es obligatoria', () => {
      componente.radio?.setValue(null);
      expect(componente.radio?.hasError('required')).toBe(true);
    });

    it(`la distancia va de ${RADIO_MINIMO_KM} a ${RADIO_MAXIMO_KM} km`, () => {
      componente.radio?.setValue(0);
      expect(componente.radio?.hasError('min')).toBe(true);
      componente.radio?.setValue(RADIO_MAXIMO_KM + 1);
      expect(componente.radio?.hasError('max')).toBe(true);
      componente.radio?.setValue(RADIO_MAXIMO_KM);
      expect(componente.radio?.valid).toBe(true);
    });

    it('la distancia debe ser un número entero', () => {
      componente.radio?.setValue('12.5');
      expect(componente.radio?.hasError('pattern')).toBe(true);
      componente.radio?.setValue('abc');
      expect(componente.radio?.hasError('pattern')).toBe(true);
    });

    it('el WhatsApp es opcional, pero si se escribe debe ser válido', () => {
      componente.whatsapp?.setValue('');
      expect(componente.whatsapp?.valid).toBe(true);

      componente.whatsapp?.setValue('123');
      expect(componente.whatsapp?.hasError('whatsappInvalido')).toBe(true);

      componente.whatsapp?.setValue('300 123 4567');
      expect(componente.whatsapp?.valid).toBe(true);
    });
  });

  describe('guardar', () => {
    it('inválido: marca los campos y no llama al backend', () => {
      componente.radio?.setValue(0);
      componente.guardar();
      expect(servicio.actualizar).not.toHaveBeenCalled();
      expect(componente.radio?.touched).toBe(true);
    });

    it('envía el radio como número y el teléfono normalizado con el prefijo del país', () => {
      componente.radio?.setValue('35');
      componente.whatsapp?.setValue('300 123 4567');

      componente.guardar();

      expect(servicio.actualizar).toHaveBeenCalledWith({ radioMaximoKm: 35, telefonoWhatsappAdmin: '573001234567' });
    });

    it('un teléfono vacío se envía vacío, para borrar el guardado', () => {
      componente.whatsapp?.setValue('');
      componente.guardar();
      expect(servicio.actualizar).toHaveBeenCalledWith({ radioMaximoKm: 20, telefonoWhatsappAdmin: '' });
    });

    it('si sale bien: muestra lo guardado y avisa cuántos km se atienden', () => {
      servicio.actualizar.mockReturnValue(of({ radioMaximoKm: 45, telefonoWhatsappAdmin: null }));
      componente.guardar();

      expect(componente.radio?.value).toBe(45);
      expect(componente.mensajeExito).toBe('Listo. Ahora atendemos automáticamente hasta 45 km.');
      expect(componente.guardando).toBe(false);
    });

    it('un nuevo guardado limpia los avisos anteriores', () => {
      componente.mensajeExito = 'viejo';
      componente.errorGuardado = 'viejo';
      componente.radio?.setValue(0);
      componente.guardar();
      expect(componente.mensajeExito).toBeNull();
      expect(componente.errorGuardado).toBeNull();
    });

    it('400: explica el rango válido', () => {
      servicio.actualizar.mockReturnValue(throwError(() => falloHttp(400)));
      componente.guardar();
      expect(componente.errorGuardado).toBe('La distancia debe ser un número entero entre 1 y 100 km.');
      expect(componente.guardando).toBe(false);
    });

    it('el mensaje del backend tiene prioridad', () => {
      servicio.actualizar.mockReturnValue(throwError(() => falloHttp(400, { status: 400, error: 'Radio fuera de rango' })));
      componente.guardar();
      expect(componente.errorGuardado).toBe('Radio fuera de rango');
    });
  });
});
