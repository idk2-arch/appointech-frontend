import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DetalleCita, FotoElectrodomestico } from '../../../core/models/cita';
import { CitaClienteService } from '../../../core/services/cita-cliente.service';
import { FotoElectrodomesticoService, ResultadoSubidaFotos } from '../../../core/services/foto-electrodomestico.service';
import { DetalleCitaClienteComponent } from './detalle-cita-cliente.component';

function foto(id: number): FotoElectrodomestico {
  return { id, url: `/api/citas/5/fotos/${id}` };
}

function cita(fotos: FotoElectrodomestico[], estado: DetalleCita['estado'] = 'PENDIENTE'): DetalleCita {
  return {
    id: 5,
    estado,
    tecnicoId: 1,
    especialidadId: 1,
    descripcionProblema: 'No centrifuga',
    direccionServicio: 'Calle 6',
    fechaHoraInicio: '2026-11-04T14:00:00',
    fechaHoraFin: '2026-11-04T15:00:00',
    diagnostico: null,
    historial: [],
    fotosElectrodomestico: fotos,
  };
}

const resultado = (datos: Partial<ResultadoSubidaFotos>): ResultadoSubidaFotos => ({
  subidas: [],
  fallidas: [],
  mensajeError: null,
  ...datos,
});

describe('DetalleCitaClienteComponent: fotos del electrodoméstico', () => {
  let obtener: ReturnType<typeof vi.fn>;
  let subirVarias: ReturnType<typeof vi.fn>;
  let eliminar: ReturnType<typeof vi.fn>;
  let componente: DetalleCitaClienteComponent;

  beforeEach(() => {
    obtener = vi.fn().mockReturnValue(of(cita([foto(1)])));
    subirVarias = vi.fn().mockReturnValue(of(resultado({ subidas: [foto(2)] })));
    eliminar = vi.fn().mockReturnValue(of(undefined));
    componente = new DetalleCitaClienteComponent(
      { snapshot: { paramMap: { get: () => '5' } } } as unknown as ActivatedRoute,
      { obtener } as unknown as CitaClienteService,
      { subirVarias, eliminar } as unknown as FotoElectrodomesticoService,
      { markForCheck: vi.fn() } as unknown as ChangeDetectorRef
    );
    componente.ngOnInit();
  });

  describe('cupo', () => {
    it.each([
      [0, 3],
      [1, 2],
      [3, 0],
    ])('con %s fotos caben %s más', (cuantas, cupo) => {
      componente.cita = cita(Array.from({ length: cuantas }, (_, i) => foto(i + 1)));
      expect(componente.cupoFotos).toBe(cupo);
    });

    it('sin cita cargada, el cupo es el máximo', () => {
      componente.cita = null;
      expect(componente.cupoFotos).toBe(3);
    });

    it('solo se puede modificar mientras la cita esté pendiente o confirmada', () => {
      componente.cita = cita([], 'CONFIRMADA');
      expect(componente.puedeModificar).toBe(true);
      componente.cita = cita([], 'EN_CAMINO');
      expect(componente.puedeModificar).toBe(false);
    });
  });

  describe('subir fotos', () => {
    it('sube las elegidas a esta cita, avisa y recarga el detalle', () => {
      componente.fotosNuevas = ['A'];
      obtener.mockClear();

      componente.subirFotos();

      expect(subirVarias).toHaveBeenCalledWith(5, ['A']);
      expect(componente.mensajeExito).toBe('La foto fue agregada.');
      expect(componente.fotosNuevas).toEqual([]);
      expect(componente.errorFotos).toBeNull();
      expect(obtener).toHaveBeenCalledTimes(1);
      expect(componente.enviandoFotos).toBe(false);
    });

    it('con varias fotos el aviso va en plural', () => {
      componente.fotosNuevas = ['A', 'B'];
      subirVarias.mockReturnValue(of(resultado({ subidas: [foto(2), foto(3)] })));

      componente.subirFotos();

      expect(componente.mensajeExito).toBe('Las fotos fueron agregadas.');
    });

    it('sin fotos elegidas no hace nada', () => {
      componente.fotosNuevas = [];
      componente.subirFotos();
      expect(subirVarias).not.toHaveBeenCalled();
    });

    it('si una falla, deja elegida la que falló, muestra el motivo y permite reintentar', () => {
      componente.fotosNuevas = ['A', 'B'];
      subirVarias.mockReturnValue(
        of(resultado({ subidas: [foto(2)], fallidas: ['B'], mensajeError: 'La cita ya no admite fotos' }))
      );

      componente.subirFotos();

      expect(componente.fotosNuevas).toEqual(['B']);
      expect(componente.errorFotos).toBe('La cita ya no admite fotos Puedes reintentar.');
      expect(componente.mensajeExito).toBe('La foto fue agregada.');

      subirVarias.mockReturnValue(of(resultado({ subidas: [foto(3)] })));
      componente.subirFotos();
      expect(subirVarias).toHaveBeenLastCalledWith(5, ['B']);
      expect(componente.fotosNuevas).toEqual([]);
    });

    it('si todas fallan, no recarga ni da el aviso de éxito', () => {
      componente.fotosNuevas = ['A'];
      subirVarias.mockReturnValue(of(resultado({ fallidas: ['A'], mensajeError: null })));
      obtener.mockClear();

      componente.subirFotos();

      expect(componente.errorFotos).toBe('No fue posible subir la foto. Puedes reintentar.');
      expect(componente.mensajeExito).toBeNull();
      expect(obtener).not.toHaveBeenCalled();
    });

    it('mientras sube, marca que está enviando', () => {
      const subida = new Subject<ResultadoSubidaFotos>();
      subirVarias.mockReturnValue(subida);
      componente.fotosNuevas = ['A'];

      componente.subirFotos();
      expect(componente.enviandoFotos).toBe(true);

      subida.next(resultado({}));
      subida.complete();
      expect(componente.enviandoFotos).toBe(false);
    });
  });

  describe('quitar una foto', () => {
    it('la elimina de esta cita, avisa y recarga el detalle', () => {
      obtener.mockClear();

      componente.quitarFoto(foto(1));

      expect(eliminar).toHaveBeenCalledWith(5, 1);
      expect(componente.mensajeExito).toBe('La foto fue eliminada.');
      expect(obtener).toHaveBeenCalledTimes(1);
      expect(componente.enviandoFotos).toBe(false);
    });

    it('si el servidor lo rechaza, muestra su mensaje', () => {
      eliminar.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 409, error: { status: 409, error: 'La cita ya no admite cambios' } }))
      );

      componente.quitarFoto(foto(1));

      expect(componente.errorFotos).toBe('La cita ya no admite cambios');
      expect(componente.mensajeExito).toBeNull();
      expect(componente.enviandoFotos).toBe(false);
    });

    it('sin mensaje del servidor, usa uno claro en español', () => {
      eliminar.mockReturnValue(throwError(() => new Error('x')));
      componente.quitarFoto(foto(1));
      expect(componente.errorFotos).toBe('No fue posible quitar la foto.');
    });
  });
});
