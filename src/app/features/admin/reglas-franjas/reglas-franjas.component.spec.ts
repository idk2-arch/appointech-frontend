import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReglasFranjas, ReglasFranjasService } from '../../../core/services/reglas-franjas.service';
import { AdminModule } from '../admin.module';
import { ReglasFranjasComponent } from './reglas-franjas.component';
const REGLAS: ReglasFranjas = {
  radioMaximoKm: 10,
  duracionBloqueMinutos: 120,
  horaInicioJornada: '08:00:00',
  horaFinJornada: '18:00:00',
};
describe('ReglasFranjasComponent', () => {
  let fixture: ComponentFixture<ReglasFranjasComponent>;
  let c: ReglasFranjasComponent;
  const obtener = vi.fn();
  const actualizar = vi.fn();
  const refrescar = () => {
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };
  const raiz = (): HTMLElement => fixture.nativeElement;
  beforeEach(async () => {
    TestBed.resetTestingModule();
    obtener.mockReset().mockReturnValue(of(REGLAS));
    actualizar.mockReset().mockReturnValue(of(REGLAS));
    await TestBed.configureTestingModule({
      imports: [AdminModule, RouterModule.forRoot([])],
      providers: [{ provide: ReglasFranjasService, useValue: { obtener, actualizar } }],
    }).compileComponents();
    fixture = TestBed.createComponent(ReglasFranjasComponent);
    c = fixture.componentInstance;
    refrescar();
  });
  it('solo permite editar duración y enlaza los horarios y radios por técnico', () => {
    expect(raiz().querySelector('#franjas-duracion')).not.toBeNull();
    expect(raiz().querySelector('#franjas-radio')).toBeNull();
    expect(raiz().querySelector('#franjas-inicio')).toBeNull();
    expect(raiz().querySelector('#franjas-fin')).toBeNull();
    expect(raiz().textContent).toContain('Ya no se usa');
    expect(raiz().querySelector('a[href="/admin/franjas-tecnicos"]')).not.toBeNull();
  });
  it.each([null, 0, 14, 481, 1.5])('valida duración %s sin enviar', (valor) => {
    c.duracion.setValue(valor);
    c.guardar();
    refrescar();
    expect(actualizar).not.toHaveBeenCalled();
    expect(raiz().querySelector('[role="alert"]')).not.toBeNull();
  });
  it('pide confirmación y conserva radio y horas sin cambios, incluso si la duración supera la jornada antigua', () => {
    c.duracion.setValue(480);
    c.guardar();
    refrescar();
    expect(c.confirmando).toBe(true);
    expect(actualizar).not.toHaveBeenCalled();
    c.confirmarGuardado();
    expect(actualizar).toHaveBeenCalledWith({ ...REGLAS, duracionBloqueMinutos: 480 });
  });
  it('cancelar no envía; un valor sin cambios guarda directo', () => {
    c.duracion.setValue(90);
    c.guardar();
    c.cancelarConfirmacion();
    expect(actualizar).not.toHaveBeenCalled();
    c.duracion.setValue(120);
    c.guardar();
    expect(actualizar).toHaveBeenCalledWith(REGLAS);
  });
  it('muestra advertencias del servidor y usa una alternativa si falta su texto', () => {
    actualizar.mockReturnValue(
      of({ ...REGLAS, franjasOfrecidasInvalidadas: true, advertencia: 'Elige otra franja.' }),
    );
    c.guardar();
    refrescar();
    expect(raiz().textContent).toContain('Elige otra franja.');
    actualizar.mockReturnValue(of({ ...REGLAS, franjasOfrecidasInvalidadas: true }));
    c.guardar();
    expect(c.advertencia).toContain('dejarán');
  });
  it('muestra errores de escritura sin perder la duración', () => {
    actualizar.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 400, error: { detail: 'Duración rechazada' } }),
      ),
    );
    c.duracion.setValue(90);
    c.guardar();
    c.confirmarGuardado();
    refrescar();
    expect(raiz().textContent).toContain('Duración rechazada');
    expect(c.duracion.value).toBe(90);
  });
  it('muestra carga, error y reintento; cancela consultas al destruir', () => {
    const pendiente = new Subject<ReglasFranjas>();
    obtener.mockReturnValue(pendiente);
    c.cargar();
    refrescar();
    expect(raiz().querySelector('[role="status"]')).not.toBeNull();
    pendiente.error(new HttpErrorResponse({ status: 500, error: { error: 'Error de carga' } }));
    refrescar();
    expect(raiz().textContent).toContain('Error de carga');
    const nuevo = new Subject<ReglasFranjas>();
    obtener.mockReturnValue(nuevo);
    c.cargar();
    fixture.destroy();
    expect(nuevo.observed).toBe(false);
  });
  it('bloquea envíos duplicados y cancela escritura pendiente', () => {
    const pendiente = new Subject<ReglasFranjas>();
    actualizar.mockReturnValue(pendiente);
    c.guardar();
    c.guardar();
    expect(actualizar).toHaveBeenCalledOnce();
    fixture.destroy();
    expect(pendiente.observed).toBe(false);
  });
});
