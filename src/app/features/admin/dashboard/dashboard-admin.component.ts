import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';

import type { RangoSolicitado } from '../../../core/models/metricas';
import { MetricasService } from '../../../core/services/metricas.service';
import { TRAZO_ESTRELLA } from '../../../core/utils/calificacion';
import { formatearCantidad, formatearPromedio } from '../../../core/utils/formato-metricas';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { PresetRango, rangoDePreset, validarRango } from '../../../core/utils/rango-metricas';
import { ToastService } from '../../../shared/toast/toast.service';
import { construirVista, MIN_CALIFICACIONES_REPRESENTATIVAS, RADIO_ANILLO, VistaMetricas } from './vista-metricas';

/** Panel de métricas del administrador: una cuadrícula bento con el estado del negocio en un rango de fechas. */
@Component({
  selector: 'app-dashboard-admin',
  standalone: false,
  templateUrl: './dashboard-admin.component.html',
})
export class DashboardAdminComponent implements OnInit, OnDestroy {
  readonly presets: { id: PresetRango; etiqueta: string }[] = [
    { id: 'ultimos30', etiqueta: 'Últimos 30 días' },
    { id: 'esteMes', etiqueta: 'Este mes' },
    { id: 'ultimos90', etiqueta: 'Últimos 90 días' },
    { id: 'esteAnio', etiqueta: 'Este año' },
    { id: 'personalizado', etiqueta: 'Personalizado' },
  ];

  readonly esqueletos = [
    { col: 2, fila: 2 },
    { col: 2, fila: 1 },
    { col: 1, fila: 1 },
    { col: 1, fila: 1 },
    { col: 2, fila: 2 },
    { col: 2, fila: 1 },
    { col: 1, fila: 1 },
    { col: 1, fila: 1 },
  ];

  readonly cantidad = formatearCantidad;
  readonly promedio = formatearPromedio;
  readonly minimoRepresentativo = MIN_CALIFICACIONES_REPRESENTATIVAS;
  readonly trazoEstrella = TRAZO_ESTRELLA;
  readonly radioAnillo = RADIO_ANILLO;

  private readonly fb = inject(FormBuilder);
  readonly personalizado = this.fb.nonNullable.group({ desde: [''], hasta: [''] });

  preset: PresetRango = 'ultimos30';
  vista: VistaMetricas | null = null;
  cargando = true;
  errorCarga: string | null = null;
  /** Error del rango elegido: de la validación local o del servidor (400). */
  errorRango: string | null = null;

  private ultimoRango: RangoSolicitado = {};
  private consulta?: Subscription;

  constructor(
    private metricasService: MetricasService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.consultar({});
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }

  /** Elegir un rango rápido consulta de inmediato; "Personalizado" espera a que se elijan las dos fechas. */
  seleccionar(preset: PresetRango): void {
    this.preset = preset;
    this.errorRango = null;
    if (preset !== 'personalizado') this.consultar(rangoDePreset(preset, new Date()));
  }

  aplicarPersonalizado(): void {
    const { desde, hasta } = this.personalizado.getRawValue();
    this.errorRango = validarRango(desde, hasta);
    if (this.errorRango) return;
    this.consultar({ desde, hasta });
  }

  /** Reintenta con el último rango pedido. */
  cargar(): void {
    this.consultar(this.ultimoRango);
  }

  private consultar(rango: RangoSolicitado): void {
    this.consulta?.unsubscribe();
    this.ultimoRango = rango;
    this.cargando = true;
    this.errorCarga = null;
    this.vista = null;

    this.consulta = this.metricasService
      .obtener(rango)
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (metricas) => (this.vista = construirVista(metricas)),
        error: (err) => {
          const mensaje = obtenerMensajeError(err, 'No fue posible cargar las métricas.');
          // Un 400 es del rango elegido (formato, orden o más de 366 días): se explica bajo el selector.
          if (this.preset === 'personalizado') this.errorRango = mensaje;
          this.errorCarga = mensaje;
          this.toast.error('No se pudieron cargar las métricas', mensaje);
        },
      });
  }
}
