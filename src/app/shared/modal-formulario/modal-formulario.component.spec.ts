import { Component, NgModule } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SharedModule } from '../shared.module';
@Component({
  standalone: false,
  template: `<button id="abrir" (click)="abierto = true">Abrir</button>
    @if (abierto) {
      <app-modal-formulario titulo="Franja" [cargando]="cargando" (cerrar)="abierto = false"
        ><input id="fecha" type="date"
      /></app-modal-formulario>
    }`,
})
class Anfitrion {
  abierto = false;
  cargando = false;
}
@NgModule({ declarations: [Anfitrion], imports: [SharedModule] })
class ModuloPrueba {}
describe('ModalFormularioComponent: foco de teclado', () => {
  let fixture: ComponentFixture<Anfitrion>;
  const raiz = (): HTMLElement => fixture.nativeElement;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ModuloPrueba] }).compileComponents();
    fixture = TestBed.createComponent(Anfitrion);
    fixture.detectChanges();
  });
  function abrir(): void {
    const boton = raiz().querySelector<HTMLButtonElement>('#abrir')!;
    boton.focus();
    boton.click();
    fixture.detectChanges();
  }
  it('enfoca el primer campo y restaura foco al cerrar con Escape', () => {
    abrir();
    expect(document.activeElement?.id).toBe('fecha');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(raiz().querySelector('app-modal-formulario')).toBeNull();
    expect(document.activeElement?.id).toBe('abrir');
  });
  it('mantiene Tab y Shift+Tab dentro del diálogo y no cierra mientras guarda', () => {
    abrir();
    const botones = raiz().querySelectorAll<HTMLButtonElement>('app-modal-formulario button');
    botones[botones.length - 1].focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(botones[0]);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(botones[botones.length - 1]);
    fixture.componentInstance.cargando = true;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(raiz().querySelector('app-modal-formulario')).not.toBeNull();
  });
});
