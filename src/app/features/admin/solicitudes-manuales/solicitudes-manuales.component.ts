import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { finalize, Subscription } from 'rxjs';

import { EstadoCita, MotivoSolicitudEspecial } from '../../../core/models/cita';
import { AlertasAdminService } from '../../../core/services/alertas-admin.service';
import { SolicitudManualAdmin, SolicitudManualAdminService } from '../../../core/services/solicitud-manual-admin.service';
import { TecnicoService } from '../../../core/services/tecnico.service';
import { etiquetaEstadoCita } from '../../../core/utils/estado-cita';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { etiquetaMotivoSolicitud } from '../../../core/utils/motivo-solicitud-especial';
import { enlaceTelefono } from '../../../core/utils/telefono';
import { esperaMasDeHoras, tiempoTranscurrido } from '../../../core/utils/tiempo-transcurrido';
import { construirEnlaceWhatsapp, construirMensajeAdminWhatsapp } from '../../../core/utils/whatsapp';
import { OpcionSelect } from '../../../shared/select/select.component';
import { ToastService } from '../../../shared/toast/toast.service';

export type OrdenSolicitudes = 'antiguas' | 'recientes';

/** Horas de espera a partir de las cuales una solicitud se resalta. */
export const HORAS_ESPERA_ALERTA = 24;
export const SOLICITUDES_POR_PAGINA = 10;
const LARGO_DESCRIPCION_LARGA = 140;
const MS_SALIDA_TARJETA = 300;
const MS_REFRESCO_TIEMPOS = 60_000;
const ESTADOS: EstadoCita[] = ['PENDIENTE', 'CONFIRMADA', 'EN_CAMINO', 'EN_PROCESO', 'FINALIZADA', 'CANCELADA'];
const MOTIVOS: MotivoSolicitudEspecial[] = ['FUERA_DE_COBERTURA', 'SIN_TECNICOS_ESPECIALIDAD', 'SIN_HORARIOS'];

/** Lo que dibuja cada tarjeta, ya calculado. */
export interface TarjetaSolicitud {
  solicitud: SolicitudManualAdmin;
  nombreCliente: string;
  tiempo: string;
  urgente: boolean;
  esLarga: boolean;
  /** Solo las pendientes se pueden asignar. */
  asignable: boolean;
  enlaceLlamar: string | null;
  enlaceWhatsapp: string | null;
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

@Component({
  selector: 'app-solicitudes-manuales',
  standalone: false,
  templateUrl: './solicitudes-manuales.component.html',
})
export class SolicitudesManualesComponent implements OnInit, OnDestroy {
  readonly esqueletos = [1, 2, 3, 4];
  readonly tamano = SOLICITUDES_POR_PAGINA;

  solicitudes: SolicitudManualAdmin[] = [];
  tarjetas: TarjetaSolicitud[] = [];
  cargando = true;
  errorCarga: string | null = null;

  /** Filtros que viajan al servidor; cambiar uno vuelve a la primera página. */
  motivo: MotivoSolicitudEspecial | '' = '';
  especialidad = '';
  estado: EstadoCita = 'PENDIENTE';
  pagina = 0;
  /** Solicitudes que cumplen los filtros, de todas las páginas. */
  total = 0;

  readonly opcionesMotivo: OpcionSelect[] = [
    { value: '', label: 'Todos' },
    ...MOTIVOS.map((m) => ({ value: m, label: etiquetaMotivoSolicitud(m) ?? m })),
  ];

  readonly opcionesEstado: OpcionSelect[] = ESTADOS.map((e) => ({ value: e, label: etiquetaEstadoCita(e) }));
  opcionesEspecialidad: OpcionSelect[] = [{ value: '', label: 'Todas' }];
  errorEspecialidades = false;

  /** Búsqueda y orden se aplican aquí, sobre la página cargada: el servidor no los soporta. */
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
  private consulta?: Subscription;
  private consultaEspecialidades?: Subscription;

  constructor(
    private solicitudService: SolicitudManualAdminService,
    private tecnicoService: TecnicoService,
    private alertas: AlertasAdminService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  /** Cuántas coinciden con el texto buscado entre las de esta página. */
  get coincidencias(): string {
    return `${this.tarjetas.length} de ${this.solicitudes.length} en esta página`;
  }

  ngOnInit(): void {
    this.cargarEspecialidades();
    this.cargar();
    this.temporizadorTiempos = setInterval(() => {
      this.actualizarVista();
      this.cdr.markForCheck();
    }, MS_REFRESCO_TIEMPOS);
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizadorExito);
    clearInterval(this.temporizadorTiempos);
    this.consulta?.unsubscribe();
    this.consultaEspecialidades?.unsubscribe();
  }

  cargarEspecialidades(): void {
    this.consultaEspecialidades?.unsubscribe();
    this.errorEspecialidades = false;
    this.consultaEspecialidades = this.tecnicoService.obtenerEspecialidades().subscribe({
      next: (especialidades) => {
        this.opcionesEspecialidad = [
          { value: '', label: 'Todas' },
          ...(Array.isArray(especialidades) ? especialidades : []).map((e) => ({ value: String(e.id), label: e.nombre })),
        ];
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorEspecialidades = true;
        this.cdr.markForCheck();
      },
    });
  }

  cargar(): void {
    this.consulta?.unsubscribe();
    this.cargando = true;
    this.errorCarga = null;

    this.consulta = this.solicitudService
      .listar({
        motivo: this.motivo,
        especialidadId: this.especialidad ? Number.parseInt(this.especialidad, 10) : null,
        estado: this.estado,
        page: this.pagina,
        size: this.tamano,
      })
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: ({ filas, total }) => this.alCargar(filas, total),
        error: (err) => {
          this.solicitudes = [];
          this.total = 0;
          this.actualizarVista();
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar las solicitudes por coordinar.');
          this.toast.error('No se pudieron cargar las solicitudes', this.errorCarga);
        },
      });
  }

  cambiarMotivo(valor: string): void {
    this.motivo = MOTIVOS.find((m) => m === valor) ?? '';
    this.aplicarFiltros();
  }

  cambiarEspecialidad(valor: string): void {
    this.especialidad = valor ?? '';
    this.aplicarFiltros();
  }

  cambiarEstado(valor: string): void {
    this.estado = ESTADOS.find((e) => e === valor) ?? 'PENDIENTE';
    this.aplicarFiltros();
  }

  irAPagina(pagina: number): void {
    if (pagina < 0 || pagina === this.pagina) return;
    this.pagina = pagina;
    this.cargar();
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

  /** La tarjeta se desvanece y, al terminar la transición, sale de la lista; el total del menú se actualiza. */
  onAsignada(solicitud: SolicitudManualAdmin): void {
    this.solicitudAsignando = null;
    this.saliendo.add(solicitud.id);
    this.mostrarExito(`La visita de ${solicitud.clienteNombre} ${solicitud.clienteApellido} quedó agendada.`);
    // El indicador del menú cuenta las alertas pendientes: si falla, queda con el valor anterior.
    this.alertas.obtener().subscribe({ error: () => undefined });

    setTimeout(() => {
      this.solicitudes = this.solicitudes.filter((s) => s.id !== solicitud.id);
      this.total = Math.max(0, this.total - 1);
      this.saliendo.delete(solicitud.id);
      this.actualizarVista();
      if (this.solicitudes.length === 0 && this.pagina > 0) this.irAPagina(this.pagina - 1);
      this.cdr.markForCheck();
    }, MS_SALIDA_TARJETA);
  }

  private aplicarFiltros(): void {
    this.pagina = 0;
    this.cargar();
  }

  private alCargar(filas: SolicitudManualAdmin[], total: number): void {
    this.solicitudes = filas;
    this.total = total;
    // Una página que quedó fuera de rango (p. ej. tras asignar la última de la página): se vuelve a la anterior.
    if (filas.length === 0 && total > 0 && this.pagina > 0) {
      this.irAPagina(Math.ceil(total / this.tamano) - 1);
      return;
    }
    this.actualizarVista();
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
      asignable: (solicitud.estado ?? 'PENDIENTE') === 'PENDIENTE',
      enlaceLlamar: solicitud.telefono ? enlaceTelefono(solicitud.telefono) : null,
      enlaceWhatsapp: construirEnlaceWhatsapp(
        solicitud.telefono,
        construirMensajeAdminWhatsapp({ nombreCliente, especialidad: solicitud.especialidadNombre })
      ),
    };
  }
}
