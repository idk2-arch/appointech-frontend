import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Pago de una cita finalizada vista por su técnico: costo final, confirmación del efectivo y comprobante. */
@Component({
  selector: 'app-pago-cita-tecnico',
  standalone: false,
  templateUrl: './pago-cita-tecnico.component.html',
})
export class PagoCitaTecnicoComponent {
  readonly citaId: number;

  constructor(ruta: ActivatedRoute) {
    this.citaId = Number(ruta.snapshot.paramMap.get('id'));
  }
}
