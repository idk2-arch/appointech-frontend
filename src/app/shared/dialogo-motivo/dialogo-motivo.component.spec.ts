import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_MOTIVO } from '../../core/utils/validadores-cita';
import { SharedModule } from '../shared.module';
import { DialogoMotivoComponent } from './dialogo-motivo.component';

describe('DialogoMotivoComponent', () => {
  let fixture: ComponentFixture<DialogoMotivoComponent>;
  let componente: DialogoMotivoComponent;

  function crear(obligatorio: boolean): void {
    fixture = TestBed.createComponent(DialogoMotivoComponent);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('titulo', 'Cancelar cita');
    fixture.componentRef.setInput('obligatorio', obligatorio);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SharedModule] }).compileComponents();
  });

  it('obligatorio: no emite con el motivo vacío y avisa', () => {
    crear(true);
    const confirmar = vi.fn();
    componente.confirmar.subscribe(confirmar);

    componente.enviar();
    fixture.detectChanges();

    expect(confirmar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Escribe el motivo');
  });

  it('opcional: emite undefined cuando no se escribe nada', () => {
    crear(false);
    const confirmar = vi.fn();
    componente.confirmar.subscribe(confirmar);

    componente.enviar();

    expect(confirmar).toHaveBeenCalledWith(undefined);
    expect(fixture.nativeElement.textContent).toContain('(opcional)');
  });

  it('no acepta más de 500 caracteres', () => {
    crear(false);
    const confirmar = vi.fn();
    componente.confirmar.subscribe(confirmar);
    componente.motivo.setValue('a'.repeat(MAX_MOTIVO + 1));

    componente.enviar();
    fixture.detectChanges();

    expect(confirmar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('no puede superar');
  });

  it('emite el motivo sin espacios sobrantes', () => {
    crear(true);
    const confirmar = vi.fn();
    componente.confirmar.subscribe(confirmar);
    componente.motivo.setValue('  Ya no lo necesito ');

    componente.enviar();

    expect(confirmar).toHaveBeenCalledWith('Ya no lo necesito');
  });

  it('pone el foco en el campo al abrirse y deshabilita el envío mientras carga', () => {
    crear(true);
    expect(document.activeElement?.id).toBe('dialogo-motivo-texto');

    fixture.componentRef.setInput('cargando', true);
    fixture.detectChanges();
    const enviar = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(enviar.disabled).toBe(true);
  });
});
