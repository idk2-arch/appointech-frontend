import { Component, EventEmitter, Input, Output } from '@angular/core';

/** "Mostrando 1–10 de 23" con Anterior / Siguiente para listados paginados por el servidor (página desde 0). */
@Component({
  selector: 'app-paginacion',
  standalone: false,
  template: `
    @if (total > 0) {
      <nav class="mt-4 flex flex-wrap items-center justify-between gap-3" [attr.aria-label]="'Paginación de ' + plural">
        <p class="fs-cuerpo text-white/60" aria-live="polite">Mostrando {{ desde }}–{{ hasta }} de {{ total }} {{ total === 1 ? singular : plural }}</p>
        <div class="flex gap-2">
          <button
            type="button"
            (click)="cambio.emit(pagina - 1)"
            [disabled]="!hayAnterior"
            class="boton-fila-admin px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            (click)="cambio.emit(pagina + 1)"
            [disabled]="!haySiguiente"
            class="boton-fila-admin px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </nav>
    }
  `,
})
export class PaginacionComponent {
  @Input() pagina = 0;
  @Input() tamano = 10;
  /** Filas que cumplen el filtro, de todas las páginas. */
  @Input() total = 0;
  /** Filas que trae la página actual. */
  @Input() cantidad = 0;
  @Input() singular = 'resultado';
  @Input() plural = 'resultados';
  @Output() cambio = new EventEmitter<number>();

  get desde(): number {
    return this.pagina * this.tamano + 1;
  }

  get hasta(): number {
    return this.pagina * this.tamano + this.cantidad;
  }

  get hayAnterior(): boolean {
    return this.pagina > 0;
  }

  get haySiguiente(): boolean {
    return (this.pagina + 1) * this.tamano < this.total;
  }
}
