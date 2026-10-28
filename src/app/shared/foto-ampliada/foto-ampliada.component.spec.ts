import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SharedModule } from '../shared.module';
import { FotoAmpliadaComponent } from './foto-ampliada.component';

describe('FotoAmpliadaComponent', () => {
  let fixture: ComponentFixture<FotoAmpliadaComponent>;
  let cerrar: ReturnType<typeof vi.fn>;
  let disparador: HTMLButtonElement;

  const raiz = (): HTMLElement => fixture.nativeElement;

  function abrir(): void {
    // Lo que tenía el foco al abrir (la carta pulsada) debe recuperarlo al cerrar.
    disparador = document.createElement('button');
    document.body.appendChild(disparador);
    disparador.focus();

    fixture = TestBed.createComponent(FotoAmpliadaComponent);
    fixture.componentRef.setInput('src', 'data:image/jpeg;base64,AAAA');
    fixture.componentRef.setInput('alt', 'Foto 2 del electrodoméstico');
    cerrar = vi.fn();
    fixture.componentInstance.cerrar.subscribe(cerrar);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SharedModule] }).compileComponents();
    abrir();
  });

  it('muestra la foto en un diálogo modal con su texto alternativo', () => {
    const dialogo = raiz().querySelector('[role="dialog"]')!;
    const imagen = dialogo.querySelector('img')!;
    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    expect(imagen.getAttribute('src')).toBe('data:image/jpeg;base64,AAAA');
    expect(imagen.alt).toBe('Foto 2 del electrodoméstico');
  });

  it('lleva el foco al botón de cerrar al abrirse', () => {
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Cerrar foto');
  });

  it('se cierra con la X', () => {
    (raiz().querySelector('button[aria-label="Cerrar foto"]') as HTMLButtonElement).click();
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('se cierra con un clic afuera', () => {
    (raiz().querySelector('[data-fondo]') as HTMLElement).click();
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('se cierra con Escape', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('un clic sobre la foto no la cierra', () => {
    (raiz().querySelector('img') as HTMLElement).click();
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('al destruirse devuelve el foco a lo que lo tenía antes', () => {
    fixture.destroy();
    expect(document.activeElement).toBe(disparador);
  });

  it('si lo que tenía el foco ya no existe, no falla', () => {
    disparador.remove();
    expect(() => fixture.destroy()).not.toThrow();
  });
});
