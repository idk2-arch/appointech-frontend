import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { Subscription } from 'rxjs';

import { SolicitudServicio } from '../../../../core/models/cita';
import { FranjaDisponible, MotivoSinFranjas, TecnicoDisponible } from '../../../../core/models/disponibilidad';
import { CitaService } from '../../../../core/services/cita.service';
import { DisponibilidadService } from '../../../../core/services/disponibilidad.service';
import { EspecialidadResponse } from '../../../../core/services/tecnico.service';
import { aFechaIso, hoyIso, parsearFechaLocal } from '../../../../core/utils/fecha-local';
import { obtenerMensajeError } from '../../../../core/utils/manejo-errores';
import { MENSAJES_SIN_FRANJAS } from '../../../../core/utils/motivo-sin-franjas';
import { construirEnlaceWhatsapp, construirMensajeWhatsapp } from '../../../../core/utils/whatsapp';

const DIAS_RAPIDOS = 7;

@Component({
  selector: 'app-elegir-franja',
  standalone: false,
  templateUrl: './elegir-franja.component.html',
})
export class ElegirFranjaComponent implements OnInit, OnDestroy {
  @Input({ required: true }) especialidad!: EspecialidadResponse;
  @Input({ required: true }) solicitud!: SolicitudServicio;
  @Input({ required: true }) latitud!: number;
  @Input({ required: true }) longitud!: number;
  @Input() fecha = hoyIso();
  @Input() aviso: string | null = null;
  @Output() fechaCambio = new EventEmitter<string>();
  @Output() seleccionar = new EventEmitter<FranjaDisponible>();

  readonly hoy = hoyIso();
  diasRapidos: string[] = [];

  franjas: FranjaDisponible[] = [];
  cargando = true;
  errorCarga: string | null = null;
  motivoSinFranjas: MotivoSinFranjas | null = null;
  /** Enlace de WhatsApp con el mensaje ya escrito; null oculta el botón. */
  enlaceWhatsapp: string | null = null;

  telefonoContacto = '';
  enviandoManual = false;
  errorManual: string | null = null;
  solicitudManualEnviada = false;

  /** Informativo: técnicos activos con la especialidad (sin filtrar por cobertura). */
  tecnicos: TecnicoDisponible[] | null = null;

  private consultaFranjas?: Subscription;

  constructor(
    private disponibilidadService: DisponibilidadService,
    private citaService: CitaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.diasRapidos = this.generarDiasRapidos();
    if (this.fecha < this.hoy) {
      this.fecha = this.hoy;
      this.fechaCambio.emit(this.fecha);
    }
    this.cargarFranjas();
    this.cargarTecnicos();
  }

  ngOnDestroy(): void {
    this.consultaFranjas?.unsubscribe();
  }

  get mensajeSinFranjas(): string {
    return MENSAJES_SIN_FRANJAS[this.motivoSinFranjas ?? 'SIN_HORARIOS'];
  }

  get fechaFueraDeRapidos(): boolean {
    return !this.diasRapidos.includes(this.fecha);
  }

  elegirFecha(fecha: string): void {
    if (!fecha || fecha === this.fecha) return;
    if (fecha < this.hoy) {
      this.errorCarga = 'La fecha no puede ser anterior a hoy';
      this.franjas = [];
      this.cdr.markForCheck();
      return;
    }
    this.fecha = fecha;
    this.fechaCambio.emit(fecha);
    this.cargarFranjas();
  }

  verDiaSiguiente(): void {
    const siguiente = parsearFechaLocal(this.fecha);
    siguiente.setDate(siguiente.getDate() + 1);
    this.elegirFecha(aFechaIso(siguiente));
  }

  cerrarAviso(): void {
    this.aviso = null;
  }

  cargarFranjas(): void {
    this.consultaFranjas?.unsubscribe();
    this.cargando = true;
    this.errorCarga = null;

    this.consultaFranjas = this.disponibilidadService
      .obtenerFranjas({
        especialidadId: this.especialidad.id,
        fecha: this.fecha,
        latitud: this.latitud,
        longitud: this.longitud,
      })
      .subscribe({
        next: ({ franjas, motivoSinFranjas, telefonoContactoAdmin }) => {
          this.franjas = franjas;
          this.motivoSinFranjas = franjas.length ? null : motivoSinFranjas;
          this.enlaceWhatsapp = this.armarEnlaceWhatsapp(telefonoContactoAdmin);
          this.cargando = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.franjas = [];
          this.motivoSinFranjas = null;
          this.cargando = false;
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar los horarios disponibles.');
          this.cdr.markForCheck();
        },
      });
  }

  /** Envía la solicitud con los datos que el cliente ya llenó; un administrador coordinará la visita. */
  solicitarAgendamientoManual(): void {
    if (this.enviandoManual) return;
    this.enviandoManual = true;
    this.errorManual = null;

    const telefono = this.telefonoContacto.trim();
    this.citaService
      .solicitarAgendamientoManual({
        especialidadId: this.especialidad.id,
        descripcionProblema: this.solicitud.descripcionProblema,
        direccionServicio: this.solicitud.direccionServicio,
        latitud: this.latitud,
        longitud: this.longitud,
        ...(telefono && { telefonoContacto: telefono }),
      })
      .subscribe({
        next: () => {
          this.enviandoManual = false;
          this.solicitudManualEnviada = true;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.enviandoManual = false;
          this.errorManual = obtenerMensajeError(err, 'No pudimos enviar tu solicitud. Intenta de nuevo en un momento.');
          this.cdr.markForCheck();
        },
      });
  }

  private armarEnlaceWhatsapp(telefonoAdmin: string | null | undefined): string | null {
    return construirEnlaceWhatsapp(
      telefonoAdmin,
      construirMensajeWhatsapp({
        especialidad: this.especialidad.nombre,
        direccion: this.solicitud.direccionServicio,
        descripcion: this.solicitud.descripcionProblema,
      })
    );
  }

  private cargarTecnicos(): void {
    this.disponibilidadService.obtenerTecnicos(this.especialidad.id).subscribe({
      next: (tecnicos) => {
        this.tecnicos = tecnicos;
        this.cdr.markForCheck();
      },
      // Es solo informativo: si falla, no se muestra.
      error: () => {
        this.tecnicos = null;
      },
    });
  }

  private generarDiasRapidos(): string[] {
    const base = parsearFechaLocal(this.hoy);
    return Array.from({ length: DIAS_RAPIDOS }, (_, i) => {
      const dia = new Date(base);
      dia.setDate(base.getDate() + i);
      return aFechaIso(dia);
    });
  }
}
