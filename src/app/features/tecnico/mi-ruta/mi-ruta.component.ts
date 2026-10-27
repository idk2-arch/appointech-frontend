import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, Subscription } from 'rxjs';

import { ParadaRuta, RutaDelDia } from '../../../core/models/tecnico-agenda';
import { RutaService } from '../../../core/services/ruta.service';
import { hoyIso } from '../../../core/utils/fecha-local';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { enlaceTelefono } from '../../../core/utils/telefono';

const MENSAJE_SIN_UBICACION_BASE =
  'Tu ubicación base no está configurada; pídele al administrador que la cargue.';

@Component({
  selector: 'app-mi-ruta',
  standalone: false,
  templateUrl: './mi-ruta.component.html',
})
export class MiRutaComponent implements OnInit, OnDestroy {
  fecha = hoyIso();
  ruta: RutaDelDia | null = null;
  cargando = true;
  errorCarga: string | null = null;
  /** 'base': falta la ubicación base (se resuelve con el administrador); no sirve reintentar. */
  tipoError: 'base' | 'general' | null = null;

  readonly enlaceTelefono = enlaceTelefono;

  private consulta?: Subscription;

  constructor(
    private rutaService: RutaService,
    private cdr: ChangeDetectorRef
  ) {}

  get paradasTarde(): ParadaRuta[] {
    return this.ruta?.paradas.filter((p) => !p.alcanzaATiempo) ?? [];
  }

  ngOnInit(): void {
    this.cargarRuta();
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }

  cambiarFecha(fecha: string): void {
    this.fecha = fecha;
    this.cargarRuta();
  }

  /** La ruta no se guarda: se recalcula en cada petición (al entrar, al cambiar el día y al actualizar). */
  cargarRuta(): void {
    this.consulta?.unsubscribe();
    this.cargando = true;
    this.errorCarga = null;
    this.tipoError = null;
    this.ruta = null;

    this.consulta = this.rutaService
      .obtenerRuta(this.fecha)
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (ruta) => {
          this.ruta = { ...ruta, paradas: Array.isArray(ruta?.paradas) ? ruta.paradas : [] };
        },
        error: (err) => this.manejarError(err),
      });
  }

  private manejarError(err: unknown): void {
    if (err instanceof HttpErrorResponse && err.status === 409) {
      const mensaje = obtenerMensajeError(err, '');
      // 409 por una cita con coordenadas faltantes o inválidas: el mensaje del backend
      // menciona la cita. Cualquier otro 409 se interpreta como "sin ubicación base".
      if (/cita/i.test(mensaje)) {
        this.errorCarga = mensaje;
        this.tipoError = 'general';
      } else {
        this.errorCarga = MENSAJE_SIN_UBICACION_BASE;
        this.tipoError = 'base';
      }
      return;
    }
    this.errorCarga = obtenerMensajeError(err, 'No fue posible calcular tu ruta.');
    this.tipoError = 'general';
  }
}
