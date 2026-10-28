import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorImagen } from '../utils/imagen';
import { ProcesadorImagenService } from './procesador-imagen.service';

/** jsdom no decodifica imágenes ni dibuja en canvas: se simulan con tamaño y resultado controlados. */
class ImagenFalsa {
  static ancho = 2000;
  static alto = 1000;
  static falla = false;
  naturalWidth = ImagenFalsa.ancho;
  naturalHeight = ImagenFalsa.alto;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_origen: string) {
    queueMicrotask(() => (ImagenFalsa.falla ? this.onerror?.() : this.onload?.()));
  }
}

describe('ProcesadorImagenService', () => {
  let servicio: ProcesadorImagenService;
  let contexto: { fillStyle: string; fillRect: ReturnType<typeof vi.fn>; drawImage: ReturnType<typeof vi.fn> };
  let toDataURL: ReturnType<typeof vi.fn>;
  let dimensionesDelLienzo: { ancho: number; alto: number };

  const archivo = (tipo = 'image/png'): File => new File(['contenido'], 'foto', { type: tipo });

  beforeEach(() => {
    ImagenFalsa.ancho = 2000;
    ImagenFalsa.alto = 1000;
    ImagenFalsa.falla = false;
    vi.stubGlobal('Image', ImagenFalsa);

    contexto = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
    dimensionesDelLienzo = { ancho: 0, alto: 0 };
    toDataURL = vi.fn(function (this: HTMLCanvasElement) {
      dimensionesDelLienzo = { ancho: this.width, alto: this.height };
      return 'data:image/jpeg;base64,QUJD';
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(contexto as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(toDataURL as never);

    servicio = TestBed.inject(ProcesadorImagenService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reduce la imagen a 512 px de lado mayor y la devuelve como JPEG con calidad 0.85', async () => {
    const resultado = await servicio.procesar(archivo());

    expect(resultado).toBe('data:image/jpeg;base64,QUJD');
    expect(dimensionesDelLienzo).toEqual({ ancho: 512, alto: 256 });
    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.85);
    expect(contexto.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 512, 256);
  });

  it('rellena el fondo de blanco para que los PNG transparentes no queden negros', async () => {
    await servicio.procesar(archivo('image/png'));
    expect(contexto.fillStyle).toBe('#ffffff');
    expect(contexto.fillRect).toHaveBeenCalledWith(0, 0, 512, 256);
  });

  it('no amplía una imagen pequeña', async () => {
    ImagenFalsa.ancho = 200;
    ImagenFalsa.alto = 100;

    await servicio.procesar(archivo('image/webp'));

    expect(dimensionesDelLienzo).toEqual({ ancho: 200, alto: 100 });
  });

  it('rechaza tipos que no son JPEG, PNG o WebP sin tocar el canvas', async () => {
    await expect(servicio.procesar(archivo('image/gif'))).rejects.toThrow('JPEG, PNG o WebP');
    expect(toDataURL).not.toHaveBeenCalled();
  });

  it('rechaza un resultado de más de 1 MB', async () => {
    toDataURL.mockReturnValue('data:image/jpeg;base64,' + 'A'.repeat(1.5 * 1024 * 1024));
    await expect(servicio.procesar(archivo())).rejects.toThrow('más de 1 MB');
  });

  it('avisa cuando el archivo no es una imagen válida', async () => {
    ImagenFalsa.falla = true;
    const error = await servicio.procesar(archivo()).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorImagen);
    expect(error.message).toContain('no es una imagen válida');
  });

  it('avisa cuando el navegador no puede dibujar en el canvas', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await expect(servicio.procesar(archivo())).rejects.toThrow('no permite preparar la imagen');
  });
});
