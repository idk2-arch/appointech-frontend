import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { finalize, Observable, Subscription } from 'rxjs';

import { DiagnosticoCita, DiagnosticoRequest } from '../../../core/models/cita';
import { CitaTecnico } from '../../../core/models/tecnico-agenda';
import { AgendaTecnicoService } from '../../../core/services/agenda-tecnico.service';
import { CitaTecnicoService } from '../../../core/services/cita-tecnico.service';
import { accionesTecnico, TransicionTecnico } from '../../../core/utils/acciones-cita';
import { hoyIso } from '../../../core/utils/fecha-local';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { enlaceTelefono } from '../../../core/utils/telefono';

type Dialogo =
  | { tipo: 'cancelar'; cita: CitaTecnico }
  | { tipo: 'diagnostico'; cita: CitaTecnico }
  | { tipo: 'finalizar'; cita: CitaTecnico; transicion: TransicionTecnico };

@Component({
  selector: 'app-mi-agenda',
  standalone: false,
  templateUrl: './mi-agenda.component.html',
})
export class MiAgendaComponent implements OnInit, OnDestroy {
  fecha = hoyIso();
  citas: CitaTecnico[] = [];
  cargando = true;
  errorCarga: string | null = null;

  dialogo: Dialogo | null = null;
  /** Cita con una acción en curso; mientras tanto sus botones quedan deshabilitados. */
  citaEnviando: number | null = null;
  errorDialogo: string | null = null;
  mensajeExito: string | null = null;
  mensajeError: string | null = null;

  readonly enlaceTelefono = enlaceTelefono;
  readonly acciones = accionesTecnico;

  /** Diagnósticos guardados en esta sesión, para reabrirlos al corregir. */
  private diagnosticos = new Map<number, DiagnosticoCita>();
  private consulta?: Subscription;

  constructor(
    private agendaService: AgendaTecnicoService,
    private citaTecnicoService: CitaTecnicoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarCitas();
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }

  cambiarFecha(fecha: string): void {
    this.fecha = fecha;
    this.cargarCitas();
  }

  cargarCitas(silencioso = false): void {
    // Si se cambia de día rápido, la respuesta anterior se descarta.
    this.consulta?.unsubscribe();
    if (!silencioso) this.cargando = true;
    this.errorCarga = null;

    this.consulta = this.agendaService
      .obtenerCitas(this.fecha)
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (citas) => {
          this.citas = Array.isArray(citas) ? citas : [];
        },
        error: (err) => {
          this.citas = [];
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar tus citas.');
        },
      });
  }

  diagnosticoDe(cita: CitaTecnico): DiagnosticoCita | null {
    return this.diagnosticos.get(cita.id) ?? cita.diagnostico ?? null;
  }

  /** Avanza el estado; finalizar pide confirmación primero. */
  avanzar(cita: CitaTecnico, transicion: TransicionTecnico): void {
    if (transicion.requiereConfirmacion) {
      this.abrirDialogo({ tipo: 'finalizar', cita, transicion });
      return;
    }
    this.cambiarEstado(cita, transicion);
  }

  abrirDialogo(dialogo: Dialogo): void {
    this.errorDialogo = null;
    this.dialogo = dialogo;
  }

  cerrarDialogo(): void {
    if (this.citaEnviando === null) this.dialogo = null;
  }

  confirmarFinalizar(): void {
    if (this.dialogo?.tipo !== 'finalizar') return;
    this.cambiarEstado(this.dialogo.cita, this.dialogo.transicion);
  }

  cancelar(motivo: string | undefined): void {
    if (this.dialogo?.tipo !== 'cancelar' || !motivo) return;
    const cita = this.dialogo.cita;
    this.ejecutar(
      cita,
      this.citaTecnicoService.cancelar(cita.id, motivo),
      'La cita fue cancelada.',
      'No fue posible cancelar la cita.',
      () => undefined
    );
  }

  guardarDiagnostico(solicitud: DiagnosticoRequest): void {
    if (this.dialogo?.tipo !== 'diagnostico') return;
    const cita = this.dialogo.cita;
    this.ejecutar(
      cita,
      this.citaTecnicoService.guardarDiagnostico(cita.id, solicitud),
      'El diagnóstico fue guardado.',
      'No fue posible guardar el diagnóstico.',
      (diagnostico) => this.diagnosticos.set(cita.id, diagnostico)
    );
  }

  private cambiarEstado(cita: CitaTecnico, transicion: TransicionTecnico): void {
    this.ejecutar(
      cita,
      this.citaTecnicoService.cambiarEstado(cita.id, transicion.destino),
      transicion.destino === 'FINALIZADA' ? 'El servicio fue finalizado.' : 'El estado de la cita fue actualizado.',
      'No fue posible actualizar el estado de la cita.',
      () => undefined
    );
  }

  private ejecutar<T>(
    cita: CitaTecnico,
    peticion: Observable<T>,
    exito: string,
    falla: string,
    alExito: (respuesta: T) => void
  ): void {
    this.citaEnviando = cita.id;
    this.errorDialogo = null;
    this.mensajeError = null;
    this.mensajeExito = null;

    peticion
      .pipe(
        finalize(() => {
          this.citaEnviando = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (respuesta) => {
          alExito(respuesta);
          this.dialogo = null;
          this.mensajeExito = exito;
          this.cargarCitas(true);
        },
        error: (err) => {
          const mensaje = obtenerMensajeError(err, falla);
          if (this.dialogo) this.errorDialogo = mensaje;
          else this.mensajeError = mensaje;
          // Si el estado cambió por otro lado (409), la lista se pone al día para que los botones coincidan.
          this.cargarCitas(true);
        },
      });
  }
}
