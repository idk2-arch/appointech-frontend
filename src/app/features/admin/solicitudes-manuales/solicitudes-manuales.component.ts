import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { finalize } from 'rxjs';

import { SolicitudManualAdmin, SolicitudManualAdminService } from '../../../core/services/solicitud-manual-admin.service';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { enlaceTelefono } from '../../../core/utils/telefono';
import { esperaMasDeHoras, tiempoTranscurrido } from '../../../core/utils/tiempo-transcurrido';
import { construirEnlaceWhatsapp, construirMensajeAdminWhatsapp } from '../../../core/utils/whatsapp';

export type OrdenSolicitudes = 'antiguas' | 'recientes';

/** Horas de espera a partir de las cuales una solicitud se resalta. */
export const HORAS_ESPERA_ALERTA = 24;
const LARGO_DESCRIPCION_LARGA = 140;
const MS_SALIDA_TARJETA = 300;
const MS_REFRESCO_TIEMPOS = 60_000;

/** Lo que dibuja cada tarjeta, ya calculado. */
export interface TarjetaSolicitud {
  solicitud: SolicitudManualAdmin;
  nombreCliente: string;
  tiempo: string;
  urgente: boolean;
  esLarga: boolean;
  enlaceLlamar: string | null;
  enlaceWhatsapp: string | null;
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
import { OpcionSelect } from '../../../shared/select/select.component';

@Component({
  selector: 'app-solicitudes-manuales',
  standalone: false,
  templateUrl: './solicitudes-manuales.component.html',
})
export class SolicitudesManualesComponent implements OnInit, OnDestroy {
  readonly esqueletos = [1, 2, 3, 4];

  solicitudes: SolicitudManualAdmin[] = [];
  tarjetas: TarjetaSolicitud[] = [];
  cargando = true;
  errorCarga: string | null = null;

  busqueda = '';
  readonly opcionesOrden: OpcionSelect[] = [
    { value: 'antiguas', label: 'Más antiguas primero' },
    { value: 'recientes', label: 'Más recientes primero' },
  ];

  orden: OrdenSolicitudes = 'antiguas';

  solicitudAsignando: SolicitudManualAdmin | null = null;
  mensajeExito: string | null = null;

  private saliendo = new Set<number>();
  private descripcionesAbiertas = new Set<number>();
  private temporizadorExito?: ReturnType<typeof setTimeout>;
  private temporizadorTiempos?: ReturnType<typeof setInterval>;

  constructor(
    private solicitudService: SolicitudManualAdminService,
    private cdr: ChangeDetectorRef
  ) {}

  get contador(): string {
    const visibles = this.tarjetas.length;
    const total = this.solicitudes.length;
    const pendientes = total === 1 ? 'pendiente' : 'pendientes';
    return visibles === total ? `${total} ${pendientes}` : `${visibles} de ${total} ${pendientes}`;
  }

  ngOnInit(): void {
    this.cargar();
    this.temporizadorTiempos = setInterval(() => {
      this.actualizarVista();
      this.cdr.markForCheck();
    }, MS_REFRESCO_TIEMPOS);
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizadorExito);
    clearInterval(this.temporizadorTiempos);
  }

  cargar(): void {
    this.cargando = true;
    this.errorCarga = null;

    this.solicitudService
      .listar()
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (solicitudes) => {
          this.solicitudes = Array.isArray(solicitudes) ? solicitudes : [];
          this.actualizarVista();
        },
        error: (err) => {
          this.solicitudes = [];
          this.actualizarVista();
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar las solicitudes por coordinar.');
        },
      });
  }

  buscar(texto: string): void {
    this.busqueda = texto;
    this.actualizarVista();
  }

  cambiarOrden(orden: string): void {
    this.orden = orden === 'recientes' ? 'recientes' : 'antiguas';
    this.actualizarVista();
  }

  estaSaliendo(tarjeta: TarjetaSolicitud): boolean {
    return this.saliendo.has(tarjeta.solicitud.id);
  }

  descripcionAbierta(tarjeta: TarjetaSolicitud): boolean {
    return this.descripcionesAbiertas.has(tarjeta.solicitud.id);
  }

  alternarDescripcion(tarjeta: TarjetaSolicitud): void {
    const id = tarjeta.solicitud.id;
    if (!this.descripcionesAbiertas.delete(id)) this.descripcionesAbiertas.add(id);
  }

  abrirAsignar(solicitud: SolicitudManualAdmin): void {
    this.mensajeExito = null;
    this.solicitudAsignando = solicitud;
  }

  cerrarAsignar(): void {
    this.solicitudAsignando = null;
  }

  /** La tarjeta se desvanece y, al terminar la transición, sale de la lista. */
  onAsignada(solicitud: SolicitudManualAdmin): void {
    this.solicitudAsignando = null;
    this.saliendo.add(solicitud.id);
    this.mostrarExito(`La visita de ${solicitud.clienteNombre} ${solicitud.clienteApellido} quedó agendada.`);

    setTimeout(() => {
      this.solicitudes = this.solicitudes.filter((s) => s.id !== solicitud.id);
      this.saliendo.delete(solicitud.id);
      this.actualizarVista();
      this.cdr.markForCheck();
    }, MS_SALIDA_TARJETA);
  }

  private mostrarExito(mensaje: string): void {
    this.mensajeExito = mensaje;
    clearTimeout(this.temporizadorExito);
    this.temporizadorExito = setTimeout(() => {
      this.mensajeExito = null;
      this.cdr.markForCheck();
    }, 8000);
  }

  private actualizarVista(): void {
    const ahora = new Date();
    const consulta = normalizar(this.busqueda.trim());
    const signo = this.orden === 'antiguas' ? 1 : -1;

    this.tarjetas = this.solicitudes
      .filter(
        (s) =>
          !consulta ||
          normalizar(`${s.clienteNombre} ${s.clienteApellido} ${s.direccionServicio} ${s.descripcionProblema}`).includes(consulta)
      )
      .sort((a, b) => signo * a.creadaEn.localeCompare(b.creadaEn))
      .map((s) => this.aTarjeta(s, ahora));
  }

  private aTarjeta(solicitud: SolicitudManualAdmin, ahora: Date): TarjetaSolicitud {
    const nombreCliente = `${solicitud.clienteNombre} ${solicitud.clienteApellido}`.trim();
    return {
      solicitud,
      nombreCliente,
      tiempo: tiempoTranscurrido(solicitud.creadaEn, ahora),
      urgente: esperaMasDeHoras(solicitud.creadaEn, ahora, HORAS_ESPERA_ALERTA),
      esLarga: solicitud.descripcionProblema.length > LARGO_DESCRIPCION_LARGA,
      enlaceLlamar: solicitud.telefono ? enlaceTelefono(solicitud.telefono) : null,
      enlaceWhatsapp: construirEnlaceWhatsapp(
        solicitud.telefono,
        construirMensajeAdminWhatsapp({ nombreCliente, especialidad: solicitud.especialidadNombre })
      ),
    };
  }
}
