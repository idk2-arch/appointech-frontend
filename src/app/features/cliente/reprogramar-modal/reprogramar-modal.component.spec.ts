import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClienteModule } from '../cliente.module';
import { ReprogramarModalComponent } from './reprogramar-modal.component';

describe('ReprogramarModalComponent', () => {
  let fixture: ComponentFixture<ReprogramarModalComponent>;
  let componente: ReprogramarModalComponent;

  beforeEach(async () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 27, 12, 0, 0), toFake: ['Date'] });
    await TestBed.configureTestingModule({
      imports: [ClienteModule],
    }).compileComponents();
    fixture = TestBed.createComponent(ReprogramarModalComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it('la fecha mínima del selector es hoy', () => {
    const campo = fixture.nativeElement.querySelector('#reprogramar-fecha') as HTMLInputElement;
    expect(campo.min).toBe('2026-10-27');
  });

  it('exige fecha y hora', () => {
    const confirmar = vi.fn();
    componente.confirmar.subscribe(confirmar);

    componente.enviar();
    fixture.detectChanges();

    expect(confirmar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Elige una fecha');
    expect(fixture.nativeElement.textContent).toContain('Elige una hora');
  });

  it('no permite una hora en el pasado', () => {
    const confirmar = vi.fn();
    componente.confirmar.subscribe(confirmar);
    componente.form.setValue({ fecha: '2026-10-27', hora: '08:00' });

    componente.enviar();
    fixture.detectChanges();

    expect(confirmar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('no puede estar en el pasado');
  });

  it('emite el inicio como LocalDateTime sin zona', () => {
    const confirmar = vi.fn();
    componente.confirmar.subscribe(confirmar);
    componente.form.setValue({ fecha: '2026-11-04', hora: '14:00' });

    componente.enviar();

    expect(confirmar).toHaveBeenCalledWith('2026-11-04T14:00:00');
  });

  it('muestra el error que llega del servidor (409)', () => {
    fixture.componentRef.setInput('errorMensaje', 'Esa hora ya no está disponible');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Esa hora ya no está disponible');
  });
});
