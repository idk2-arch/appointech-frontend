import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SharedModule } from '../shared.module';
import { OpcionSelect } from './select.component';

const OPCIONES: OpcionSelect[] = [
  { value: '', label: 'Todos' },
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

@Component({
  imports: [SharedModule, ReactiveFormsModule, FormsModule],
  template: `
    <label for="prueba-select">Documento</label>
    <app-select inputId="prueba-select" [options]="opciones" [formControl]="control" placeholder="Elige"></app-select>
    <button type="button" id="afuera">Afuera</button>
  `,
})
class ReactivoComponent {
  opciones = OPCIONES;
  control = new FormControl<string | null>(null);
}

@Component({
  imports: [SharedModule, ReactiveFormsModule, FormsModule],
  template: `<app-select [options]="opciones" [(ngModel)]="valor" [disabled]="apagado"></app-select>`,
})
class NgModelComponent {
  opciones = OPCIONES;
  valor: string | null = 'CE';
  apagado = false;
}

describe('SelectComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactivoComponent, NgModelComponent],
    }).compileComponents();
  });

  afterEach(() => vi.useRealTimers());

  describe('con formulario reactivo', () => {
    let fixture: ComponentFixture<ReactivoComponent>;
    const raiz = (): HTMLElement => fixture.nativeElement;
    const boton = (): HTMLButtonElement => raiz().querySelector<HTMLButtonElement>('#prueba-select')!;
    const opciones = (): HTMLElement[] => Array.from(raiz().querySelectorAll<HTMLElement>('[role="option"]'));
    const tecla = (key: string): void => {
      boton().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };

    beforeEach(() => {
      fixture = TestBed.createComponent(ReactivoComponent);
      fixture.detectChanges();
    });

    it('muestra el placeholder y expone los roles de accesibilidad', () => {
      expect(boton().textContent).toContain('Elige');
      expect(boton().getAttribute('role')).toBe('combobox');
      expect(boton().getAttribute('aria-expanded')).toBe('false');
      expect(raiz().querySelector('[role="listbox"]')).toBeNull();
    });

    it('el label enlaza con el botón mediante inputId', () => {
      expect(raiz().querySelector('label')!.htmlFor).toBe('prueba-select');
    });

    it('al hacer clic abre el menú con todas las opciones', () => {
      boton().click();
      fixture.detectChanges();

      expect(boton().getAttribute('aria-expanded')).toBe('true');
      expect(raiz().querySelector('[role="listbox"]')).not.toBeNull();
      expect(opciones().map((o) => o.textContent?.trim())).toEqual(OPCIONES.map((o) => o.label));
    });

    it('elegir una opción actualiza el control, muestra su texto y cierra el menú', () => {
      boton().click();
      fixture.detectChanges();
      opciones()[2].click();
      fixture.detectChanges();

      expect(fixture.componentInstance.control.value).toBe('CE');
      expect(boton().textContent).toContain('Cédula de extranjería');
      expect(raiz().querySelector('[role="listbox"]')).toBeNull();
    });

    it('marca con aria-selected y con la marca de verificación la opción elegida', () => {
      fixture.componentInstance.control.setValue('PASAPORTE');
      boton().click();
      fixture.detectChanges();

      const elegidas = opciones().filter((o) => o.getAttribute('aria-selected') === 'true');
      expect(elegidas).toHaveLength(1);
      expect(elegidas[0].textContent).toContain('Pasaporte');
      expect(elegidas[0].querySelector('svg')).not.toBeNull();
    });

    it('un valor puesto desde el formulario se refleja en el botón', () => {
      fixture.componentInstance.control.setValue('CC');
      fixture.detectChanges();
      expect(boton().textContent).toContain('Cédula de ciudadanía');
    });

    it('las flechas mueven la opción resaltada y Enter la elige', () => {
      tecla('ArrowDown'); // abre en la primera opción
      expect(boton().getAttribute('aria-expanded')).toBe('true');
      tecla('ArrowDown');
      tecla('ArrowDown');
      expect(boton().getAttribute('aria-activedescendant')).toBe(opciones()[2].id);

      tecla('ArrowUp');
      expect(boton().getAttribute('aria-activedescendant')).toBe(opciones()[1].id);

      tecla('Enter');
      expect(fixture.componentInstance.control.value).toBe('CC');
      expect(raiz().querySelector('[role="listbox"]')).toBeNull();
    });

    it('Home y End saltan a la primera y a la última opción', () => {
      tecla('ArrowDown');
      tecla('End');
      expect(boton().getAttribute('aria-activedescendant')).toBe(opciones()[3].id);
      tecla('Home');
      expect(boton().getAttribute('aria-activedescendant')).toBe(opciones()[0].id);
    });

    it('no se pasa de los extremos con las flechas', () => {
      tecla('ArrowDown');
      tecla('ArrowUp');
      expect(boton().getAttribute('aria-activedescendant')).toBe(opciones()[0].id);
      tecla('End');
      tecla('ArrowDown');
      expect(boton().getAttribute('aria-activedescendant')).toBe(opciones()[3].id);
    });

    it('Escape cierra sin cambiar el valor y no propaga el evento', () => {
      boton().click();
      fixture.detectChanges();
      const evento = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      const alDocumento = vi.fn();
      document.addEventListener('keydown', alDocumento);

      boton().dispatchEvent(evento);
      fixture.detectChanges();
      document.removeEventListener('keydown', alDocumento);

      expect(raiz().querySelector('[role="listbox"]')).toBeNull();
      expect(fixture.componentInstance.control.value).toBeNull();
      expect(alDocumento).not.toHaveBeenCalled();
    });

    it('escribir una letra resalta la primera opción que empieza así', () => {
      tecla('p');
      expect(boton().getAttribute('aria-activedescendant')).toBe(opciones()[3].id);
    });

    it('escribir la misma letra otra vez avanza a la siguiente coincidencia', () => {
      vi.useFakeTimers();
      tecla('c');
      const primera = boton().getAttribute('aria-activedescendant');
      vi.advanceTimersByTime(700);
      tecla('c');
      expect(boton().getAttribute('aria-activedescendant')).not.toBe(primera);
    });

    it('un clic fuera del selector lo cierra', () => {
      boton().click();
      fixture.detectChanges();

      raiz().querySelector<HTMLButtonElement>('#afuera')!.click();
      fixture.detectChanges();

      expect(raiz().querySelector('[role="listbox"]')).toBeNull();
    });

    it('un clic dentro del menú no lo cierra antes de elegir', () => {
      boton().click();
      fixture.detectChanges();
      raiz().querySelector<HTMLElement>('[role="listbox"]')!.click();
      fixture.detectChanges();
      expect(raiz().querySelector('[role="listbox"]')).not.toBeNull();
    });

    it('Tab cierra el menú', () => {
      boton().click();
      fixture.detectChanges();
      tecla('Tab');
      expect(raiz().querySelector('[role="listbox"]')).toBeNull();
    });

    it('con el control deshabilitado no abre ni responde al teclado', () => {
      fixture.componentInstance.control.disable();
      fixture.detectChanges();

      expect(boton().disabled).toBe(true);
      boton().click();
      tecla('ArrowDown');
      expect(raiz().querySelector('[role="listbox"]')).toBeNull();
    });

    it('al cerrar el control queda marcado como tocado', () => {
      boton().click();
      fixture.detectChanges();
      expect(fixture.componentInstance.control.touched).toBe(false);

      tecla('Escape');
      expect(fixture.componentInstance.control.touched).toBe(true);
    });

    it('abre hacia arriba cuando no hay espacio abajo', () => {
      vi.spyOn(boton(), 'getBoundingClientRect').mockReturnValue({
        top: window.innerHeight - 40,
        bottom: window.innerHeight - 4,
      } as DOMRect);

      boton().click();
      fixture.detectChanges();

      expect(raiz().querySelector('[role="listbox"]')!.classList).toContain('select__menu--arriba');
    });

    it('abre hacia abajo cuando hay espacio', () => {
      vi.spyOn(boton(), 'getBoundingClientRect').mockReturnValue({ top: 40, bottom: 76 } as DOMRect);

      boton().click();
      fixture.detectChanges();

      expect(raiz().querySelector('[role="listbox"]')!.classList).not.toContain('select__menu--arriba');
    });
  });

  describe('con ngModel', () => {
    it('muestra el valor inicial y lo actualiza al elegir', async () => {
      const fixture = TestBed.createComponent(NgModelComponent);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const raiz: HTMLElement = fixture.nativeElement;

      expect(raiz.querySelector('button')!.textContent).toContain('Cédula de extranjería');

      raiz.querySelector('button')!.click();
      fixture.detectChanges();
      Array.from(raiz.querySelectorAll<HTMLElement>('[role="option"]'))[3].click();
      fixture.detectChanges();

      expect(fixture.componentInstance.valor).toBe('PASAPORTE');
    });

    it('respeta la entrada disabled', async () => {
      const fixture = TestBed.createComponent(NgModelComponent);
      fixture.componentInstance.apagado = true;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
    });
  });
});
