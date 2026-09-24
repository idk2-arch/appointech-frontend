import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';

import { EspecialidadResponse, TecnicoResponse, TecnicoService } from '../../../../core/services/tecnico.service';

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
    }).subscribe({
      next: ({ tecnicos, catalogo }) => {
        this.tecnicos = tecnicos;
        this.catalogo = catalogo;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargando = false;
        this.errorCarga = 'No fue posible cargar los técnicos y sus especialidades.';
        this.cdr.markForCheck();
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
}
