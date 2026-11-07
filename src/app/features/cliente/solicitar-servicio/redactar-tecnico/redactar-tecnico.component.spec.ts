import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RedaccionTecnica } from '../../../../core/models/cita';
import { PreDiagnosticoService } from '../../../../core/services/pre-diagnostico.service';
import { ClienteModule } from '../../cliente.module';
import { DetalleSolicitudComponent } from '../detalle-solicitud/detalle-solicitud.component';
import {
  MENSAJE_REDACCION_NO_DISPONIBLE,
  RedactarTecnicoComponent,
} from './redactar-tecnico.component';

const TECNICO = 'El equipo no alcanza la temperatura de operación.';

describe('RedactarTecnicoComponent', () => {
  let fixture: ComponentFixture<RedactarTecnicoComponent>;
  let redactarTecnico: ReturnType<typeof vi.fn>;
  let redactado: ReturnType<typeof vi.fn>;
  let restaurar: ReturnType<typeof vi.fn>;

  const raiz = (): HTMLElement => fixture.nativeElement;
  const botones = (): HTMLButtonElement[] => Array.from(raiz().querySelectorAll('button'));
  const boton = (texto: string): HTMLButtonElement | undefined =>
    botones().find((b) => b.textContent?.trim() === texto);
  const poner = (descripcion: string | null, especialidad: string | null = 'Neveras'): void => {
    fixture.componentRef.setInput('descripcion', descripcion);
    fixture.componentRef.setInput('especialidad', especialidad);
    fixture.detectChanges();
  };
  const responder = (r: RedaccionTecnica): void => {
    redactarTecnico.mockReturnValue(of(r));
  };
  const redactar = (): void => {
    boton('Redactar de forma técnica')!.click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    redactarTecnico = vi.fn().mockReturnValue(of({ disponible: true, textoTecnico: TECNICO }));
    redactado = vi.fn();
    restaurar = vi.fn();
    await TestBed.configureTestingModule({
      imports: [ClienteModule],
      providers: [{ provide: PreDiagnosticoService, useValue: { redactarTecnico } }],
    }).compileComponents();
    fixture = TestBed.createComponent(RedactarTecnicoComponent);
    fixture.componentInstance.redactado.subscribe(redactado);
    fixture.componentInstance.restaurar.subscribe(restaurar);
    fixture.detectChanges();
  });

  describe('habilitación', () => {
    it('sin descripción el botón está deshabilitado', () => {
      expect(boton('Redactar de forma técnica')!.disabled).toBe(true);
    });

    it('con solo espacios o nula sigue deshabilitado; con texto se habilita', () => {
      poner('   ');
      expect(boton('Redactar de forma técnica')!.disabled).toBe(true);
      poner(null);
      expect(boton('Redactar de forma técnica')!.disabled).toBe(true);
      poner('no enfria');
      expect(boton('Redactar de forma técnica')!.disabled).toBe(false);
    });

    it('sin descripción no hace ninguna llamada', () => {
      fixture.componentInstance.redactar();
      expect(redactarTecnico).not.toHaveBeenCalled();
    });
  });

  describe('al redactar', () => {
    it('envía el texto actual y la especialidad', () => {
      poner('  no enfria  ', ' Neveras ');
      redactar();
      expect(redactarTecnico).toHaveBeenCalledWith({
        descripcionProblema: 'no enfria',
        especialidad: 'Neveras',
      });
    });

    it('si hay texto técnico lo avisa para reemplazar el campo y ofrece "Deshacer"', () => {
      poner('no enfria');
      redactar();

      expect(redactado).toHaveBeenCalledWith(TECNICO);
      expect(boton('Deshacer')).toBeDefined();
      expect(raiz().textContent).toContain('Redactado con IA; revísalo antes de continuar');
    });

    it('sin redactar todavía no hay "Deshacer" ni nota', () => {
      poner('no enfria');
      expect(boton('Deshacer')).toBeUndefined();
      expect(raiz().textContent).not.toContain('Redactado con IA');
    });

    it('"Deshacer" restaura el original exacto (sin recortar) y desaparece', () => {
      poner('  no enfria ');
      redactar();

      boton('Deshacer')!.click();
      fixture.detectChanges();

      expect(restaurar).toHaveBeenCalledWith('  no enfria ');
      expect(boton('Deshacer')).toBeUndefined();
      expect(raiz().textContent).not.toContain('Redactado con IA');
    });

    it('deshacer sin nada que restaurar no emite', () => {
      fixture.componentInstance.deshacer();
      expect(restaurar).not.toHaveBeenCalled();
    });

    it('si el cliente edita el texto redactado, "Deshacer" desaparece', () => {
      poner('no enfria');
      redactar();
      poner(TECNICO);
      expect(boton('Deshacer')).toBeDefined();

      poner(`${TECNICO} Además gotea.`);

      expect(boton('Deshacer')).toBeUndefined();
      expect(raiz().textContent).not.toContain('Redactado con IA');
      fixture.componentInstance.deshacer();
      expect(restaurar).not.toHaveBeenCalled();
    });

    it('se puede redactar de nuevo y deshacer vuelve al último original', () => {
      poner('no enfria');
      redactar();
      poner(TECNICO);

      redactarTecnico.mockReturnValue(
        of({ disponible: true, textoTecnico: 'Segunda versión técnica.' }),
      );
      redactar();
      boton('Deshacer')!.click();

      expect(restaurar).toHaveBeenCalledWith(TECNICO);
    });
  });

  describe('mientras carga', () => {
    let respuesta: Subject<RedaccionTecnica>;

    beforeEach(() => {
      respuesta = new Subject();
      redactarTecnico.mockReturnValue(respuesta);
      poner('no enfria');
      redactar();
    });

    it('deshabilita el botón y anuncia la carga de forma accesible', () => {
      expect(boton('Redactar de forma técnica')!.disabled).toBe(true);
      expect(raiz().firstElementChild?.getAttribute('aria-busy')).toBe('true');
      expect(raiz().querySelector('[aria-live="polite"]')?.textContent).toContain('Redactando');
    });

    it('ignora clics y no hace una segunda llamada', () => {
      boton('Redactar de forma técnica')!.click();
      fixture.componentInstance.redactar();
      expect(redactarTecnico).toHaveBeenCalledTimes(1);
    });

    it('al llegar la respuesta termina la carga', () => {
      respuesta.next({ disponible: true, textoTecnico: TECNICO });
      fixture.detectChanges();

      expect(raiz().firstElementChild?.getAttribute('aria-busy')).toBe('false');
      expect(boton('Redactar de forma técnica')!.disabled).toBe(false);
      expect(redactado).toHaveBeenCalledWith(TECNICO);
    });

    it('al salir del paso cancela la petición en curso', () => {
      expect(respuesta.observed).toBe(true);
      fixture.destroy();
      expect(respuesta.observed).toBe(false);
    });
  });

  describe('cuando no se puede redactar', () => {
    it('disponible=false muestra el mensaje neutro y no cambia el campo', () => {
      responder({ disponible: false, textoTecnico: '' });
      poner('no enfria');
      redactar();

      expect(raiz().textContent).toContain(MENSAJE_REDACCION_NO_DISPONIBLE);
      expect(MENSAJE_REDACCION_NO_DISPONIBLE).toBe(
        'No pudimos redactarlo ahora; puedes continuar con tu descripción',
      );
      expect(redactado).not.toHaveBeenCalled();
      expect(boton('Deshacer')).toBeUndefined();
    });

    it('disponible=true pero sin texto tampoco cambia el campo', () => {
      redactarTecnico.mockReturnValue(of({ disponible: true, textoTecnico: undefined }));
      poner('no enfria');
      redactar();

      expect(redactado).not.toHaveBeenCalled();
      expect(raiz().textContent).toContain(MENSAJE_REDACCION_NO_DISPONIBLE);
    });

    it.each([0, 401, 500])(
      'si la llamada falla (HTTP %i) muestra solo el mensaje neutro',
      (status) => {
        redactarTecnico.mockReturnValue(
          throwError(() => ({
            status,
            message: 'Http failure response for http://localhost:8080/api/...',
          })),
        );
        poner('no enfria');
        redactar();

        expect(raiz().textContent).toContain(MENSAJE_REDACCION_NO_DISPONIBLE);
        expect(raiz().textContent).not.toContain('Http failure');
        expect(redactado).not.toHaveBeenCalled();
        expect(boton('Redactar de forma técnica')!.disabled).toBe(false);
      },
    );

    it('un fallo no borra el "Deshacer" de una redacción anterior y el aviso se limpia al reintentar', () => {
      poner('no enfria');
      redactar();
      poner(TECNICO);
      redactarTecnico.mockReturnValue(throwError(() => new Error('red')));
      redactar();
      expect(raiz().textContent).toContain(MENSAJE_REDACCION_NO_DISPONIBLE);

      redactarTecnico.mockReturnValue(of({ disponible: true, textoTecnico: 'Otra.' }));
      redactar();
      expect(raiz().textContent).not.toContain(MENSAJE_REDACCION_NO_DISPONIBLE);
    });
  });
});

describe('DetalleSolicitudComponent: texto que entra por la IA', () => {
  let componente: DetalleSolicitudComponent;

  beforeEach(() => {
    componente = new DetalleSolicitudComponent(new FormBuilder());
  });

  it('reemplaza la descripción y deja el campo válido, modificado y tocado', () => {
    expect(componente.descripcionProblema?.valid).toBe(false);

    componente.reemplazarDescripcion(TECNICO);

    expect(componente.descripcionProblema?.value).toBe(TECNICO);
    expect(componente.descripcionProblema?.valid).toBe(true);
    expect(componente.descripcionProblema?.dirty).toBe(true);
    expect(componente.descripcionProblema?.touched).toBe(true);
  });

  it('el campo sigue editable después de reemplazarlo', () => {
    componente.reemplazarDescripcion(TECNICO);
    componente.descripcionProblema?.setValue(`${TECNICO} Gotea.`);
    expect(componente.descripcionProblema?.value).toBe(`${TECNICO} Gotea.`);
  });

  it('el borrador del paso se actualiza con el texto nuevo', () => {
    const borradores: string[] = [];
    componente.borradorCambio.subscribe((b) => borradores.push(b.descripcionProblema));
    componente.ngOnInit();

    componente.reemplazarDescripcion(TECNICO);

    expect(borradores.at(-1)).toBe(TECNICO);
    componente.ngOnDestroy();
  });
});
