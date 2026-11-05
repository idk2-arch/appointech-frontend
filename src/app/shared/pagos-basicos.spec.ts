import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { pagoDe } from '../core/models/pago.mock';
import { AdvertenciaDiferenciaComponent } from './advertencia-diferencia/advertencia-diferencia.component';
import { InsigniaPagoComponent } from './insignia-pago/insignia-pago.component';
import { PesosPipe } from './pesos/pesos.pipe';
import { SharedModule } from './shared.module';

const normalizar = (texto: string | null | undefined): string => (texto ?? '').replace(/\s+/g, ' ').trim();

describe('PesosPipe', () => {
  it('formatea pesos colombianos', () => {
    expect(normalizar(new PesosPipe().transform(1250000))).toBe('$ 1.250.000');
    expect(new PesosPipe().transform(null)).toBe('');
  });
});

describe('InsigniaPagoComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [SharedModule] }).compileComponents());

  it.each([
    ['PENDIENTE', 'Pendiente', '◔'],
    ['PAGADO', 'Pagado', '✓'],
    ['FALLIDO', 'Fallido', '✕'],
  ] as const)('muestra %s con texto y símbolo, y oculta el símbolo a los lectores de pantalla', (estado, texto, simbolo) => {
    const fixture = TestBed.createComponent(InsigniaPagoComponent);
    fixture.componentRef.setInput('estado', estado);
    fixture.detectChanges();

    const raiz: HTMLElement = fixture.nativeElement;
    expect(normalizar(raiz.textContent)).toContain(texto);
    expect(raiz.querySelector('[aria-hidden="true"]')?.textContent).toBe(simbolo);
  });
});

describe('AdvertenciaDiferenciaComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [SharedModule] }).compileComponents());

  it('muestra el costo estimado, el final y el porcentaje de diferencia como alerta', () => {
    const fixture = TestBed.createComponent(AdvertenciaDiferenciaComponent);
    fixture.componentRef.setInput(
      'pago',
      pagoDe({ montoCotizado: 100000, montoFinal: 150000, diferenciaSignificativa: true, porcentajeDiferencia: 50 })
    );
    fixture.detectChanges();

    const raiz: HTMLElement = fixture.nativeElement;
    const texto = normalizar(raiz.textContent);
    expect(raiz.querySelector('[role="alert"]')).not.toBeNull();
    expect(texto).toContain('$ 100.000');
    expect(texto).toContain('$ 150.000');
    expect(texto).toContain('50 %');
  });
});
