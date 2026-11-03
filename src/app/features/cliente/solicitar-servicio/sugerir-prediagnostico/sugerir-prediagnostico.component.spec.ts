import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SugerenciaPreDiagnostico } from '../../../../core/models/cita';
import { PreDiagnosticoService } from '../../../../core/services/pre-diagnostico.service';
import { ClienteModule } from '../../cliente.module';
import {
  ETIQUETA_ORIENTATIVO,
  MENSAJE_PREDIAGNOSTICO_NO_DISPONIBLE,
  SugerirPrediagnosticoComponent,
} from './sugerir-prediagnostico.component';

describe('SugerirPrediagnosticoComponent', () => {
  let fixture: ComponentFixture<SugerirPrediagnosticoComponent>;
  let sugerir: ReturnType<typeof vi.fn>;

  const raiz = (): HTMLElement => fixture.nativeElement;
  const boton = (): HTMLButtonElement => raiz().querySelector('button')!;
  const poner = (descripcion: string, especialidad: string | null = 'Neveras'): void => {
    fixture.componentRef.setInput('descripcion', descripcion);
    fixture.componentRef.setInput('especialidad', especialidad);
    fixture.detectChanges();
  };
  const responder = (r: SugerenciaPreDiagnostico): void => {
    sugerir.mockReturnValue(of(r));
  };
  const pulsar = (): void => {
    boton().click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    sugerir = vi.fn().mockReturnValue(of({ disponible: true, sugerencia: 'Posible falla del termostato.' }));
    await TestBed.configureTestingModule({
      imports: [ClienteModule],
      providers: [{ provide: PreDiagnosticoService, useValue: { sugerir } }],
    }).compileComponents();
    fixture = TestBed.createComponent(SugerirPrediagnosticoComponent);
    fixture.detectChanges();
  });

  it('el botón dice "Sugerir pre-diagnóstico con IA" y está deshabilitado sin descripción', () => {
    expect(boton().textContent).toContain('Sugerir pre-diagnóstico con IA');
    expect(boton().disabled).toBe(true);
  });

  it('un texto solo con espacios tampoco lo habilita; con texto sí', () => {
    poner('   ');
    expect(boton().disabled).toBe(true);
    poner('No enfría');
    expect(boton().disabled).toBe(false);
  });

  it('sin descripción (null) no hace nada al llamar sugerir()', () => {
    fixture.componentRef.setInput('descripcion', null);
    fixture.componentInstance.sugerir();
    expect(sugerir).not.toHaveBeenCalled();
  });

  it('envía la descripción sin espacios sobrantes y la especialidad', () => {
    poner('  No enfría  ', ' Neveras ');
    pulsar();
    expect(sugerir).toHaveBeenCalledWith({ descripcionProblema: 'No enfría', especialidad: 'Neveras' });
  });

  it('sin especialidad no la envía', () => {
    poner('No enfría', null);
    pulsar();
    expect(sugerir).toHaveBeenCalledWith({ descripcionProblema: 'No enfría' });
  });

  it('muestra la sugerencia en una tarjeta con la etiqueta fija "Orientativo"', () => {
    poner('No enfría');
    pulsar();

    const tarjeta = raiz().querySelector('section')!;
    expect(tarjeta.textContent).toContain('Posible falla del termostato.');
    expect(tarjeta.textContent).toContain(ETIQUETA_ORIENTATIVO);
    expect(ETIQUETA_ORIENTATIVO).toBe('Orientativo: no reemplaza la revisión del técnico');
  });

  it('muestra la sugerencia como texto plano: el HTML no se interpreta', () => {
    responder({ disponible: true, sugerencia: '<img src=x onerror="alert(1)"><b>negrita</b>' });
    poner('No enfría');
    pulsar();

    const tarjeta = raiz().querySelector('section')!;
    expect(tarjeta.querySelector('img, b')).toBeNull();
    expect(tarjeta.textContent).toContain('<img src=x onerror="alert(1)"><b>negrita</b>');
  });

  describe('mientras carga', () => {
    let respuesta: Subject<SugerenciaPreDiagnostico>;

    beforeEach(() => {
      respuesta = new Subject();
      sugerir.mockReturnValue(respuesta);
      poner('No enfría');
      pulsar();
    });

    it('deshabilita el botón y anuncia la carga de forma accesible', () => {
      expect(boton().disabled).toBe(true);
      expect(raiz().firstElementChild?.getAttribute('aria-busy')).toBe('true');
      expect(raiz().querySelector('[aria-live="polite"]')?.textContent).toContain('Preparando la sugerencia');
    });

    it('ignora clics y no hace una segunda llamada', () => {
      boton().click();
      fixture.componentInstance.sugerir();
      expect(sugerir).toHaveBeenCalledTimes(1);
    });

    it('al llegar la respuesta termina la carga y vuelve a habilitarse', () => {
      respuesta.next({ disponible: true, sugerencia: 'Listo' });
      fixture.detectChanges();

      expect(raiz().firstElementChild?.getAttribute('aria-busy')).toBe('false');
      expect(boton().disabled).toBe(false);
      expect(raiz().textContent).not.toContain('Preparando la sugerencia');
    });

    it('al salir del paso cancela la petición en curso', () => {
      expect(respuesta.observed).toBe(true);
      fixture.destroy();
      expect(respuesta.observed).toBe(false);
    });
  });

  describe('cuando no hay sugerencia', () => {
    it('disponible=false muestra el mensaje neutro que llegó, sin tarjeta', () => {
      responder({ disponible: false, sugerencia: 'Intenta más tarde.' });
      poner('No enfría');
      pulsar();

      expect(raiz().textContent).toContain('Intenta más tarde.');
      expect(raiz().querySelector('section')).toBeNull();
      expect(raiz().textContent).not.toContain(ETIQUETA_ORIENTATIVO);
    });

    it('disponible=false sin mensaje usa el aviso genérico', () => {
      responder({ disponible: false, sugerencia: '' });
      poner('No enfría');
      pulsar();
      expect(raiz().textContent).toContain(MENSAJE_PREDIAGNOSTICO_NO_DISPONIBLE);
    });

    it('disponible=true pero sin texto usa el aviso genérico', () => {
      sugerir.mockReturnValue(of({ disponible: true, sugerencia: undefined }));
      poner('No enfría');
      pulsar();
      expect(raiz().querySelector('section')).toBeNull();
      expect(raiz().textContent).toContain(MENSAJE_PREDIAGNOSTICO_NO_DISPONIBLE);
    });

    it.each([0, 401, 500])('si la llamada falla (HTTP %i) muestra solo el aviso genérico, sin detalles técnicos', (status) => {
      sugerir.mockReturnValue(throwError(() => ({ status, message: 'Http failure response for http://localhost:8080/api/...' })));
      poner('No enfría');
      pulsar();

      expect(raiz().textContent).toContain(MENSAJE_PREDIAGNOSTICO_NO_DISPONIBLE);
      expect(raiz().textContent).not.toContain('Http failure');
      expect(raiz().textContent).not.toContain('localhost');
    });

    it('tras un fallo se puede volver a intentar', () => {
      sugerir.mockReturnValueOnce(throwError(() => new Error('red')));
      poner('No enfría');
      pulsar();
      expect(boton().disabled).toBe(false);

      pulsar();
      expect(raiz().querySelector('section')).not.toBeNull();
      expect(raiz().textContent).not.toContain(MENSAJE_PREDIAGNOSTICO_NO_DISPONIBLE);
    });
  });

  describe('al cambiar la descripción', () => {
    it('descarta la sugerencia anterior', () => {
      poner('No enfría');
      pulsar();
      expect(raiz().querySelector('section')).not.toBeNull();

      poner('No enfría y hace ruido');
      expect(raiz().querySelector('section')).toBeNull();
    });

    it('si hay una llamada en curso no la pierde', () => {
      const respuesta = new Subject<SugerenciaPreDiagnostico>();
      sugerir.mockReturnValue(respuesta);
      poner('No enfría');
      pulsar();

      poner('No enfría del todo');
      respuesta.next({ disponible: true, sugerencia: 'Revisar compresor' });
      fixture.detectChanges();

      expect(raiz().querySelector('section')?.textContent).toContain('Revisar compresor');
    });
  });
});
