import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';

import { EstadoCita } from '../../../core/models/cita';
import { OpcionSelect } from '../../../shared/select/select.component';
import { FiltroCitasAdmin, PaginaCitasAdmin } from '../../../core/models/cita-admin';
import { CitaAdminService } from '../../../core/services/cita-admin.service';
import { TecnicoResponse, TecnicoService } from '../../../core/services/tecnico.service';
import { etiquetaEstadoCita } from '../../../core/utils/estado-cita';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';

const ESTADOS: EstadoCita[] = ['PENDIENTE', 'CONFIRMADA', 'EN_CAMINO', 'EN_PROCESO', 'FINALIZADA', 'CANCELADA'];

@Component({
  selector: 'app-citas-admin',
  standalone: false,
  templateUrl: './citas-admin.component.html',
})
export class CitasAdminComponent implements OnInit, OnDestroy {
  readonly tamanio = 10;
  readonly estados = ESTADOS.map((valor) => ({ valor, etiqueta: etiquetaEstadoCita(valor) }));

  private readonly fb = inject(FormBuilder);

  readonly opcionesEstado: OpcionSelect[] = [{ value: '', label: 'Todos' }, ...this.estados.map((e) => ({ value: e.valor, label: e.etiqueta }))];

  readonly filtros = this.fb.nonNullable.group({
    tecnicoId: '' as string | number,
    estado: '',
    fechaDesde: '',
    fechaHasta: '',
  });

  tecnicos: TecnicoResponse[] = [];
  opcionesTecnico: OpcionSelect[] = [{ value: '', label: 'Todos' }];
  errorTecnicos = false;

  resultado: PaginaCitasAdmin | null = null;
  cargando = true;
  errorCarga: string | null = null;
  errorFiltros: string | null = null;

  /** Filtros ya aplicados: la paginación los conserva aunque el formulario se edite sin buscar. */
  private aplicados: FiltroCitasAdmin = {};
  private consulta?: Subscription;

  constructor(
    private citaService: CitaAdminService,
    private tecnicoService: TecnicoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarTecnicos();
    this.cargar(0);
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }

  get hayPaginas(): boolean {
    return !!this.resultado && this.resultado.totalPaginas > 1;
  }

  get resumen(): string {
    const r = this.resultado;
    if (!r) return '';
    const desde = r.pagina * r.tamanio + 1;
    const hasta = r.pagina * r.tamanio + r.contenido.length;
    return `Mostrando ${desde}–${hasta} de ${r.totalElementos} ${r.totalElementos === 1 ? 'cita' : 'citas'}`;
  }

  buscar(): void {
    const { tecnicoId, estado, fechaDesde, fechaHasta } = this.filtros.getRawValue();
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      this.errorFiltros = 'La fecha inicial no puede ser posterior a la fecha final.';
      return;
    }
    this.errorFiltros = null;
    this.aplicados = {
      tecnicoId: tecnicoId ? Number(tecnicoId) : null,
      estado: estado as EstadoCita | '',
      fechaDesde,
      fechaHasta,
    };
    this.cargar(0);
  }

  limpiar(): void {
    this.filtros.reset();
    this.errorFiltros = null;
    this.aplicados = {};
    this.cargar(0);
  }

  irAPagina(pagina: number): void {
    const r = this.resultado;
    if (!r || pagina < 0 || pagina >= r.totalPaginas || pagina === r.pagina) return;
    this.cargar(pagina);
  }

  cargar(pagina: number): void {
    this.consulta?.unsubscribe();
    this.cargando = true;
    this.errorCarga = null;

    this.consulta = this.citaService
      .listar({ ...this.aplicados, pagina, tamanio: this.tamanio })
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (resultado) => (this.resultado = resultado),
        error: (err) => {
          this.resultado = null;
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar las citas.');
        },
      });
  }

  cargarTecnicos(): void {
    this.errorTecnicos = false;
    this.tecnicoService.obtenerTecnicos().subscribe({
      next: (tecnicos) => {
        this.tecnicos = Array.isArray(tecnicos) ? tecnicos : [];
        this.opcionesTecnico = [
          { value: '', label: 'Todos' },
          ...this.tecnicos.map((t) => ({ value: t.id, label: `${t.nombre} ${t.apellido}` })),
        ];
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorTecnicos = true;
        this.cdr.markForCheck();
      },
    });
  }
}
