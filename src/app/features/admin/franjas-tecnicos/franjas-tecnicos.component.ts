import {
  afterNextRender,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { catchError, finalize, forkJoin, map, Observable, of, Subscription } from 'rxjs';
import {
  FranjasTecnicoService,
  FranjaTecnico,
} from '../../../core/services/franjas-tecnico.service';
import { TecnicoResponse, TecnicoService } from '../../../core/services/tecnico.service';
import { ReglasFranjasService } from '../../../core/services/reglas-franjas.service';
import { aFechaIso, hoyIso, parsearFechaLocal } from '../../../core/utils/fecha-local';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { resolverUrlFoto } from '../../../core/utils/url-foto';
import { ToastService } from '../../../shared/toast/toast.service';

interface ResultadoFranja {
  fecha: string;
  error: string | null;
}
const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

@Component({
  selector: 'app-franjas-tecnicos',
  standalone: false,
  templateUrl: './franjas-tecnicos.component.html',
  styleUrl: './franjas-tecnicos.component.css',
})
export class FranjasTecnicosComponent implements OnInit, OnDestroy {
  tecnicos: TecnicoResponse[] = [];
  tecnico: TecnicoResponse | null = null;
  busqueda = '';
  radio = 1;
  duracion: number | null = null;
  desde = this.inicioMes(hoyIso());
  paso = 1;
  fechaFoco = hoyIso();
  guardado = false;
  editarRadio = false;
  verAgenda = false;
  vistaAgenda: 'semana' | 'mes' = 'semana';
  agendaDesde = hoyIso();
  franjasAgenda: FranjaTecnico[] = [];
  cargandoAgenda = false;
  errorAgenda: string | null = null;
  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  franjas: FranjaTecnico[] = [];
  cargandoTecnicos = true;
  cargando = false;
  guardando = false;
  guardandoRadio = false;
  error: string | null = null;
  errorRadio: string | null = null;
  editando: FranjaTecnico | null = null;
  eliminando: FranjaTecnico | null = null;
  errorBorrado: string | null = null;
  fecha = '';
  horaInicio = '08:00';
  horaFin = '12:00';
  copias: string[] = [];
  fechaCopia = '';
  errorFormulario: string | null = null;
  resultados: ResultadoFranja[] = [];
  private readonly tareas = new Subscription();
  private consulta?: Subscription;
  private consultaAgenda?: Subscription;
  private readonly fotosFallidas = new Set<string>();
  constructor(
    private servicio: FranjasTecnicoService,
    private tecnicosService: TecnicoService,
    private reglas: ReglasFranjasService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private host: ElementRef<HTMLElement>,
    private injector: Injector,
  ) {}
  get hoy(): string {
    return hoyIso();
  }
  get dias(): string[] {
    return this.diasMes(this.desde);
  }
  get celdasMes(): (string | null)[] {
    const huecos = (parsearFechaLocal(this.desde).getDay() + 6) % 7;
    const celdas: (string | null)[] = [...Array<string | null>(huecos).fill(null), ...this.dias];
    while (celdas.length % 7) celdas.push(null);
    return celdas;
  }
  get tituloMes(): string {
    return this.nombreMes(this.desde);
  }
  get diasAgenda(): string[] {
    return this.vistaAgenda === 'mes'
      ? this.diasMes(this.agendaDesde)
      : this.rangoDias(this.agendaDesde, 7);
  }
  get tituloAgenda(): string {
    if (this.vistaAgenda === 'mes') return this.nombreMes(this.agendaDesde);
    const formato = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });
    return (
      formato.format(parsearFechaLocal(this.agendaDesde)) +
      ' – ' +
      formato.format(parsearFechaLocal(this.diasAgenda[6]))
    );
  }
  get fechaValida(): boolean {
    return this.esFechaValida(this.fecha) && this.fecha >= this.hoy;
  }
  get tituloDia(): string {
    if (!this.fechaValida) return '';
    const titulo = new Intl.DateTimeFormat('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(parsearFechaLocal(this.fecha));
    return titulo.charAt(0).toLocaleUpperCase('es') + titulo.slice(1);
  }
  get diaEnFoco(): string {
    return (
      this.dias.find((d) => d === this.fechaFoco && d >= this.hoy) ??
      this.dias.find((d) => d >= this.hoy) ??
      ''
    );
  }
  get filtrados(): TecnicoResponse[] {
    const texto = this.busqueda.toLocaleLowerCase().trim();
    return this.tecnicos.filter((t) =>
      `${t.nombre} ${t.apellido} ${t.especialidades.map((e) => e.nombre).join(' ')}`
        .toLocaleLowerCase()
        .includes(texto),
    );
  }
  get citas(): number {
    const disponibles = this.minutos(this.horaFin) - this.minutos(this.horaInicio);
    if (!this.duracion || !Number.isFinite(disponibles)) return 0;
    return Math.max(0, Math.floor(disponibles / this.duracion));
  }
  iniciales(t: TecnicoResponse): string {
    return (t.nombre.charAt(0) + t.apellido.charAt(0)).toLocaleUpperCase();
  }
  fotoDe(t: TecnicoResponse): string | null {
    const url = resolverUrlFoto(t.fotoUrl);
    return url && !this.fotosFallidas.has(url) ? url : null;
  }
  alFallarFoto(url: string): void {
    this.fotosFallidas.add(url);
  }
  numeroDia(fecha: string): number {
    return parsearFechaLocal(fecha).getDate();
  }
  private rangoDias(desde: string, cantidad: number): string[] {
    const base = parsearFechaLocal(desde);
    return Array.from({ length: cantidad }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return aFechaIso(d);
    });
  }
  private diasMes(fecha: string): string[] {
    const d = parsearFechaLocal(fecha);
    return this.rangoDias(
      this.inicioMes(fecha),
      new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
    );
  }
  private inicioMes(fecha: string): string {
    return fecha.slice(0, 7) + '-01';
  }
  private nombreMes(fecha: string): string {
    return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(
      parsearFechaLocal(fecha),
    );
  }
  private esFechaValida(fecha: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && aFechaIso(parsearFechaLocal(fecha)) === fecha;
  }
  ngOnInit(): void {
    this.cargarDatos();
  }
  cargarDatos(): void {
    this.error = null;
    this.cargandoTecnicos = true;
    this.tareas.add(
      this.tecnicosService
        .obtenerTecnicos()
        .pipe(
          finalize(() => {
            this.cargandoTecnicos = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (ts) => {
            this.tecnicos = ts;
            this.cdr.markForCheck();
          },
          error: (e) => this.mostrarError(e),
        }),
    );
    this.tareas.add(
      this.reglas.obtener().subscribe({
        next: (r) => {
          this.duracion = r.duracionBloqueMinutos;
          this.cdr.markForCheck();
        },
        error: (e) => this.mostrarError(e),
      }),
    );
  }
  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
    this.consultaAgenda?.unsubscribe();
    this.tareas.unsubscribe();
  }
  reintentar(): void {
    this.cargar();
    this.cargarDatos();
  }
  seleccionar(t: TecnicoResponse): void {
    if (this.guardando) return;
    if (this.tecnico?.id !== t.id) {
      this.fecha = '';
      this.desde = this.inicioMes(this.hoy);
      this.fechaFoco = this.hoy;
      this.reiniciarFormulario();
      this.paso = 1;
      this.verAgenda = false;
      this.consultaAgenda?.unsubscribe();
      this.franjasAgenda = [];
    }
    this.tecnico = t;
    this.radio = t.radioCoberturaKm;
    this.errorRadio = null;
    this.editarRadio = false;
    this.cargar();
  }
  irPaso(paso: number): void {
    if (this.guardando || paso < 1 || paso > 3) return;
    if (paso >= 2 && !this.tecnico) return;
    if (paso === 3 && !this.fechaValida) return;
    this.paso = paso;
    this.verAgenda = false;
  }
  elegirDia(dia: string): void {
    if (!this.esFechaValida(dia) || dia < this.hoy || this.guardando) return;
    if (this.fecha !== dia) this.reiniciarFormulario();
    this.fecha = dia;
    this.fechaFoco = dia;
  }
  nuevaFranja(): void {
    if (!this.tecnico || !this.duracion || this.guardando || !this.fechaValida) return;
    this.abrir(this.fecha);
  }
  agregarOtra(): void {
    this.reiniciarFormulario();
    this.fecha = '';
    this.paso = 2;
    this.verAgenda = false;
  }
  terminar(): void {
    this.reiniciarFormulario();
    this.fecha = '';
    this.paso = 1;
  }
  private reiniciarFormulario(): void {
    this.editando = null;
    this.guardado = false;
    this.horaInicio = '08:00';
    this.horaFin = '12:00';
    this.copias = [];
    this.fechaCopia = '';
    this.resultados = [];
    this.errorFormulario = null;
  }
  navegar(meses: number): void {
    const d = parsearFechaLocal(this.desde);
    d.setMonth(d.getMonth() + meses);
    this.desde = aFechaIso(d);
    this.fecha = '';
    this.reiniciarFormulario();
    this.fechaFoco = this.dias.find((dia) => dia >= this.hoy) ?? '';
    this.cargar();
  }
  moverDia(evento: KeyboardEvent, dia: string): void {
    const desplazamientos: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const desplazamiento = desplazamientos[evento.key];
    if (desplazamiento === undefined) return;
    evento.preventDefault();
    const d = parsearFechaLocal(dia);
    d.setDate(d.getDate() + desplazamiento);
    const destino = aFechaIso(d) < this.hoy ? this.hoy : aFechaIso(d);
    this.fechaFoco = destino;
    if (this.inicioMes(destino) !== this.desde) {
      this.desde = this.inicioMes(destino);
      this.cargar();
    }
    const enfocar = () =>
      this.host.nativeElement
        .querySelector<HTMLButtonElement>('[data-fecha="' + destino + '"]')
        ?.focus();
    enfocar();
    afterNextRender(enfocar, { injector: this.injector });
    this.cdr.markForCheck();
  }
  abrirAgenda(): void {
    if (!this.tecnico || this.guardando) return;
    this.verAgenda = true;
    this.agendaDesde = this.fechaValida ? this.fecha : this.hoy;
    this.cambiarVistaAgenda(this.vistaAgenda);
  }
  cerrarAgenda(): void {
    this.verAgenda = false;
  }
  cambiarVistaAgenda(vista: 'semana' | 'mes'): void {
    this.vistaAgenda = vista;
    if (vista === 'mes') this.agendaDesde = this.inicioMes(this.agendaDesde);
    else {
      const d = parsearFechaLocal(this.agendaDesde);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      this.agendaDesde = aFechaIso(d);
    }
    this.cargarAgenda();
  }
  navegarAgenda(cantidad: number): void {
    const d = parsearFechaLocal(this.agendaDesde);
    if (this.vistaAgenda === 'mes') d.setMonth(d.getMonth() + cantidad);
    else d.setDate(d.getDate() + cantidad * 7);
    this.agendaDesde = aFechaIso(d);
    this.cargarAgenda();
  }
  cargarAgenda(): void {
    this.consultaAgenda?.unsubscribe();
    this.franjasAgenda = [];
    this.errorAgenda = null;
    if (!this.tecnico) return;
    this.cargandoAgenda = true;
    this.consultaAgenda = this.servicio
      .listar(this.tecnico.id, this.agendaDesde, this.diasAgenda.at(-1)!)
      .pipe(
        finalize(() => {
          this.cargandoAgenda = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (fs) => (this.franjasAgenda = fs),
        error: (e) => (this.errorAgenda = obtenerMensajeError(e, 'No se pudo cargar la agenda.')),
      });
  }
  cargar(): void {
    this.consulta?.unsubscribe();
    this.franjas = [];
    this.error = null;
    if (!this.tecnico) return;
    this.cargando = true;
    this.consulta = this.servicio
      .listar(this.tecnico.id, this.desde, this.dias.at(-1)!)
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({ next: (fs) => (this.franjas = fs), error: (e) => this.mostrarError(e) });
  }
  franjasDia(dia: string, agenda = false): FranjaTecnico[] {
    return (agenda ? this.franjasAgenda : this.franjas).filter((f) => f.fecha === dia);
  }
  abrir(fecha: string, franja: FranjaTecnico | null = null): void {
    if (this.guardando || !this.tecnico) return;
    this.fecha = fecha;
    this.fechaFoco = fecha;
    if (franja && this.inicioMes(fecha) !== this.desde) {
      this.desde = this.inicioMes(fecha);
      this.cargar();
    }
    this.editando = franja;
    this.horaInicio = franja?.horaInicio.slice(0, 5) ?? '08:00';
    this.horaFin = franja?.horaFin.slice(0, 5) ?? '12:00';
    this.copias = [];
    this.fechaCopia = '';
    this.resultados = [];
    this.errorFormulario = null;
    this.guardado = false;
    this.paso = 3;
    this.verAgenda = false;
  }
  quitarCopia(dia: string): void {
    this.copias = this.copias.filter((d) => d !== dia);
  }
  agregarCopia(): void {
    if (this.fechaCopia && !this.copias.includes(this.fechaCopia) && this.fechaCopia !== this.fecha)
      this.copias.push(this.fechaCopia);
    this.fechaCopia = '';
  }
  validar(fecha: string): string | null {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
      aFechaIso(parsearFechaLocal(fecha)) !== fecha ||
      fecha < this.hoy
    )
      return 'Elige una fecha válida que no sea pasada.';
    if (!HORA_VALIDA.test(this.horaInicio) || !HORA_VALIDA.test(this.horaFin))
      return 'Completa las horas de inicio y fin.';
    if (this.minutos(this.horaInicio) >= this.minutos(this.horaFin))
      return 'La hora de inicio debe ser anterior a la de fin.';
    if (!this.duracion || this.citas < 1)
      return 'La franja debe tener espacio para al menos una cita.';
    const ahora = new Date();
    if (
      fecha === this.hoy &&
      this.minutos(this.horaInicio) <= ahora.getHours() * 60 + ahora.getMinutes()
    )
      return 'La hora de inicio ya pasó hoy.';
    return null;
  }
  guardar(): void {
    if (!this.tecnico || this.guardando || this.guardado) return;
    this.errorFormulario = this.validar(this.fecha);
    if (this.errorFormulario) return;
    const tecnicoId = this.tecnico.id;
    this.guardando = true;
    this.resultados = [];
    const fechas = this.editando ? [this.fecha] : [...new Set([this.fecha, ...this.copias])];
    const peticiones = fechas.map((fecha) => this.peticionFecha(tecnicoId, fecha));
    this.tareas.add(
      forkJoin(peticiones)
        .pipe(
          finalize(() => {
            this.guardando = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (respuestas) => this.alGuardar(respuestas),
          error: (e) => {
            this.errorFormulario = obtenerMensajeError(e, 'No se pudieron guardar las franjas.');
          },
        }),
    );
  }
  private peticionFecha(tecnicoId: number, fecha: string): Observable<ResultadoFranja> {
    const invalidacion = this.validar(fecha);
    if (invalidacion) return of({ fecha, error: invalidacion });
    const datos = { fecha, horaInicio: this.horaInicio, horaFin: this.horaFin };
    const peticion = this.editando
      ? this.servicio.actualizar(tecnicoId, this.editando.id, datos)
      : this.servicio.crear(tecnicoId, datos);
    return peticion.pipe(
      map(() => ({ fecha, error: null as string | null })),
      catchError((e) =>
        of({ fecha, error: obtenerMensajeError(e, 'No se pudo guardar la franja.') }),
      ),
    );
  }
  private alGuardar(resultados: ResultadoFranja[]): void {
    this.resultados = resultados;
    const fallidas = resultados.filter((r) => r.error);
    if (fallidas.length) {
      this.errorFormulario = fallidas.map((r) => `${r.fecha}: ${r.error}`).join('\n');
      this.fecha = fallidas[0].fecha;
      this.copias = fallidas.slice(1).map((r) => r.fecha);
    } else {
      this.guardado = true;
      this.toast.exito('Franjas guardadas', resultados.map((r) => r.fecha).join(', '));
    }
    this.cargar();
  }
  pedirBorrado(f: FranjaTecnico): void {
    this.eliminando = f;
    this.errorBorrado = null;
  }
  borrar(): void {
    if (!this.tecnico || !this.eliminando || this.guardando) return;
    this.guardando = true;
    this.tareas.add(
      this.servicio
        .borrar(this.tecnico.id, this.eliminando.id)
        .pipe(
          finalize(() => {
            this.guardando = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: () => {
            this.eliminando = null;
            this.toast.exito('Franja eliminada');
            this.cargar();
            if (this.verAgenda) this.cargarAgenda();
          },
          error: (e) =>
            (this.errorBorrado = obtenerMensajeError(e, 'No se pudo borrar la franja.')),
        }),
    );
  }
  guardarRadio(): void {
    if (!this.tecnico || this.guardandoRadio) return;
    this.errorRadio = null;
    if (!Number.isFinite(this.radio) || this.radio < 1 || this.radio > 100) {
      this.errorRadio = 'El radio debe estar entre 1 y 100 km.';
      return;
    }
    const tecnico = this.tecnico;
    this.guardandoRadio = true;
    this.tareas.add(
      this.servicio
        .guardarRadio(tecnico.id, this.radio)
        .pipe(
          finalize(() => {
            this.guardandoRadio = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (r) => {
            tecnico.radioCoberturaKm = r.radioMaximoKm;
            this.toast.exito('Radio de atención guardado');
          },
          error: (e) => (this.errorRadio = obtenerMensajeError(e, 'No se pudo guardar el radio.')),
        }),
    );
  }
  private minutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }
  private mostrarError(e: unknown): void {
    this.error = obtenerMensajeError(e, 'No se pudieron cargar los datos.');
    this.cdr.markForCheck();
  }
}
