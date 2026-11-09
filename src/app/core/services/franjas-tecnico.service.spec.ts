import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../config/api.config';
import { FranjasTecnicoService } from './franjas-tecnico.service';

describe('FranjasTecnicoService', () => {
  let servicio: FranjasTecnicoService;
  let http: HttpTestingController;
  const ruta = `${API_BASE_URL}/admin/tecnicos/1`;
  const datos = { fecha: '2026-11-10', horaInicio: '08:00', horaFin: '12:00' };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(FranjasTecnicoService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('consulta solamente el rango visible y devuelve el array directo', () => {
    let resultado: unknown;
    servicio.listar(1, '2026-11-10', '2026-11-16').subscribe((r) => (resultado = r));
    const req = http.expectOne((r) => r.url === `${ruta}/franjas`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('desde')).toBe('2026-11-10');
    expect(req.request.params.get('hasta')).toBe('2026-11-16');
    req.flush([]);
    expect(resultado).toEqual([]);
  });
  it('crea con POST y conserva el contrato', () => {
    let resultado: unknown;
    servicio.crear(1, datos).subscribe((r) => (resultado = r));
    const req = http.expectOne(`${ruta}/franjas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);
    req.flush({ ...datos, id: 2 });
    expect(resultado).toEqual({ ...datos, id: 2 });
  });
  it('edita con PUT', () => {
    servicio.actualizar(1, 2, datos).subscribe();
    const req = http.expectOne(`${ruta}/franjas/2`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(datos);
    req.flush(datos);
  });
  it('borra con DELETE y acepta 204', () => {
    servicio.borrar(1, 2).subscribe();
    const req = http.expectOne(`${ruta}/franjas/2`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
  it('guarda el radio con PATCH sin transformar nombres de campos', () => {
    let resultado: unknown;
    servicio.guardarRadio(1, 25).subscribe((r) => (resultado = r));
    const req = http.expectOne(`${ruta}/radio-atencion`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ radioMaximoKm: 25 });
    req.flush({ tecnicoId: 1, radioMaximoKm: 25 });
    expect(resultado).toEqual({ tecnicoId: 1, radioMaximoKm: 25 });
  });
});
