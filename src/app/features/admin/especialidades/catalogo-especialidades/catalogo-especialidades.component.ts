import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';

import { EspecialidadAdminResponse, EspecialidadService } from '../../../../core/services/especialidad.service';
import { obtenerMensajeError } from '../../../../core/utils/manejo-errores';

@Component({
  selector: 'app-catalogo-especialidades',
  standalone: false,
  templateUrl: './catalogo-especialidades.component.html',
})
export class CatalogoEspecialidadesComponent implements OnInit {
  especialidades: EspecialidadAdminResponse[] = [];
  cargando = true;
  errorCarga: string | null = null;

  mostrarModalCrear = false;
  especialidadParaCambiarEstado: EspecialidadAdminResponse | null = null;
  cargandoEstado = false;

  constructor(
    private especialidadService: EspecialidadService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarCatalogo();
  }

  cargarCatalogo(mostrarCargando = true): void {
    if (mostrarCargando) {
      this.cargando = true;
    }
    this.errorCarga = null;

    this.especialidadService
      .obtenerCatalogoAdmin()
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
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar el catálogo de especialidades.');
        },
      });
  }

  abrirModalCrear(): void {
    this.mostrarModalCrear = true;
  }

  cerrarModalCrear(): void {
    this.mostrarModalCrear = false;
  }

  onEspecialidadCreada(): void {
    this.mostrarModalCrear = false;
    this.cargarCatalogo(false);
  }

  solicitarCambioEstado(especialidad: EspecialidadAdminResponse): void {
    this.especialidadParaCambiarEstado = especialidad;
  }

  cancelarCambioEstado(): void {
    this.especialidadParaCambiarEstado = null;
  }

  confirmarCambioEstado(): void {
    const especialidad = this.especialidadParaCambiarEstado;
    if (!especialidad) return;

    this.cargandoEstado = true;
    const nuevoEstado = !especialidad.activo;

    this.especialidadService.cambiarEstadoEspecialidad(especialidad.id, { activo: nuevoEstado }).subscribe({
      next: () => {
        this.cargandoEstado = false;
        this.especialidadParaCambiarEstado = null;
        this.cargarCatalogo(false);
      },
      error: () => {
        this.cargandoEstado = false;
        this.especialidadParaCambiarEstado = null;
        this.errorCarga = `No fue posible ${nuevoEstado ? 'activar' : 'desactivar'} "${especialidad.nombre}". Intenta de nuevo.`;
        this.cdr.markForCheck();
      },
    });
  }
}
