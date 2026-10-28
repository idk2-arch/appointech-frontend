import { Injectable } from '@angular/core';

import { FOTO_CALIDAD, FOTO_LADO_MAXIMO_PX, FOTO_TIPO_SALIDA } from '../config/foto.config';
import { dimensionesReducidas, ErrorImagen, validarTamanioFinal, validarTipoImagen } from '../utils/imagen';

/**
 * Prepara una foto elegida por la persona: valida el tipo, la reduce con un canvas
 * (lado mayor ≤ FOTO_LADO_MAXIMO_PX), la convierte a JPEG y devuelve una data URL base64.
 * Lanza ErrorImagen con un mensaje en español cuando no se puede usar.
 */
@Injectable({ providedIn: 'root' })
export class ProcesadorImagenService {
  async procesar(archivo: File): Promise<string> {
    validarTipoImagen(archivo.type);

    const imagen = await this.cargarImagen(await this.leer(archivo));
    const { ancho, alto } = dimensionesReducidas(imagen.naturalWidth, imagen.naturalHeight, FOTO_LADO_MAXIMO_PX);

    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const contexto = lienzo.getContext('2d');
    if (!contexto) throw new ErrorImagen('Tu navegador no permite preparar la imagen.');

    // El JPEG no tiene transparencia: un PNG con fondo transparente quedaría negro sin este relleno.
    contexto.fillStyle = '#ffffff';
    contexto.fillRect(0, 0, ancho, alto);
    contexto.drawImage(imagen, 0, 0, ancho, alto);

    const resultado = lienzo.toDataURL(FOTO_TIPO_SALIDA, FOTO_CALIDAD);
    validarTamanioFinal(resultado);
    return resultado;
  }

  private leer(archivo: File): Promise<string> {
    return new Promise((resolver, rechazar) => {
      const lector = new FileReader();
      lector.onload = () => resolver(String(lector.result));
      lector.onerror = () => rechazar(new ErrorImagen('No pudimos leer el archivo. Intenta con otra imagen.'));
      lector.readAsDataURL(archivo);
    });
  }

  private cargarImagen(origen: string): Promise<HTMLImageElement> {
    return new Promise((resolver, rechazar) => {
      const imagen = new Image();
      imagen.onload = () => resolver(imagen);
      imagen.onerror = () => rechazar(new ErrorImagen('El archivo no es una imagen válida.'));
      imagen.src = origen;
    });
  }
}
