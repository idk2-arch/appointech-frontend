import { ChangeDetectorRef, Component, OnInit } from '@angular/core';

import { NivelLog, RegistroLog, TipoLog } from '../../../core/models/registro-log';
import { LogService } from '../../../core/services/log.service';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { RubberSegmentItem } from '../../../shared/rubber-segment/rubber-segment.component';

@Component({
  selector: 'app-logs',
  standalone: false,
  templateUrl: './logs.component.html',
})
export class LogsComponent implements OnInit {
  logs: RegistroLog[] = [];
  cargando = true;
  errorCarga: string | null = null;

  readonly filtrosNivel: RubberSegmentItem[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'DEBUG', label: 'Debug' },
    { value: 'INFO', label: 'Info' },
    { value: 'WARN', label: 'Warn' },
    { value: 'ERROR', label: 'Error' },
  ];

  readonly tipos: { value: TipoLog; label: string }[] = [
    { value: 'AUDITORIA', label: 'Auditoría' },
    { value: 'NEGOCIO', label: 'Negocio' },
    { value: 'SEGURIDAD', label: 'Seguridad' },
    { value: 'ERROR_APLICACION', label: 'Error de aplicación' },
    { value: 'INTEGRACION', label: 'Integración' },
    { value: 'SISTEMA', label: 'Sistema' },
  ];

  readonly limites = [50, 100, 200, 500];

  nivelFiltro = 'todos';
  tipoFiltro: TipoLog | '' = '';
  limite = 100;

  constructor(
    private logService: LogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarLogs();
  }

  get hayFiltros(): boolean {
    return this.nivelFiltro !== 'todos' || this.tipoFiltro !== '';
  }

  cargarLogs(mostrarCargando = true): void {
    if (mostrarCargando) {
      this.cargando = true;
    }
    this.errorCarga = null;

    this.logService
      .obtenerLogs({
        nivel: this.nivelFiltro === 'todos' ? null : (this.nivelFiltro as NivelLog),
        tipo: this.tipoFiltro || null,
        limite: this.limite,
      })
      .subscribe({
        next: (logs) => {
          this.logs = logs;
          this.cargando = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.cargando = false;
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar los logs.');
          this.cdr.markForCheck();
        },
      });
  }

  cambiarNivel(nivel: string): void {
    this.nivelFiltro = nivel;
    this.cargarLogs();
  }

  cambiarTipo(tipo: string): void {
    this.tipoFiltro = tipo as TipoLog | '';
    this.cargarLogs();
  }

  cambiarLimite(limite: string): void {
    this.limite = Number(limite);
    this.cargarLogs();
  }

  limpiarFiltros(): void {
    this.nivelFiltro = 'todos';
    this.tipoFiltro = '';
    this.cargarLogs();
  }

  etiquetaTipo(tipo: TipoLog): string {
    return this.tipos.find((t) => t.value === tipo)?.label ?? tipo;
  }
}
