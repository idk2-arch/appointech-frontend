import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

/** Acciones propias del navegador (redirigir, imprimir) detrás de un servicio para poder probarlas. */
@Injectable({ providedIn: 'root' })
export class NavegadorService {
  constructor(@Inject(DOCUMENT) private documento: Document) {}

  /** Solo sigue direcciones http(s); devuelve false si la dirección no es válida o es de otro tipo. */
  redirigir(url: string): boolean {
    try {
      const destino = new URL(url);
      if (destino.protocol !== 'https:' && destino.protocol !== 'http:') return false;
      this.documento.location.assign(destino.href);
      return true;
    } catch {
      return false;
    }
  }

  recargar(): void {
    this.documento.location.reload();
  }

  imprimir(): void {
    this.documento.defaultView?.print();
  }
}
