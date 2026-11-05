import { Component } from '@angular/core';

import { ToastActivo, ToastService } from './toast.service';

/**
 * Pila de avisos abajo a la derecha. Se monta una sola vez en el componente raíz; los avisos van en modo
 * `inline` para apilarse sin pelearse por la misma esquina.
 */
@Component({
  selector: 'app-toast-contenedor',
  standalone: false,
  template: `
    <div class="toast-contenedor" role="region" aria-label="Avisos">
      @for (aviso of servicio.visibles(); track aviso.id) {
        <app-toast
          [inline]="true"
          [tipo]="aviso.tipo"
          [title]="aviso.titulo"
          [description]="aviso.descripcion"
          [actionLabel]="aviso.accion?.etiqueta ?? ''"
          [duration]="aviso.duracion"
          [closeButton]="true"
          (accion)="ejecutar(aviso)"
          (cerrado)="servicio.cerrar(aviso.id)"
        ></app-toast>
      }
    </div>
  `,
})
export class ToastContenedorComponent {
  constructor(readonly servicio: ToastService) {}

  ejecutar(aviso: ToastActivo): void {
    aviso.accion?.accion();
  }
}
