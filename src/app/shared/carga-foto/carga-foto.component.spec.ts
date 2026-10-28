import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProcesadorImagenService } from '../../core/services/procesador-imagen.service';
import { ErrorImagen } from '../../core/utils/imagen';
import { SharedModule } from '../shared.module';
import { CargaFotoComponent } from './carga-foto.component';

describe('CargaFotoComponent', () => {
  let fixture: ComponentFixture<CargaFotoComponent>;
  let componente: CargaFotoComponent;
  let procesar: ReturnType<typeof vi.fn>;

  const raiz = (): HTMLElement => fixture.nativeElement;
  const botones = (): string[] => Array.from(raiz().querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');
  const boton = (texto: string): HTMLButtonElement =>
    Array.from(raiz().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === texto)!;

  /** Simula que la persona eligió un archivo y espera a que termine el procesamiento. */
  async function elegirArchivo(tipo = 'image/png'): Promise<void> {
    const campo = raiz().querySelector<HTMLInputElement>('input[type="file"]')!;
    const archivo = new File(['x'], 'foto', { type: tipo });
    Object.defineProperty(campo, 'files', { value: [archivo], configurable: true });
    campo.dispatchEvent(new Event('change'));
    await new Promise((resolver) => setTimeout(resolver));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    procesar = vi.fn().mockResolvedValue('data:image/jpeg;base64,QUJD');
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [{ provide: ProcesadorImagenService, useValue: { procesar } }],
    }).compileComponents();
    fixture = TestBed.createComponent(CargaFotoComponent);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('nombre', 'Ana Pérez');
    fixture.detectChanges();
  });

  it('sin foto ofrece solo "Elegir imagen" y acepta únicamente JPEG, PNG y WebP', () => {
    expect(botones()).toEqual(['Elegir imagen']);
    expect(raiz().querySelector<HTMLInputElement>('input[type="file"]')!.accept).toBe('image/jpeg,image/png,image/webp');
  });

  it('con foto ofrece cambiarla y quitarla', () => {
    fixture.componentRef.setInput('fotoUrl', '/api/fotos/abc');
    fixture.detectChanges();
    expect(botones()).toEqual(['Cambiar imagen', 'Quitar foto']);
  });

  it('no ofrece quitar cuando permitirQuitar es falso', () => {
    fixture.componentRef.setInput('fotoUrl', '/api/fotos/abc');
    fixture.componentRef.setInput('permitirQuitar', false);
    fixture.detectChanges();
    expect(botones()).toEqual(['Cambiar imagen']);
  });

  it('"Quitar foto" avisa a quien lo usa', () => {
    const quitar = vi.fn();
    componente.quitar.subscribe(quitar);
    fixture.componentRef.setInput('fotoUrl', '/api/fotos/abc');
    fixture.detectChanges();

    boton('Quitar foto').click();

    expect(quitar).toHaveBeenCalledTimes(1);
  });

  it('al elegir una imagen la reduce, muestra la vista previa y ofrece guardar o descartar', async () => {
    await elegirArchivo('image/png');

    expect(procesar).toHaveBeenCalledTimes(1);
    expect(procesar.mock.calls[0][0]).toBeInstanceOf(File);
    expect(raiz().querySelector('app-avatar img')?.getAttribute('src')).toBe('data:image/jpeg;base64,QUJD');
    expect(botones()).toEqual(['Guardar foto', 'Descartar']);
  });

  it('"Guardar foto" emite la imagen ya reducida en base64', async () => {
    const guardar = vi.fn();
    componente.guardar.subscribe(guardar);
    await elegirArchivo();

    boton('Guardar foto').click();

    expect(guardar).toHaveBeenCalledWith('data:image/jpeg;base64,QUJD');
  });

  it('"Descartar" quita la vista previa sin emitir nada', async () => {
    const guardar = vi.fn();
    componente.guardar.subscribe(guardar);
    await elegirArchivo();

    boton('Descartar').click();
    fixture.detectChanges();

    expect(botones()).toEqual(['Elegir imagen']);
    expect(guardar).not.toHaveBeenCalled();
  });

  it('muestra el mensaje de validación cuando la imagen no sirve y no ofrece guardar', async () => {
    procesar.mockRejectedValue(new ErrorImagen('Elige una imagen JPEG, PNG o WebP.'));

    await elegirArchivo('image/gif');

    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('JPEG, PNG o WebP');
    expect(botones()).toEqual(['Elegir imagen']);
  });

  it('muestra el aviso de tamaño cuando la imagen sigue pesando de más', async () => {
    procesar.mockRejectedValue(new ErrorImagen('La imagen sigue pesando más de 1 MB después de reducirla.'));

    await elegirArchivo();

    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('más de 1 MB');
  });

  it('ante un error inesperado muestra un mensaje genérico en español', async () => {
    procesar.mockRejectedValue(new Error('boom'));

    await elegirArchivo();

    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('No pudimos preparar la imagen');
  });

  it('muestra el error del servidor que le pasa quien lo usa', () => {
    fixture.componentRef.setInput('errorMensaje', 'Imagen inválida');
    fixture.detectChanges();
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Imagen inválida');
  });

  it('deshabilita los botones mientras se envía', async () => {
    await elegirArchivo();
    fixture.componentRef.setInput('enviando', true);
    fixture.detectChanges();

    expect(boton('Guardando…').disabled).toBe(true);
    expect(boton('Descartar').disabled).toBe(true);
  });

  it('cuando llega una foto nueva del servidor, descarta la vista previa', async () => {
    await elegirArchivo();

    fixture.componentRef.setInput('fotoUrl', '/api/fotos/nueva');
    fixture.detectChanges();

    expect(botones()).toEqual(['Cambiar imagen', 'Quitar foto']);
  });

  it('elegir un archivo después de un error limpia el mensaje anterior', async () => {
    procesar.mockRejectedValueOnce(new ErrorImagen('Elige una imagen JPEG, PNG o WebP.'));
    await elegirArchivo('image/gif');
    expect(raiz().querySelector('[role="alert"]')).not.toBeNull();

    await elegirArchivo('image/png');

    expect(raiz().querySelector('[role="alert"]')).toBeNull();
  });
});
