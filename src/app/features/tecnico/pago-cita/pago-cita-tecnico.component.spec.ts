import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterModule, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { pagoDe } from '../../../core/models/pago.mock';
import { PagoService } from '../../../core/services/pago.service';
import { TecnicoModule } from '../tecnico.module';
import { PagoCitaTecnicoComponent } from './pago-cita-tecnico.component';

describe('PagoCitaTecnicoComponent', () => {
  it('muestra el panel de pago del técnico para la cita de la URL, con enlace a la agenda', async () => {
    const obtener = vi.fn().mockReturnValue(of(pagoDe({ montoFinal: null })));
    await TestBed.configureTestingModule({
      imports: [TecnicoModule, RouterModule.forRoot([])],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } } },
        { provide: PagoService, useValue: { obtener } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PagoCitaTecnicoComponent);
    fixture.detectChanges();

    const raiz: HTMLElement = fixture.nativeElement;
    expect(obtener).toHaveBeenCalledWith(7);
    expect(raiz.textContent).toContain('Cobro de la cita n.º 7');
    expect(raiz.querySelector('app-costo-final-form')).not.toBeNull();
    expect(raiz.querySelector('a')?.getAttribute('href')).toBe('/tecnico/agenda');
  });
});
