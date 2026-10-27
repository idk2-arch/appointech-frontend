import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';

import {
  EspecialidadResponse,
  TecnicoResponse,
  TecnicoService,
} from '../../../../core/services/tecnico.service';
import { obtenerMensajeError } from '../../../../core/utils/manejo-errores';

@Component({
  selector: 'app-asignar-tecnicos',
  standalone: false,
  templateUrl: './asignar-tecnicos.component.html',
})
export class AsignarTecnicosComponent implements OnInit {
  tecnicos: TecnicoResponse[] = [];
  catalogo: EspecialidadResponse[] = [];
  cargando = true;
  errorCarga: string | null = null;

  tecnicoAsignando: TecnicoResponse | null = null;
  tecnicoEditando: TecnicoResponse | null = null;
  mensajeExito: string | null = null;

  constructor(
    private tecnicoService: TecnicoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(mostrarCargando = true): void {
    if (mostrarCargando) {
      this.cargando = true;
    }
    this.errorCarga = null;

    forkJoin({
      tecnicos: this.tecnicoService.obtenerTecnicos(),
      catalogo: this.tecnicoService.obtenerEspecialidades(),
    })
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: ({ tecnicos, catalogo }) => {
          this.tecnicos = Array.isArray(tecnicos) ? tecnicos : [];
          this.catalogo = Array.isArray(catalogo) ? catalogo : [];
        },
        error: (err) => {
          this.tecnicos = [];
          this.catalogo = [];
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar los técnicos y sus especialidades.');
        },
      });
  }

  abrirAsignar(tecnico: TecnicoResponse): void {
    this.tecnicoAsignando = tecnico;
  }

  cerrarAsignar(): void {
    this.tecnicoAsignando = null;
  }

  onEspecialidadesActualizadas(): void {
    this.tecnicoAsignando = null;
    this.cargarDatos(false);
  }

  abrirEdicion(tecnico: TecnicoResponse): void {
    this.mensajeExito = null;
    this.tecnicoEditando = tecnico;
  }

  cerrarEdicion(): void {
    this.tecnicoEditando = null;
  }

  onTecnicoGuardado(tecnico: TecnicoResponse): void {
    this.tecnicoEditando = null;
    this.mensajeExito = `Los datos de ${tecnico.nombre} ${tecnico.apellido} se guardaron correctamente.`;
    this.cargarDatos(false);
    this.cdr.markForCheck();
  }
}
