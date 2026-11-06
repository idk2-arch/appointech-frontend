import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { finalize, Subscription } from 'rxjs';

import { AlertaAdmin, AlertasAdminService } from '../../../core/services/alertas-admin.service';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { nombreCompleto } from '../../../core/utils/nombre-persona';
import { enlaceTelefono } from '../../../core/utils/telefono';
import { ToastService } from '../../../shared/toast/toast.service';

/** Solicitudes que quedaron sin técnico, de la más antigua a la más reciente. */
@Component({
  selector: 'app-alertas-admin',
  standalone: false,
  templateUrl: './alertas-admin.component.html',
})
export class AlertasAdminComponent implements OnInit, OnDestroy {
  readonly esqueletos = [1, 2, 3];
  readonly enlaceTelefono = enlaceTelefono;

  alertas: AlertaAdmin[] = [];
  total = 0;
  cargando = true;
  errorCarga: string | null = null;

  private consulta?: Subscription;

  constructor(
    private alertasService: AlertasAdminService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  get contador(): string {
    return this.total === 1 ? '1 solicitud sin técnico' : `${this.total} solicitudes sin técnico`;
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }

  /** Vuelve a pedir las alertas; también actualiza el indicador del menú. */
  cargar(): void {
    this.consulta?.unsubscribe();
    this.cargando = true;
    this.errorCarga = null;

    this.consulta = this.alertasService
      .obtener()
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: ({ total, alertas }) => {
          this.total = total;
          this.alertas = alertas;
        },
        error: (err) => {
          this.alertas = [];
          this.total = 0;
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar las alertas.');
          this.toast.error('No se pudieron cargar las alertas', this.errorCarga);
        },
      });
  }

  cliente(alerta: AlertaAdmin): string {
    return nombreCompleto(alerta.clienteNombre, alerta.clienteApellido);
  }
}
