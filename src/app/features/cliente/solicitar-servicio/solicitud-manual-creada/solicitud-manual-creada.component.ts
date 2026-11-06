import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';

import { MotivoSolicitudEspecial } from '../../../../core/models/cita';
import { PerfilService } from '../../../../core/services/perfil.service';
import { mensajeClienteMotivo } from '../../../../core/utils/motivo-solicitud-especial';

/**
 * Pantalla para el cliente cuya solicitud no tiene franjas que elegir (sin técnicos para la especialidad o fuera
 * de cobertura): la solicitud ya existe y un administrador lo contactará.
 */
@Component({
  selector: 'app-solicitud-manual-creada',
  standalone: false,
  templateUrl: './solicitud-manual-creada.component.html',
})
export class SolicitudManualCreadaComponent implements OnInit, OnDestroy {
  @Input() motivo: MotivoSolicitudEspecial | null = null;
  @Input() especialidadNombre: string | null = null;
  @Input() direccion: string | null = null;
  @Output() volverInicio = new EventEmitter<void>();

  /** Teléfono con el que lo llamarán; null si la cuenta no tiene o no se pudo leer el perfil. */
  telefono: string | null = null;
  cargandoTelefono = true;

  private consulta?: Subscription;

  constructor(
    private perfilService: PerfilService,
    private cdr: ChangeDetectorRef
  ) {}

  get mensajeMotivo(): string {
    return mensajeClienteMotivo(this.motivo);
  }

  ngOnInit(): void {
    this.consulta = this.perfilService.obtener().subscribe({
      next: (perfil) => this.alLeerPerfil(perfil.telefono),
      // El teléfono es un dato de cortesía: si no se puede leer, se pide que lo agregue en el perfil.
      error: () => this.alLeerPerfil(null),
    });
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }

  private alLeerPerfil(telefono: string | null): void {
    this.telefono = telefono?.trim() || null;
    this.cargandoTelefono = false;
    this.cdr.markForCheck();
  }
}
