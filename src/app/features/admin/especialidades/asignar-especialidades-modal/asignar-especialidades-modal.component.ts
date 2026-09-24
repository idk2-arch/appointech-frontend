import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

import {
  EspecialidadResponse,
  TecnicoResponse,
  TecnicoService,
} from '../../../../core/services/tecnico.service';

@Component({
  selector: 'app-asignar-especialidades-modal',
  standalone: false,
  templateUrl: './asignar-especialidades-modal.component.html',
})
export class AsignarEspecialidadesModalComponent implements OnChanges {
  @Input() tecnico: TecnicoResponse | null = null;
  @Input() catalogo: EspecialidadResponse[] = [];
  @Output() cerrar = new EventEmitter<void>();
  @Output() actualizado = new EventEmitter<void>();

  seleccionIds = new Set<number>();
  cargando = false;
  errorMensaje: string | null = null;

  constructor(
    private tecnicoService: TecnicoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tecnico'] && this.tecnico) {
      this.errorMensaje = null;
      this.cargando = false;
      this.seleccionIds = new Set(this.tecnico.especialidades.map((e) => e.id));
    }
  }

  estaSeleccionada(id: number): boolean {
    return this.seleccionIds.has(id);
  }

  alternar(id: number): void {
    if (this.seleccionIds.has(id)) {
      this.seleccionIds.delete(id);
    } else {
      this.seleccionIds.add(id);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.tecnico && !this.cargando) this.onCancelar();
  }

  onCancelar(): void {
    this.cerrar.emit();
  }

  onGuardar(): void {
    if (!this.tecnico) return;

    this.cargando = true;
    this.errorMensaje = null;

    this.tecnicoService
      .asignarEspecialidades(this.tecnico.id, { especialidadIds: Array.from(this.seleccionIds) })
      .subscribe({
        next: () => {
          this.cargando = false;
          this.actualizado.emit();
          this.cdr.markForCheck();
        },
        error: () => {
          this.cargando = false;
          this.errorMensaje = 'No fue posible guardar las especialidades. Intenta de nuevo.';
          this.cdr.markForCheck();
        },
      });
  }
}
