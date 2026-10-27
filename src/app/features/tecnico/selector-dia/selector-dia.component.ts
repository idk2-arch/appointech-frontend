import { Component, EventEmitter, Input, Output } from '@angular/core';

import { aFechaIso, hoyIso, parsearFechaLocal } from '../../../core/utils/fecha-local';

/** Selector de un día (YYYY-MM-DD): anterior, siguiente, calendario y "Hoy". */
@Component({
  selector: 'app-selector-dia',
  standalone: false,
  templateUrl: './selector-dia.component.html',
})
export class SelectorDiaComponent {
  @Input() fecha = hoyIso();
  @Input() deshabilitado = false;
  @Output() fechaCambio = new EventEmitter<string>();

  readonly hoy = hoyIso();

  get esHoy(): boolean {
    return this.fecha === this.hoy;
  }

  moverDias(dias: number): void {
    const dia = parsearFechaLocal(this.fecha);
    dia.setDate(dia.getDate() + dias);
    this.emitir(aFechaIso(dia));
  }

  irAHoy(): void {
    this.emitir(this.hoy);
  }

  alElegir(valor: string): void {
    if (valor) this.emitir(valor);
  }

  private emitir(fecha: string): void {
    if (fecha !== this.fecha) this.fechaCambio.emit(fecha);
  }
}
