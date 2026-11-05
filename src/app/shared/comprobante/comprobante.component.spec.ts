import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Comprobante } from '../../core/models/pago';
import { comprobanteDe } from '../../core/models/pago.mock';
import { NavegadorService } from '../../core/services/navegador.service';
import { PagoService } from '../../core/services/pago.service';
import { SharedModule } from '../shared.module';
import { ComprobanteComponent } from './comprobante.component';

describe('ComprobanteComponent', () => {
  let fixture: ComponentFixture<ComprobanteComponent>;
  const obtenerComprobante = vi.fn();
  const imprimir = vi.fn();

  const raiz = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => (raiz().textContent ?? '').replace(/\s+/g, ' ');

  function crear(): void {
    fixture = TestBed.createComponent(ComprobanteComponent);
    fixture.componentRef.setInput('citaId', 7);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    obtenerComprobante.mockReset();
    imprimir.mockReset();
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [
        { provide: PagoService, useValue: { obtenerComprobante } },
        { provide: NavegadorService, useValue: { imprimir } },
      ],
    }).compileComponents();
  });

  it('muestra un estado de carga mientras consulta', () => {
    obtenerComprobante.mockReturnValue(new Subject<Comprobante>());
    crear();
    expect(raiz().querySelector('[role="status"]')?.textContent).toContain('Cargando el comprobante');
  });

  it('muestra todos los datos del comprobante', () => {
    obtenerComprobante.mockReturnValue(of(comprobanteDe()));
    crear();

    expect(obtenerComprobante).toHaveBeenCalledWith(7);
    for (const esperado of ['CP-0001', 'Lavadoras', 'Ana Pérez', 'Luis Gómez', '$ 120.000', 'Efectivo', 'REF-123']) {
      expect(texto()).toContain(esperado);
    }
  });

  it('omite la referencia cuando no la hay y etiqueta el pago en línea', () => {
    obtenerComprobante.mockReturnValue(of(comprobanteDe({ referencia: null, metodo: 'EN_LINEA' })));
    crear();

    expect(texto()).not.toContain('Referencia');
    expect(texto()).toContain('En línea');
  });

  it('"Descargar" abre la vista de impresión o PDF', () => {
    obtenerComprobante.mockReturnValue(of(comprobanteDe()));
    crear();

    const boton = Array.from(raiz().querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Descargar')!;
    boton.click();

    expect(imprimir).toHaveBeenCalledOnce();
    expect(raiz().querySelector('.comprobante-imprimible')).not.toBeNull();
  });

  it('muestra el error del backend y permite reintentar', () => {
    obtenerComprobante.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'El pago aún no está pagado.' } }))
    );
    crear();
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('El pago aún no está pagado.');

    obtenerComprobante.mockReturnValue(of(comprobanteDe()));
    raiz().querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();

    expect(texto()).toContain('CP-0001');
  });
});
