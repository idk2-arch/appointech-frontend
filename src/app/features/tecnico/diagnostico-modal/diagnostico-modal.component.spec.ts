import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_DIAGNOSTICO, MAX_RECOMENDACIONES } from '../../../core/utils/validadores-cita';
import { TecnicoModule } from '../tecnico.module';
import { DiagnosticoModalComponent } from './diagnostico-modal.component';

describe('DiagnosticoModalComponent', () => {
  let fixture: ComponentFixture<DiagnosticoModalComponent>;
  let componente: DiagnosticoModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TecnicoModule] }).compileComponents();
    fixture = TestBed.createComponent(DiagnosticoModalComponent);
    componente = fixture.componentInstance;
  });

  const escribir = (id: string, valor: string): void => {
    const campo = fixture.nativeElement.querySelector(id) as HTMLTextAreaElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  it('el diagnóstico es obligatorio: no emite y muestra el error', () => {
    fixture.detectChanges();
    const guardar = vi.fn();
    componente.guardar.subscribe(guardar);

    componente.enviar();
    fixture.detectChanges();

    expect(guardar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Describe el diagnóstico');
  });

  it('rechaza un diagnóstico de más de 2000 caracteres', () => {
    fixture.detectChanges();
    escribir('#diagnostico-texto', 'a'.repeat(MAX_DIAGNOSTICO + 1));

    expect(componente.form.controls.diagnostico.hasError('maxlength')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(`${MAX_DIAGNOSTICO + 1}/${MAX_DIAGNOSTICO}`);
  });

  it('rechaza recomendaciones de más de 1000 caracteres', () => {
    fixture.detectChanges();
    escribir('#diagnostico-texto', 'Falla');
    escribir('#diagnostico-recomendaciones', 'a'.repeat(MAX_RECOMENDACIONES + 1));

    expect(componente.form.invalid).toBe(true);
  });

  it('muestra el contador de caracteres', () => {
    fixture.detectChanges();
    escribir('#diagnostico-texto', 'Falla');
    expect(fixture.nativeElement.textContent).toContain(`5/${MAX_DIAGNOSTICO}`);
  });

  it('las recomendaciones vacías no se envían', () => {
    fixture.detectChanges();
    const guardar = vi.fn();
    componente.guardar.subscribe(guardar);
    escribir('#diagnostico-texto', '  Falla en la bomba  ');

    componente.enviar();

    expect(guardar).toHaveBeenCalledWith({ diagnostico: 'Falla en la bomba' });
  });

  it('con un diagnóstico existente se abre con sus datos', () => {
    componente.existente = { diagnostico: 'Falla', recomendaciones: 'Cambiar pieza', fecha: '2026-10-27T10:00:00' };
    fixture.detectChanges();
    const guardar = vi.fn();
    componente.guardar.subscribe(guardar);

    expect(fixture.nativeElement.textContent).toContain('Corregir diagnóstico');
    componente.enviar();

    expect(guardar).toHaveBeenCalledWith({ diagnostico: 'Falla', recomendaciones: 'Cambiar pieza' });
  });

  it('mientras envía, el botón de guardar queda deshabilitado', () => {
    componente.cargando = true;
    fixture.detectChanges();
    const guardar = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);
  });
});
