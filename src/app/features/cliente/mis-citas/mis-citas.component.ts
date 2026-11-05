import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { finalize, Subscription } from 'rxjs';

import { CitaResumen, EstadoCita } from '../../../core/models/cita';
import { Pago } from '../../../core/models/pago';
import { OpcionSelect } from '../../../shared/select/select.component';
import { CitaClienteService } from '../../../core/services/cita-cliente.service';
import { etiquetaEstadoCita } from '../../../core/utils/estado-cita';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { tieneCostoFinal } from '../../../core/utils/pago';

const ESTADOS: EstadoCita[] = ['PENDIENTE', 'CONFIRMADA', 'EN_CAMINO', 'EN_PROCESO', 'FINALIZADA', 'CANCELADA'];

@Component({
  selector: 'app-mis-citas',
  standalone: false,
  templateUrl: './mis-citas.component.html',
})
export class MisCitasComponent implements OnInit, OnDestroy {
  readonly estados = ESTADOS.map((valor) => ({ valor, etiqueta: etiquetaEstadoCita(valor) }));

  readonly opcionesFiltro: OpcionSelect[] = [{ value: '', label: 'Todos' }, ...this.estados.map((e) => ({ value: e.valor, label: e.etiqueta }))];

  citas: CitaResumen[] = [];
  filtro: EstadoCita | '' = '';
  cargando = true;
  errorCarga: string | null = null;

  /** Pagos ya consultados al expandir una tarjeta: el listado no los trae y no se piden de antemano. */
  private readonly pagos = new Map<number, Pago>();
  private consulta?: Subscription;

  constructor(
    private citaService: CitaClienteService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }

  get citasVisibles(): CitaResumen[] {
    return this.filtro ? this.citas.filter((c) => c.estado === this.filtro) : this.citas;
  }

  recordarPago(pago: Pago): void {
    this.pagos.set(pago.citaId, pago);
  }

  /** El pago de la cita, solo si ya se conoce y tiene costo final (el listado no lo incluye). */
  pagoConCosto(citaId: number): Pago | null {
    const pago = this.pagos.get(citaId) ?? null;
    return tieneCostoFinal(pago) ? pago : null;
  }

  cambiarFiltro(valor: string): void {
    this.filtro = valor as EstadoCita | '';
  }

  cargar(): void {
    this.consulta?.unsubscribe();
    this.cargando = true;
    this.errorCarga = null;

    this.consulta = this.citaService
      .listar()
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (citas) => {
          this.citas = Array.isArray(citas) ? citas : [];
        },
        error: (err) => {
          this.citas = [];
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar tus citas.');
        },
      });
  }
}
