import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

import { ClienteAdminService, ClienteResponse } from '../../../../core/services/cliente-admin.service';
import {
  aActualizarCliente,
  crearFormularioPersona,
  valoresFormularioCliente,
} from '../../../../core/utils/formulario-persona';
import { obtenerMensajeErrorEscritura } from '../../../../core/utils/manejo-errores';

/** Edición de todos los datos de un cliente por el administrador. */
@Component({
  selector: 'app-cliente-modal',
  standalone: false,
  templateUrl: './cliente-modal.component.html',
})
export class ClienteModalComponent implements OnChanges {
  @Input() abierto = false;
  @Input() cliente: ClienteResponse | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<ClienteResponse>();

  form: FormGroup;
  cargando = false;
  errorMensaje: string | null = null;

  constructor(
    private fb: FormBuilder,
    private clienteAdminService: ClienteAdminService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.crearFormulario();
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (!cambios['abierto'] || !this.abierto || !this.cliente) return;

    this.errorMensaje = null;
    this.cargando = false;
    this.form = this.crearFormulario();
    this.form.patchValue(valoresFormularioCliente(this.cliente));
  }

  onSubmit(): void {
    if (!this.cliente) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMensaje = 'Revisa los campos marcados en rojo para continuar.';
      return;
    }

    this.errorMensaje = null;
    this.cargando = true;

    this.clienteAdminService.actualizar(this.cliente.id, aActualizarCliente(this.form.value)).subscribe({
      next: (cliente) => {
        this.cargando = false;
        this.guardado.emit(cliente);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje = obtenerMensajeErrorEscritura(
          err,
          'guardar los cambios',
          'La ubicación no es válida. Elige una dirección en Colombia.'
        );
        this.cdr.markForCheck();
      },
    });
  }

  private crearFormulario(): FormGroup {
    return crearFormularioPersona(this.fb, { edicion: true, ubicacionCliente: true });
  }
}
