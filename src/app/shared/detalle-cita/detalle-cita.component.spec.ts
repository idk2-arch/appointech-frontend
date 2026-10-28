import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DetalleCita, FotoElectrodomestico, PreDiagnostico } from '../../core/models/cita';
import { FotoCitaService } from '../../core/services/foto-cita.service';
import { FotosElectrodomesticoComponent } from '../fotos-electrodomestico/fotos-electrodomestico.component';
import { SharedModule } from '../shared.module';

@Component({
  imports: [SharedModule],
  template: `
    <app-detalle-cita [cita]="cita" [fotosEditables]="editable" (quitarFoto)="quitada = $event">
      <p fotosAcciones id="acciones">Agregar fotos aquí</p>
    </app-detalle-cita>
  `,
})
class AnfitrionComponent {
  cita!: DetalleCita;
  editable = false;
  quitada?: FotoElectrodomestico;
}

const PRE_DIAGNOSTICO: PreDiagnostico = {
  causasProbables: ['Bomba obstruida'],
  urgenciaSugerida: 'MEDIA',
  preguntasParaElTecnico: ['¿Hace ruido?'],
  generadoPorIA: true,
};

function cita(datos: Partial<DetalleCita> = {}): DetalleCita {
  return {
    id: 12,
    estado: 'CONFIRMADA',
    tecnicoId: 1,
    especialidadId: 1,
    especialidadNombre: 'Lavadoras',
    descripcionProblema: 'No centrifuga',
    direccionServicio: 'Calle 6 # 12-34',
    fechaHoraInicio: '2026-11-04T14:00:00',
    fechaHoraFin: '2026-11-04T15:00:00',
    diagnostico: null,
    historial: [],
    ...datos,
  };
}

describe('DetalleCitaComponent: electrodoméstico, fotos y pre-diagnóstico', () => {
  let fixture: ComponentFixture<AnfitrionComponent>;
  const raiz = (): HTMLElement => fixture.nativeElement;

  function mostrar(datos: Partial<DetalleCita> = {}, editable = false): void {
    fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.componentInstance.cita = cita(datos);
    fixture.componentInstance.editable = editable;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    // Las fotos se descargan con FotoCitaService; aquí solo importa qué se muestra.
    vi.spyOn(FotoCitaService.prototype, 'urlSegura').mockImplementation(() => of('blob:foto'));
    await TestBed.configureTestingModule({ imports: [AnfitrionComponent], providers: [provideHttpClient()] }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
  });

  describe('sin fotos ni pre-diagnóstico', () => {
    it('no muestra la sección de fotos ni la tarjeta de IA', () => {
      mostrar();
      expect(raiz().querySelector('app-fotos-electrodomestico')).toBeNull();
      expect(raiz().querySelector('app-prediagnostico')).toBeNull();
      expect(raiz().textContent).not.toContain('Fotos del electrodoméstico');
      expect(raiz().textContent).not.toContain('Pre-diagnóstico');
    });

    it('un pre-diagnóstico nulo o fotos vacías tampoco muestran nada', () => {
      mostrar({ preDiagnostico: null, fotosElectrodomestico: [] });
      expect(raiz().querySelector('app-fotos-electrodomestico')).toBeNull();
      expect(raiz().querySelector('app-prediagnostico')).toBeNull();
    });

    it('no muestra electrodoméstico ni urgencia si no se indicaron', () => {
      mostrar();
      expect(raiz().textContent).not.toContain('Electrodoméstico');
      expect(raiz().textContent).not.toContain('Urgencia');
    });
  });

  describe('electrodoméstico y urgencia', () => {
    it('muestra marca y modelo junto al problema', () => {
      mostrar({ marcaElectrodomestico: 'Samsung', modeloElectrodomestico: 'WW90' });
      expect(raiz().textContent).toContain('Electrodoméstico');
      expect(raiz().textContent).toContain('Samsung WW90');
    });

    it('con solo la marca, muestra la marca', () => {
      mostrar({ marcaElectrodomestico: 'LG', modeloElectrodomestico: null });
      expect(raiz().textContent).toContain('LG');
    });

    it('una cita urgente se destaca en rojo', () => {
      mostrar({ urgencia: 'URGENTE' });
      const chip = Array.from(raiz().querySelectorAll('dd span')).find((s) => s.textContent?.trim() === 'Urgente');
      expect(chip?.className).toContain('rose');
    });

    it('una cita normal se muestra sin alarma', () => {
      mostrar({ urgencia: 'NORMAL' });
      const chip = Array.from(raiz().querySelectorAll('dd span')).find((s) => s.textContent?.trim() === 'Normal');
      expect(chip).toBeDefined();
      expect(chip?.className).not.toContain('rose');
    });
  });

  describe('con fotos', () => {
    const fotos: FotoElectrodomestico[] = [{ id: 1, url: '/api/citas/12/fotos/1' }];

    it('muestra la sección con el visor de fotos', () => {
      mostrar({ fotosElectrodomestico: fotos });
      expect(raiz().textContent).toContain('Fotos del electrodoméstico');
      expect(raiz().querySelector('app-fotos-electrodomestico')).not.toBeNull();
    });

    it('sin editar, no muestra el contenido para agregar fotos', () => {
      mostrar({ fotosElectrodomestico: fotos }, false);
      expect(raiz().querySelector('#acciones')).toBeNull();
    });

    it('al editar, muestra el contenido para agregar fotos', () => {
      mostrar({ fotosElectrodomestico: fotos }, true);
      expect(raiz().querySelector('#acciones')?.textContent).toContain('Agregar fotos aquí');
    });

    it('pasa al visor si las fotos son editables y reenvía la foto que se quita', () => {
      mostrar({ fotosElectrodomestico: fotos }, true);
      const visor = fixture.debugElement.query(By.directive(FotosElectrodomesticoComponent)).componentInstance as FotosElectrodomesticoComponent;
      expect(visor.editable).toBe(true);

      visor.quitar.emit(fotos[0]);

      expect(fixture.componentInstance.quitada).toEqual(fotos[0]);
    });
  });

  describe('editable pero sin fotos aún', () => {
    it('muestra la sección para poder agregar la primera foto', () => {
      mostrar({ fotosElectrodomestico: [] }, true);
      expect(raiz().textContent).toContain('Fotos del electrodoméstico');
      expect(raiz().querySelector('#acciones')).not.toBeNull();
    });
  });

  describe('con pre-diagnóstico', () => {
    it('muestra la tarjeta de IA con su aviso', () => {
      mostrar({ preDiagnostico: PRE_DIAGNOSTICO });
      expect(raiz().querySelector('app-prediagnostico')).not.toBeNull();
      expect(raiz().textContent).toContain('Bomba obstruida');
      expect(raiz().textContent).toContain('No reemplaza el diagnóstico del técnico.');
    });
  });
});
