import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAXIMO_VISIBLES, ToastService } from './toast.service';

describe('ToastService', () => {
  let servicio: ToastService;
  const titulos = (): string[] => servicio.visibles().map((a) => a.titulo);

  beforeEach(() => {
    servicio = TestBed.inject(ToastService);
  });

  it('cada tipo crea un aviso con su tipo y una duración propia', () => {
    servicio.exito('A');
    servicio.info('B');
    servicio.advertencia('C');
    servicio.error('D');

    const [a, b, c] = servicio.visibles();
    expect(servicio.visibles().map((x) => x.tipo)).toEqual(['exito', 'info', 'advertencia']);
    expect([a.duracion, b.duracion, c.duracion]).toEqual([4000, 4000, 6000]);
  });

  it('mostrar() acepta descripción, acción y duración propias, y devuelve el id', () => {
    const accion = { etiqueta: 'Ver', accion: vi.fn() };
    const id = servicio.mostrar({ tipo: 'error', titulo: 'Falló', descripcion: 'Detalle', accion, duracion: 0 });

    expect(id).toBe(servicio.visibles()[0].id);
    expect(servicio.visibles()[0]).toMatchObject({ tipo: 'error', descripcion: 'Detalle', accion, duracion: 0 });
  });

  it('sin tipo es informativo y los errores duran más', () => {
    servicio.mostrar({ titulo: 'Hola' });
    servicio.error('Mal');
    expect(servicio.visibles()[0].tipo).toBe('info');
    expect(servicio.visibles()[1].duracion).toBe(8000);
  });

  it('muestra como máximo tres y deja los demás en cola, en orden', () => {
    ['1', '2', '3', '4', '5'].forEach((t) => servicio.exito(t));
    expect(titulos()).toEqual(['1', '2', '3']);
    expect(servicio.visibles()).toHaveLength(MAXIMO_VISIBLES);

    servicio.cerrar(servicio.visibles()[0].id);
    expect(titulos()).toEqual(['2', '3', '4']);

    servicio.cerrar(servicio.visibles()[1].id);
    expect(titulos()).toEqual(['2', '4', '5']);
  });

  it('descarta un aviso idéntico a otro visible o en cola', () => {
    expect(servicio.exito('Pago recibido', 'Listo')).not.toBeNull();
    expect(servicio.exito('Pago recibido', 'Listo')).toBeNull();
    servicio.exito('Otro');
    servicio.exito('Otro más');
    servicio.exito('En cola');
    expect(servicio.exito('En cola')).toBeNull();
    expect(servicio.visibles()).toHaveLength(3);
  });

  it('un aviso con otro tipo o texto no es duplicado, y uno ya cerrado puede volver a mostrarse', () => {
    const id = servicio.exito('Hola')!;
    expect(servicio.error('Hola')).not.toBeNull();
    expect(servicio.exito('Hola', 'distinto')).not.toBeNull();

    servicio.cerrar(id);
    expect(servicio.exito('Hola')).not.toBeNull();
  });

  it('cerrar un id que ya no existe no rompe nada', () => {
    servicio.exito('A');
    servicio.cerrar(999);
    expect(titulos()).toEqual(['A']);
  });

  it('cerrar un aviso que esperaba en cola lo quita de la cola', () => {
    ['1', '2', '3'].forEach((t) => servicio.exito(t));
    const idEnCola = servicio.exito('4')!;
    servicio.cerrar(idEnCola);
    servicio.cerrar(servicio.visibles()[0].id);
    expect(titulos()).toEqual(['2', '3']);
  });
});
