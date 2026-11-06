import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../config/api.config';
import { SolicitudManualAdminService } from './solicitud-manual-admin.service';

describe('SolicitudManualAdminService', () => {
  let servicio: SolicitudManualAdminService;
  let http: HttpTestingController;
  const URL = `${API_BASE_URL}/admin/solicitudes-manuales`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(SolicitudManualAdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('listar', () => {
    it('sin filtros no envía parámetros y toma el total del encabezado X-Total-Count', () => {
      let resultado: unknown;
      servicio.listar().subscribe((r) => (resultado = r));

      const req = http.expectOne(URL);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toEqual([]);
      req.flush([{ id: 1 }, { id: 2 }], { headers: { 'X-Total-Count': '23' } });

      expect(resultado).toEqual({ filas: [{ id: 1 }, { id: 2 }], total: 23 });
    });

    it('envía motivo, especialidad, estado y página, y omite lo vacío', () => {
      servicio.listar({ motivo: 'FUERA_DE_COBERTURA', especialidadId: 6, estado: 'CONFIRMADA', page: 0, size: 10 }).subscribe();
      const req = http.expectOne((r) => r.url === URL);
      expect(req.request.params.get('motivo')).toBe('FUERA_DE_COBERTURA');
      expect(req.request.params.get('especialidadId')).toBe('6');
      expect(req.request.params.get('estado')).toBe('CONFIRMADA');
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('10');
      req.flush([]);
    });

    it('un filtro vacío o nulo no se manda', () => {
      servicio.listar({ motivo: '', especialidadId: null, estado: '', page: 2 }).subscribe();
      const req = http.expectOne((r) => r.url === URL);
      expect(req.request.params.keys()).toEqual(['page']);
      req.flush([]);
    });

    it('sin encabezado el total es lo recibido', () => {
      let resultado: unknown;
      servicio.listar().subscribe((r) => (resultado = r));
      http.expectOne(URL).flush([{ id: 1 }]);
      expect(resultado).toEqual({ filas: [{ id: 1 }], total: 1 });
    });
  });

  it('busca técnicos disponibles con inicio y fin', () => {
    let resultado: unknown;
    servicio.tecnicosDisponibles(7, '2026-11-04T10:00:00', '2026-11-04T12:00:00').subscribe((r) => (resultado = r));

    const req = http.expectOne((r) => r.url === `${URL}/7/tecnicos-disponibles`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('inicio')).toBe('2026-11-04T10:00:00');
    expect(req.request.params.get('fin')).toBe('2026-11-04T12:00:00');
    req.flush([{ tecnicoId: 3, nombre: 'Luis', apellido: 'Gómez', telefono: null, fotoUrl: null, distanciaKm: 3.14 }]);

    expect(resultado).toEqual([{ tecnicoId: 3, nombre: 'Luis', apellido: 'Gómez', telefono: null, fotoUrl: null, distanciaKm: 3.14 }]);
  });

  it('asigna con PATCH y devuelve la cita con su trazabilidad', () => {
    let resultado: unknown;
    const peticion = { tecnicoId: 3, fechaHoraInicio: '2026-11-04T10:00:00', fechaHoraFin: '2026-11-04T12:00:00' };
    servicio.asignar(7, peticion).subscribe((r) => (resultado = r));

    const req = http.expectOne(`${URL}/7/asignar`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(peticion);
    req.flush({ id: 7, estado: 'CONFIRMADA', asignadaManualmente: true, asignacionManual: { asignadaPorId: 1, asignadaPorNombre: 'Admin', asignadaEn: '2026-11-04T09:00:00' } });

    expect(resultado).toMatchObject({ asignadaManualmente: true, asignacionManual: { asignadaPorNombre: 'Admin' } });
  });
});
