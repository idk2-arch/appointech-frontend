import { ChangeDetectorRef, Component, HostListener, OnDestroy } from '@angular/core';
import { finalize, Observable, Subject, Subscription, take } from 'rxjs';

import { Cita, CrearSolicitudRequest, MotivoSolicitudEspecial, SolicitudServicio } from '../../../core/models/cita';
import { FranjaDisponible, MotivoSinFranjas } from '../../../core/models/disponibilidad';
import { ConSalidaConfirmable } from '../../../core/guards/salir-sin-terminar.guard';
import { CitaClienteService } from '../../../core/services/cita-cliente.service';
import { FotoElectrodomesticoService } from '../../../core/services/foto-electrodomestico.service';
import { EspecialidadResponse } from '../../../core/services/tecnico.service';
import { hoyIso } from '../../../core/utils/fecha-local';
import { AvisosPagoService } from '../../../shared/toast/avisos-pago.service';
import { BorradorDetalle, DetallesListos } from './detalle-solicitud/detalle-solicitud.component';

type Paso = 'especialidad' | 'detalle' | 'franja' | 'confirmar' | 'confirmada' | 'manual';

@Component({
  selector: 'app-solicitar-servicio',
  standalone: false,
  templateUrl: './solicitar-servicio.component.html',
  // El elemento del componente es en línea por defecto; como bloque, la columna centrada ocupa el ancho disponible.
  host: { class: 'block' },
})
export class SolicitarServicioComponent implements OnDestroy, ConSalidaConfirmable {
  readonly pasos: { id: Paso; etiqueta: string }[] = [
    { id: 'especialidad', etiqueta: 'Especialidad' },
    { id: 'detalle', etiqueta: 'Detalles' },
    { id: 'franja', etiqueta: 'Horario' },
    { id: 'confirmar', etiqueta: 'Confirmar' },
  ];

  paso: Paso = 'especialidad';

  especialidad: EspecialidadResponse | null = null;
  borradorDetalle: BorradorDetalle | null = null;
  /** Lo que el cliente describió y ya validó. Hasta confirmar la cita no se guarda nada en el backend. */
  datos: CrearSolicitudRequest | null = null;
  /** Solo existe si un intento de confirmar alcanzó a crearla y la cita no se pudo confirmar (p. ej. el horario se ocupó). */
  solicitud: SolicitudServicio | null = null;
  fecha = hoyIso();
  franja: FranjaDisponible | null = null;
  avisoFranjas: string | null = null;
  cita: Cita | null = null;
  motivoManual: MotivoSolicitudEspecial | null = null;

  /**
   * Paso del que se está saliendo mientras dura la transición: su contenido se conserva hasta que termina, para que
   * no desaparezca de golpe mientras el asistente anima el cambio.
   */
  pasoSaliente: Paso | null = null;
  /** La franja que muestra el paso de confirmación; se conserva mientras ese paso sale. */
  franjaMostrada: FranjaDisponible | null = null;
  /**
   * Los detalles (con su mapa) se montan la primera vez y se quedan montados al seguir adelante: volver a ellos no
   * recrea el mapa ni pierde lo escrito.
   */
  detalleMontado = false;

  /** Fotos elegidas en los detalles: se suben cuando la cita (o la solicitud manual) ya existe. */
  private fotosElegidas: string[] = [];

  /** Subida de las fotos del electrodoméstico, que ocurre una vez creada la cita. */
  subiendoFotos = false;
  fotosPendientes: string[] = [];
  avisoFotos: string | null = null;

  /** Muestra la pregunta "¿Salir sin terminar?". */
  mostrarSalida = false;

  private citaId: number | null = null;
  private subida?: Subscription;
  private respuestaSalida?: Subject<boolean>;

  constructor(
    private fotoService: FotoElectrodomesticoService,
    private cdr: ChangeDetectorRef,
    private avisos: AvisosPagoService,
    private citaCliente: CitaClienteService
  ) {}

  ngOnDestroy(): void {
    this.subida?.unsubscribe();
    this.responderSalida(true);
  }

  get indicePaso(): number {
    const indice = this.pasos.findIndex((p) => p.id === this.paso);
    return indice === -1 ? this.pasos.length : indice;
  }

  /** Hay algo escrito, elegido o creado que se perdería al salir. Ya confirmada (o entregada a un administrador), no. */
  get haySinTerminar(): boolean {
    if (this.paso === 'confirmada' || this.paso === 'manual') return false;
    const b = this.borradorDetalle;
    const escrito =
      !!b &&
      (!!b.descripcionProblema?.trim() ||
        !!b.direccionServicio?.trim() ||
        !!b.marcaElectrodomestico?.trim() ||
        !!b.modeloElectrodomestico?.trim() ||
        (b.fotos?.length ?? 0) > 0 ||
        b.latitud !== null);
    return escrito || this.datos !== null || this.franja !== null || this.solicitud !== null;
  }

  /** Recargar o cerrar la pestaña con datos sin confirmar: el navegador pregunta (el texto no se puede personalizar). */
  @HostListener('window:beforeunload', ['$event'])
  avisarAlCerrar(evento: BeforeUnloadEvent): void {
    if (this.haySinTerminar) evento.preventDefault();
  }

  /** Lo llama la ruta (canDeactivate): sin nada que perder deja salir; si no, pregunta y espera la respuesta. */
  confirmarSalida(): boolean | Observable<boolean> {
    if (!this.haySinTerminar) return true;
    this.responderSalida(false);
    const respuesta = new Subject<boolean>();
    this.respuestaSalida = respuesta;
    this.mostrarSalida = true;
    this.cdr.markForCheck();
    return respuesta.pipe(take(1));
  }

  /** "Salir": si una solicitud alcanzó a crearse sin confirmarse, se intenta descartarla antes de irse. */
  salir(): void {
    this.descartarSolicitudPendiente();
    this.responderSalida(true);
  }

  quedarse(): void {
    this.responderSalida(false);
  }

  /**
   * Los indicadores del asistente solo permiten lo que el flujo permite con sus botones: volver a lo que todavía
   * no se guardó (la especialidad y los detalles, mientras no exista solicitud) y de la confirmación a los
   * horarios. Seguir adelante lo hace cada paso al completarse; lo demás se ignora.
   */
  onCambioPaso(numero: number): void {
    const destino = this.pasos[numero - 1]?.id;
    const editable = this.solicitud === null;
    if (destino === 'especialidad' && editable && this.paso !== 'especialidad') this.volverAEspecialidad();
    else if (destino === 'detalle' && editable && this.especialidad && this.paso !== 'detalle') this.volverADetalles();
    else if (destino === 'franja' && this.paso === 'confirmar') this.volverAFranjas();
  }

  onEspecialidadSeleccionada(especialidad: EspecialidadResponse): void {
    this.especialidad = especialidad;
    this.detalleMontado = true;
    this.irA('detalle');
  }

  /** Detalles válidos: se pasa a los horarios sin guardar nada. */
  onDetallesListos(evento: DetallesListos): void {
    this.datos = evento.datos;
    this.fotosElegidas = evento.fotos;
    this.franja = null;
    this.avisoFranjas = null;
    this.irA('franja');
  }

  onFranjaSeleccionada(franja: FranjaDisponible): void {
    this.franja = franja;
    this.franjaMostrada = franja;
    this.avisoFranjas = null;
    this.irA('confirmar');
  }

  onFranjaNoDisponible(mensaje: string): void {
    this.franja = null;
    this.avisoFranjas = mensaje;
    this.irA('franja');
  }

  /** El asistente terminó de animar el cambio: ya no hace falta conservar el contenido del paso anterior. */
  onTransicionTerminada(): void {
    this.pasoSaliente = null;
    if (this.paso !== 'confirmar') this.franjaMostrada = null;
  }

  /** La solicitud se creó justo antes de confirmar: se recuerda para reutilizarla si hay que elegir otro horario. */
  onSolicitudCreada(solicitud: SolicitudServicio): void {
    this.solicitud = solicitud;
  }

  /** El backend marcó la solicitud para coordinación manual: no hay franjas que elegir. */
  onSolicitudManual(solicitud: SolicitudServicio): void {
    this.solicitud = solicitud;
    this.motivoManual = solicitud.motivoSolicitudEspecial ?? null;
    this.subirFotos(solicitud.id, this.fotosElegidas);
    this.irA('manual');
  }

  /** Sin técnicos o fuera de cobertura: la persona dejó su solicitud y un administrador la coordinará. */
  onManualEnviada(evento: { cita: Cita; motivo: MotivoSinFranjas | null }): void {
    this.motivoManual = evento.cita.motivoSolicitudEspecial ?? evento.motivo;
    this.subirFotos(evento.cita.id, this.fotosElegidas);
    this.irA('manual');
  }

  onCitaConfirmada(cita: Cita): void {
    this.cita = cita;
    this.avisos.anunciarCitaConfirmada();
    this.subirFotos(cita.id, this.fotosElegidas);
    this.irA('confirmada');
  }

  reintentarFotos(): void {
    if (this.citaId !== null) this.subirFotos(this.citaId, this.fotosPendientes);
  }

  /**
   * La cita ya existe: si alguna foto falla, la cita sigue en pie y se avisa para reintentar
   * (o agregarlas después desde el detalle de la cita).
   */
  private subirFotos(citaId: number, fotos: string[]): void {
    this.citaId = citaId;
    this.avisoFotos = null;
    this.fotosPendientes = [];
    if (fotos.length === 0) return;

    this.subiendoFotos = true;
    this.subida?.unsubscribe();
    this.subida = this.fotoService
      .subirVarias(citaId, fotos)
      .pipe(
        finalize(() => {
          this.subiendoFotos = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (resultado) => this.avisarFallidas(resultado.fallidas, resultado.mensajeError),
        error: () => this.avisarFallidas(fotos, null),
      });
  }

  private avisarFallidas(fallidas: string[], motivo: string | null): void {
    this.fotosPendientes = fallidas;
    if (fallidas.length === 0) return;

    const cuantas = fallidas.length === 1 ? 'una foto' : `${fallidas.length} fotos`;
    this.avisoFotos =
      `Tu cita quedó creada, pero no pudimos subir ${cuantas}. ${motivo ? motivo + ' ' : ''}` +
      'Puedes reintentar ahora o agregarlas después desde Mis citas, mientras la cita esté pendiente o confirmada.';
  }

  volverAEspecialidad(): void {
    this.irA('especialidad');
  }

  volverADetalles(): void {
    this.franja = null;
    this.avisoFranjas = null;
    this.irA('detalle');
  }

  volverAFranjas(): void {
    this.franja = null;
    this.irA('franja');
  }

  solicitarOtroServicio(): void {
    this.especialidad = null;
    this.borradorDetalle = null;
    this.datos = null;
    this.solicitud = null;
    this.detalleMontado = false;
    this.pasoSaliente = null;
    this.franjaMostrada = null;
    this.fotosElegidas = [];
    this.motivoManual = null;
    this.fecha = hoyIso();
    this.franja = null;
    this.avisoFranjas = null;
    this.cita = null;
    this.citaId = null;
    this.subida?.unsubscribe();
    this.subiendoFotos = false;
    this.fotosPendientes = [];
    this.avisoFotos = null;
    this.irA('especialidad');
  }

  /**
   * Existe el cancelar del cliente (POST /cliente/citas/{id}/cancelar, válido para PENDIENTE): se usa solo para
   * una solicitud que se alcanzó a crear sin confirmar. No hay un endpoint de "descartar", así que queda como
   * CANCELADA. Es un intento: si falla no se interrumpe la salida.
   */
  private descartarSolicitudPendiente(): void {
    if (this.solicitud === null) return;
    this.citaCliente.cancelar(this.solicitud.id).subscribe({ error: () => undefined });
  }

  private responderSalida(salir: boolean): void {
    const respuesta = this.respuestaSalida;
    this.respuestaSalida = undefined;
    this.mostrarSalida = false;
    respuesta?.next(salir);
    respuesta?.complete();
    this.cdr.markForCheck();
  }

  private irA(paso: Paso): void {
    this.pasoSaliente = this.paso === paso ? null : this.paso;
    this.paso = paso;
    // Al instante y solo si hace falta: un desplazamiento suave a la vez que la animación de altura del asistente se traba.
    if (window.scrollY > 0) window.scrollTo({ top: 0 });
  }
}
