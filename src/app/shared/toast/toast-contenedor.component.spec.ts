import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastContenedorComponent } from './toast-contenedor.component';
import { ToastModule } from './toast.module';
import { ToastService } from './toast.service';

describe('ToastContenedorComponent', () => {
  let fixture: ComponentFixture<ToastContenedorComponent>;
  let servicio: ToastService;

  const toasts = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('.swipe-toast'));
  const refrescar = (): void => fixture.detectChanges();

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ToastModule] }).compileComponents();
    servicio = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ToastContenedorComponent);
    fixture.detectChanges();
  });

  it('es una región con nombre y sin avisos no dibuja nada', () => {
    const region = fixture.nativeElement.querySelector('.toast-contenedor');
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-label')).toBe('Avisos');
    expect(toasts()).toHaveLength(0);
  });

  it('dibuja cada aviso del servicio en modo inline, con su tipo, texto y botón de cerrar', () => {
    servicio.exito('Pago recibido', 'Todo bien');
    servicio.error('Algo falló');
    refrescar();

    expect(toasts()).toHaveLength(2);
    expect(toasts().map((t) => t.getAttribute('data-tipo'))).toEqual(['exito', 'error']);
    expect(toasts()[0].getAttribute('data-inline')).toBe('true');
    expect(toasts()[0].textContent).toContain('Pago recibido');
    expect(toasts()[0].textContent).toContain('Todo bien');
    expect(toasts()[0].querySelector('.swipe-toast__close')).not.toBeNull();
    expect(toasts()[1].querySelector('[role="alert"]')).not.toBeNull();
  });

  it('la acción ejecuta la función del aviso y cierra', () => {
    const accion = vi.fn();
    servicio.exito('Pago recibido', undefined, { etiqueta: 'Ver comprobante', accion });
    refrescar();

    toasts()[0].querySelector<HTMLButtonElement>('.swipe-toast__action')!.click();
    expect(accion).toHaveBeenCalledOnce();
  });

  it('un aviso sin acción no dibuja el botón', () => {
    servicio.info('Hola');
    refrescar();
    expect(toasts()[0].querySelector('.swipe-toast__action')).toBeNull();
  });

  it('cuando un aviso termina su salida lo quita del servicio y entra el siguiente de la cola', () => {
    vi.useFakeTimers();
    ['1', '2', '3', '4'].forEach((t) => servicio.info(t));
    refrescar();
    expect(toasts()).toHaveLength(3);

    toasts()[0].querySelector<HTMLButtonElement>('.swipe-toast__close')!.click();
    vi.advanceTimersByTime(400 * 0.7 + 60 + 200);
    refrescar();

    expect(toasts().map((t) => t.querySelector('.swipe-toast__title')?.textContent)).toEqual(['2', '3', '4']);
    vi.useRealTimers();
  });
});
