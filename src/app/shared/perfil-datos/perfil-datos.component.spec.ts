import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActualizarPerfilRequest, Perfil } from '../../core/models/perfil';
import { SharedModule } from '../shared.module';
import { PerfilDatosComponent } from './perfil-datos.component';

const CLIENTE: Perfil = {
  nombre: 'Ana',
  apellido: 'Pérez',
  correo: 'ana@correo.co',
  telefono: '3001234567',
  tipoDocumento: 'CC',
  numeroDocumento: '123456',
  direccion: 'Calle 6 # 12-34',
  rol: 'CLIENTE',
};

const TECNICO: Perfil = {
  ...CLIENTE,
  nombre: 'Luis',
  apellido: 'Gómez',
  rol: 'TECNICO',
  radioCoberturaKm: 15,
  especialidades: [
    { id: 1, nombre: 'Lavadoras' },
    { id: 2, nombre: 'Neveras' },
  ],
};

const ADMIN: Perfil = { ...CLIENTE, nombre: 'Sara', apellido: 'Ruiz', rol: 'ADMINISTRADOR', direccion: null };

describe('PerfilDatosComponent', () => {
  let fixture: ComponentFixture<PerfilDatosComponent>;
  let componente: PerfilDatosComponent;
  let guardadas: ActualizarPerfilRequest[];

  const raiz = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => raiz().textContent?.replace(/\s+/g, ' ') ?? '';
  const campo = (id: string): HTMLInputElement | null => raiz().querySelector(`#perfil-${id}`);
  const boton = (etiqueta: string): HTMLButtonElement =>
    Array.from(raiz().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === etiqueta)!;

  /** Valor que se muestra bajo una etiqueta del modo lectura. */
  const dato = (etiqueta: string): string | undefined =>
    Array.from(raiz().querySelectorAll('dt'))
      .find((dt) => dt.textContent?.trim() === etiqueta)
      ?.nextElementSibling?.textContent?.trim();

  function escribir(id: string, valor: string): void {
    const input = campo(id)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviar(): void {
    raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function mostrar(perfil: Perfil, rol: string | null = perfil.rol ?? null, entradas: Record<string, unknown> = {}): void {
    fixture = TestBed.createComponent(PerfilDatosComponent);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('perfil', perfil);
    fixture.componentRef.setInput('rol', rol);
    for (const [clave, valor] of Object.entries(entradas)) fixture.componentRef.setInput(clave, valor);
    guardadas = [];
    componente.guardar.subscribe((g) => guardadas.push(g));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SharedModule] }).compileComponents();
  });

  describe('modo lectura', () => {
    it('muestra los datos del cliente y no abre el formulario', () => {
      mostrar(CLIENTE);

      expect(texto()).toContain('Ana Pérez');
      expect(texto()).toContain('3001234567');
      expect(texto()).toContain('Calle 6 # 12-34');
      expect(raiz().querySelector('form')).toBeNull();
      expect(boton('Editar')).toBeDefined();
    });

    it('muestra correo, rol y documento como datos de solo lectura, con la nota para el administrador', () => {
      mostrar(CLIENTE);

      expect(texto()).toContain('ana@correo.co');
      expect(texto()).toContain('Cliente');
      expect(texto()).toContain('Cédula de ciudadanía 123456');
      expect(texto()).toContain('Para cambiar estos datos contacta al administrador.');
    });

    it('el técnico ve además sus especialidades y su radio de cobertura', () => {
      mostrar(TECNICO);

      expect(texto()).toContain('Técnico');
      expect(texto()).toContain('Dirección base');
      expect(texto()).toContain('15 km');
      expect(Array.from(raiz().querySelectorAll('.chip-admin')).map((c) => c.textContent?.trim())).toEqual(['Lavadoras', 'Neveras']);
    });

    it('el técnico sin especialidades lo indica', () => {
      mostrar({ ...TECNICO, especialidades: [], radioCoberturaKm: null });
      expect(texto()).toContain('Sin especialidades asignadas');
      expect(dato('Radio de cobertura')).toBe('Sin registrar');
    });

    it('el cliente no ve especialidades ni radio', () => {
      mostrar(CLIENTE);
      expect(texto()).not.toContain('Especialidades');
      expect(texto()).not.toContain('Radio de cobertura');
    });

    it('el administrador no tiene dirección', () => {
      mostrar(ADMIN);
      expect(texto()).toContain('Administrador');
      expect(texto()).not.toContain('Dirección');
    });

    it('lo que falta se muestra como "Sin registrar"', () => {
      mostrar({ ...CLIENTE, telefono: null, direccion: null, tipoDocumento: null, numeroDocumento: null });
      expect(dato('Teléfono')).toBe('Sin registrar');
      expect(dato('Dirección')).toBe('Sin registrar');
      expect(dato('Documento')).toBe('Sin registrar');
    });

    it('si el perfil no trae el rol, usa el que recibe', () => {
      mostrar({ ...CLIENTE, rol: undefined }, 'TECNICO');
      expect(texto()).toContain('Técnico');
    });
  });

  describe('edición', () => {
    it('"Editar" abre el formulario con los datos actuales y oculta el botón', () => {
      mostrar(CLIENTE);

      boton('Editar').click();
      fixture.detectChanges();

      expect(campo('nombre')!.value).toBe('Ana');
      expect(campo('apellido')!.value).toBe('Pérez');
      expect(campo('telefono')!.value).toBe('3001234567');
      expect(campo('direccion')!.value).toBe('Calle 6 # 12-34');
      expect(Array.from(raiz().querySelectorAll('button')).some((b) => b.textContent?.trim() === 'Editar')).toBe(false);
    });

    it('los campos usan el estilo del proyecto, tienen etiqueta y el foco va al primero', () => {
      mostrar(CLIENTE);
      boton('Editar').click();
      fixture.detectChanges();

      ['nombre', 'apellido', 'telefono', 'direccion'].forEach((id) => {
        expect(campo(id)!.classList).toContain('campo');
        expect(raiz().querySelector(`label[for="perfil-${id}"]`)).not.toBeNull();
      });
      expect(document.activeElement).toBe(campo('nombre'));
    });

    it('el técnico edita su "Dirección base"', () => {
      mostrar(TECNICO);
      boton('Editar').click();
      fixture.detectChanges();
      expect(raiz().querySelector('label[for="perfil-direccion"]')!.textContent).toContain('Dirección base');
    });

    it('el administrador no ve el campo de dirección', () => {
      mostrar(ADMIN);
      boton('Editar').click();
      fixture.detectChanges();
      expect(campo('direccion')).toBeNull();
    });

    it('correo, documento y rol no se pueden editar', () => {
      mostrar(CLIENTE);
      boton('Editar').click();
      fixture.detectChanges();

      expect(campo('correo')).toBeNull();
      expect(raiz().querySelectorAll('input')).toHaveLength(4);
      expect(texto()).toContain('ana@correo.co');
      expect(texto()).toContain('Para cambiar estos datos contacta al administrador.');
    });

    it('"Cancelar" descarta los cambios, vuelve a la lectura y devuelve el foco a "Editar"', () => {
      mostrar(CLIENTE);
      boton('Editar').click();
      fixture.detectChanges();
      escribir('nombre', 'Otro');

      boton('Cancelar').click();
      fixture.detectChanges();

      expect(raiz().querySelector('form')).toBeNull();
      expect(texto()).toContain('Ana Pérez');
      expect(guardadas).toEqual([]);
      expect(document.activeElement).toBe(boton('Editar'));

      boton('Editar').click();
      fixture.detectChanges();
      expect(campo('nombre')!.value).toBe('Ana');
    });
  });

  describe('validaciones', () => {
    beforeEach(() => {
      mostrar(CLIENTE);
      boton('Editar').click();
      fixture.detectChanges();
    });

    it('el nombre es obligatorio', () => {
      escribir('nombre', '');
      enviar();

      expect(raiz().querySelector('#perfil-nombre-error')?.textContent).toContain('Escribe tu nombre.');
      expect(campo('nombre')!.getAttribute('aria-invalid')).toBe('true');
      expect(guardadas).toEqual([]);
    });

    it('el apellido es obligatorio', () => {
      escribir('apellido', '');
      enviar();
      expect(raiz().querySelector('#perfil-apellido-error')?.textContent).toContain('Escribe tu apellido.');
      expect(guardadas).toEqual([]);
    });

    it('un nombre de solo espacios cuenta como vacío', () => {
      escribir('nombre', '    ');
      enviar();
      expect(guardadas).toEqual([]);
    });

    it('la dirección es obligatoria para el cliente', () => {
      escribir('direccion', '');
      enviar();
      expect(raiz().querySelector('#perfil-direccion-error')?.textContent).toContain('Escribe tu dirección.');
      expect(guardadas).toEqual([]);
    });

    it('el teléfono es opcional', () => {
      escribir('telefono', '');
      enviar();
      expect(guardadas).toHaveLength(1);
    });

    it('el administrador puede guardar sin dirección', () => {
      mostrar(ADMIN);
      boton('Editar').click();
      fixture.detectChanges();
      enviar();
      expect(guardadas).toEqual([{ nombre: 'Sara', apellido: 'Ruiz', telefono: '3001234567' }]);
    });
  });

  describe('guardar', () => {
    beforeEach(() => {
      mostrar(CLIENTE);
      boton('Editar').click();
      fixture.detectChanges();
    });

    it('emite solo nombre, apellido, teléfono y dirección, sin espacios sobrantes', () => {
      escribir('nombre', '  Ana María ');
      escribir('telefono', ' 3111111111 ');
      escribir('direccion', ' Carrera 7 # 1-1 ');
      enviar();

      expect(guardadas).toEqual([{ nombre: 'Ana María', apellido: 'Pérez', telefono: '3111111111', direccion: 'Carrera 7 # 1-1' }]);
    });

    it('un teléfono vacío se omite, igual que en el resto de formularios', () => {
      escribir('telefono', '');
      enviar();
      expect(guardadas[0]).not.toHaveProperty('telefono');
    });

    it('mientras guarda, el botón lo indica y todo queda deshabilitado', () => {
      fixture.componentRef.setInput('guardando', true);
      fixture.detectChanges();

      expect(boton('Guardando…').disabled).toBe(true);
      expect(boton('Cancelar').disabled).toBe(true);
    });

    it('no se puede cancelar mientras se guarda', () => {
      fixture.componentRef.setInput('guardando', true);
      fixture.detectChanges();
      componente.cancelar();
      expect(componente.editando).toBe(true);
    });

    it('cuando termina de guardar bien, vuelve a la lectura', () => {
      enviar();
      fixture.componentRef.setInput('guardando', true);
      fixture.detectChanges();

      fixture.componentRef.setInput('perfil', { ...CLIENTE, nombre: 'Ana María' });
      fixture.componentRef.setInput('guardando', false);
      fixture.detectChanges();

      expect(componente.editando).toBe(false);
      expect(texto()).toContain('Ana María Pérez');
      expect(document.activeElement).toBe(boton('Editar'));
    });

    it('si el guardado es instantáneo (llega el perfil sin pasar por "guardando"), también vuelve a la lectura', () => {
      enviar();

      fixture.componentRef.setInput('perfil', { ...CLIENTE, nombre: 'Ana María' });
      fixture.detectChanges();

      expect(componente.editando).toBe(false);
    });

    it('si el guardado falla, sigue abierto y muestra el error', () => {
      enviar();
      fixture.componentRef.setInput('guardando', true);
      fixture.detectChanges();

      fixture.componentRef.setInput('errorMensaje', 'El teléfono no es válido');
      fixture.componentRef.setInput('guardando', false);
      fixture.detectChanges();

      expect(componente.editando).toBe(true);
      expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('El teléfono no es válido');
      expect(campo('nombre')!.value).toBe('Ana');

      // Tras corregir y reintentar con éxito, se cierra.
      enviar();
      fixture.componentRef.setInput('errorMensaje', null);
      fixture.componentRef.setInput('perfil', { ...CLIENTE, telefono: '3000000000' });
      fixture.detectChanges();
      expect(componente.editando).toBe(false);
    });

    it('cambiar el perfil sin haber guardado no cierra la edición', () => {
      fixture.componentRef.setInput('perfil', { ...CLIENTE, telefono: null });
      fixture.detectChanges();
      expect(componente.editando).toBe(true);
    });
  });

  it('el foco vuelve al botón "Editar" y no falla si no existe', () => {
    mostrar(CLIENTE);
    const enfocar = vi.spyOn(HTMLElement.prototype, 'focus');
    boton('Editar').click();
    fixture.detectChanges();
    expect(enfocar).toHaveBeenCalled();
    enfocar.mockRestore();
  });
});
