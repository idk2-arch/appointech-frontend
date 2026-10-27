import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { finalize } from 'rxjs';

import { EspecialidadResponse, TecnicoService } from '../../../../core/services/tecnico.service';
import { obtenerMensajeError } from '../../../../core/utils/manejo-errores';

@Component({
  selector: 'app-elegir-especialidad',
  standalone: false,
  templateUrl: './elegir-especialidad.component.html',
})
export class ElegirEspecialidadComponent implements OnInit {
  @Input() seleccionadaId: number | null = null;
  @Output() seleccionar = new EventEmitter<EspecialidadResponse>();

  especialidades: EspecialidadResponse[] = [];
  cargando = true;
  errorCarga: string | null = null;

  constructor(
    private tecnicoService: TecnicoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarEspecialidades();
  }

  cargarEspecialidades(): void {
    this.cargando = true;
    this.errorCarga = null;

    this.tecnicoService
      .obtenerEspecialidades()
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (especialidades) => {
          this.especialidades = Array.isArray(especialidades) ? especialidades : [];
        },
        error: (err) => {
          this.especialidades = [];
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar las especialidades.');
        },
      });
  }
}
