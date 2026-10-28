import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { PreDiagnostico } from '../../core/models/cita';
import { SharedModule } from '../shared.module';
import { PrediagnosticoComponent } from './prediagnostico.component';

const DATOS: PreDiagnostico = {
  causasProbables: ['Bomba de drenaje obstruida', 'Filtro tapado'],
  urgenciaSugerida: 'ALTA',
  preguntasParaElTecnico: ['¿Se escucha ruido al drenar?', '¿Hay agua en el piso?'],
  generadoPorIA: true,
};

describe('PrediagnosticoComponent', () => {
  let fixture: ComponentFixture<PrediagnosticoComponent>;
  const raiz = (): HTMLElement => fixture.nativeElement;
  const items = (): string[] => Array.from(raiz().querySelectorAll('li')).map((li) => li.textContent?.trim() ?? '');

  function mostrar(datos: PreDiagnostico): void {
    fixture = TestBed.createComponent(PrediagnosticoComponent);
    fixture.componentRef.setInput('datos', datos);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SharedModule] }).compileComponents();
  });

  it('lista las causas probables y las preguntas para el técnico', () => {
    mostrar(DATOS);

    expect(items()).toEqual([...DATOS.causasProbables, ...DATOS.preguntasParaElTecnico]);
    expect(raiz().textContent).toContain('Causas probables');
    expect(raiz().textContent).toContain('Preguntas sugeridas para el técnico');
  });

  it('muestra siempre el aviso de que es orientación de IA', () => {
    mostrar(DATOS);
    expect(raiz().textContent).toContain('Orientación generada automáticamente por IA. No reemplaza el diagnóstico del técnico.');
  });

  it.each([
    ['BAJA', 'Baja', 'emerald'],
    ['MEDIA', 'Media', 'amber'],
    ['ALTA', 'Alta', 'rose'],
  ] as const)('la urgencia %s se muestra como "%s" con colores %s', (urgencia, texto, color) => {
    mostrar({ ...DATOS, urgenciaSugerida: urgencia });

    const chip = raiz().querySelector('span span') as HTMLElement;
    expect(chip.textContent?.trim()).toBe(texto);
    expect(chip.className).toContain(color);
  });

  it('sin causas probables lo dice en vez de dejar la lista vacía', () => {
    mostrar({ ...DATOS, causasProbables: [] });
    expect(raiz().textContent).toContain('No se identificaron causas probables.');
    expect(items()).toEqual(DATOS.preguntasParaElTecnico);
  });

  it('sin preguntas no muestra ese bloque', () => {
    mostrar({ ...DATOS, preguntasParaElTecnico: [] });
    expect(raiz().textContent).not.toContain('Preguntas sugeridas');
    expect(items()).toEqual(DATOS.causasProbables);
  });

  it('tiene un encabezado accesible', () => {
    mostrar(DATOS);
    expect(raiz().querySelector('section')?.getAttribute('aria-labelledby')).toBe('prediagnostico-titulo');
    expect(raiz().querySelector('#prediagnostico-titulo')?.textContent).toContain('Pre-diagnóstico');
  });
});
