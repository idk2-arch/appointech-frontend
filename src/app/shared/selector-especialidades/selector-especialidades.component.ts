import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl } from '@angular/forms';

import type { EspecialidadResponse } from '../../core/services/tecnico.service';

let contador = 0;

/** Casillas grandes para elegir varias especialidades; el valor del control es la lista de ids. */
@Component({
  selector: 'app-selector-especialidades',
  standalone: false,
  templateUrl: './selector-especialidades.component.html',
})
export class SelectorEspecialidadesComponent {
  @Input({ required: true }) control!: FormControl<number[] | null>;
  @Input() catalogo: EspecialidadResponse[] = [];
  @Input() cargando = false;
  @Input() error: string | null = null;
  @Output() reintentar = new EventEmitter<void>();

  readonly id = `especialidades-${++contador}`;

  get seleccion(): number[] {
    return this.control.value ?? [];
  }

  estaElegida(id: number): boolean {
    return this.seleccion.includes(id);
  }

  alternar(id: number): void {
    const nueva = this.estaElegida(id) ? this.seleccion.filter((x) => x !== id) : [...this.seleccion, id];
    this.control.setValue(nueva);
    this.control.markAsDirty();
  }
}
