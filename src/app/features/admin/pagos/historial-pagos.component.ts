import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';

import { EstadoPago, MetodoPago } from '../../../core/models/pago';
import { FilaPagoAdmin, FiltroPagosAdmin } from '../../../core/models/pago-admin';
import { PagoAdminService } from '../../../core/services/pago-admin.service';
import { etiquetaEstadoPago, etiquetaMetodoPago } from '../../../core/utils/estado-pago';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { OpcionSelect } from '../../../shared/select/select.component';
import { ToastService } from '../../../shared/toast/toast.service';

export const PAGOS_POR_PAGINA = 20;
const ESTADOS: EstadoPago[] = ['PENDIENTE', 'PAGADO', 'FALLIDO'];
const METODOS: MetodoPago[] = ['EFECTIVO', 'EN_LINEA'];
/** Un identificador: entero positivo, sin signos ni decimales. */
const SOLO_IDENTIFICADOR = /^[1-9]\d*$/;

/** Historial de pagos de todas las citas, con filtros y paginación en el servidor. */
@Component({
  selector: 'app-historial-pagos',
  standalone: false,
  templateUrl: './historial-pagos.component.html',
})
export class HistorialPagosComponent implements OnInit, OnDestroy {
  readonly esqueletos = [1, 2, 3, 4];
  readonly tamano = PAGOS_POR_PAGINA;
  readonly opcionesEstado: OpcionSelect[] = [{ value: '', label: 'Todos' }, ...ESTADOS.map((e) => ({ value: e, label: etiquetaEstadoPago(e) }))];
  readonly opcionesMetodo: OpcionSelect[] = [{ value: '', label: 'Todos' }, ...METODOS.map((m) => ({ value: m, label: etiquetaMetodoPago(m) }))];

  private readonly fb = inject(FormBuilder);

  readonly filtros = this.fb.nonNullable.group({
    estado: [''],
    metodo: [''],
    desde: [''],
    hasta: [''],
    clienteId: ['', [Validators.pattern(SOLO_IDENTIFICADOR)]],
    tecnicoId: ['', [Validators.pattern(SOLO_IDENTIFICADOR)]],
  });

  pagos: FilaPagoAdmin[] = [];
  total = 0;
  pagina = 0;
  cargando = true;
  errorCarga: string | null = null;
  errorFiltros: string | null = null;

  /** Filtros ya aplicados: la paginación los conserva aunque el formulario se edite sin aplicar. */
  private aplicados: FiltroPagosAdmin = {};
  private consulta?: Subscription;

  constructor(
    private pagoService: PagoAdminService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  /** Con fechas el servidor solo devuelve pagos ya realizados (los pendientes no tienen fecha de pago). */
  get hayFechas(): boolean {
    const { desde, hasta } = this.filtros.getRawValue();
    return !!desde || !!hasta;
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }

  metodoDe(fila: FilaPagoAdmin): string {
    return fila.metodo ? etiquetaMetodoPago(fila.metodo) : '—';
  }

  aplicar(): void {
    const { estado, metodo, desde, hasta, clienteId, tecnicoId } = this.filtros.getRawValue();
    if (this.filtros.invalid) {
      this.filtros.markAllAsTouched();
      this.errorFiltros = 'Revisa el cliente y el técnico: deben ser números enteros positivos.';
      return;
    }
    if (desde && hasta && desde > hasta) {
      this.errorFiltros = 'La fecha inicial no puede ser posterior a la fecha final.';
      return;
    }
    this.errorFiltros = null;
    this.aplicados = {
      estado: estado as EstadoPago | '',
      metodo: metodo as MetodoPago | '',
      clienteId: clienteId ? Number.parseInt(clienteId, 10) : null,
      tecnicoId: tecnicoId ? Number.parseInt(tecnicoId, 10) : null,
      desde,
      hasta,
    };
    this.pagina = 0;
    this.cargar();
  }

  limpiar(): void {
    this.filtros.reset();
    this.errorFiltros = null;
    this.aplicados = {};
    this.pagina = 0;
    this.cargar();
  }

  irAPagina(pagina: number): void {
    if (pagina < 0 || pagina === this.pagina) return;
    this.pagina = pagina;
    this.cargar();
  }

  cargar(): void {
    this.consulta?.unsubscribe();
    this.cargando = true;
    this.errorCarga = null;

    this.consulta = this.pagoService
      .listar({ ...this.aplicados, page: this.pagina, size: this.tamano })
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: ({ filas, total }) => {
          this.pagos = filas;
          this.total = total;
        },
        error: (err) => {
          this.pagos = [];
          this.total = 0;
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar el historial de pagos.');
          this.toast.error('No se pudo cargar el historial de pagos', this.errorCarga);
        },
      });
  }
}
