import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { MotivoSolicitudEspecial } from '../../core/models/cita';
import { SharedModule } from '../shared.module';
import { InsigniaMotivoComponent } from './insignia-motivo.component';

describe('InsigniaMotivoComponent', () => {
  let fixture: ComponentFixture<InsigniaMotivoComponent>;

  const mostrar = (motivo: MotivoSolicitudEspecial | null | undefined): string => {
    fixture.componentRef.setInput('motivo', motivo);
    fixture.detectChanges();
    return (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ').trim();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SharedModule] }).compileComponents();
    fixture = TestBed.createComponent(InsigniaMotivoComponent);
  });

  it('escribe el motivo en español, con un símbolo además del color', () => {
    expect(mostrar('SIN_TECNICOS_ESPECIALIDAD')).toContain('Sin técnicos para la especialidad');
    expect(fixture.nativeElement.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(mostrar('FUERA_DE_COBERTURA')).toContain('Fuera de cobertura');
  });

  it('sin motivo no dibuja nada', () => {
    expect(mostrar(null)).toBe('');
    expect(mostrar(undefined)).toBe('');
    expect(fixture.nativeElement.querySelector('span')).toBeNull();
  });
});
