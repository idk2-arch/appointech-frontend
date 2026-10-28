import { Component, inject, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder } from '@angular/forms';

import { DiagnosticoCita, DiagnosticoRequest } from '../../../core/models/cita';
import {
  MAX_DIAGNOSTICO,
  MAX_RECOMENDACIONES,
  validadoresDiagnostico,
  validadoresRecomendaciones,
} from '../../../core/utils/validadores-cita';

/** Formulario del diagnóstico de una cita en proceso; si ya existe uno, se abre con sus datos para corregirlos. */
@Component({
  selector: 'app-diagnostico-modal',
  standalone: false,
  templateUrl: './diagnostico-modal.component.html',
})
export class DiagnosticoModalComponent implements OnInit {
  @Input() existente: DiagnosticoCita | null = null;
  @Input() cargando = false;
  @Input() errorMensaje: string | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<DiagnosticoRequest>();

  readonly maxDiagnostico = MAX_DIAGNOSTICO;
  readonly maxRecomendaciones = MAX_RECOMENDACIONES;

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    diagnostico: ['', validadoresDiagnostico],
    recomendaciones: ['', validadoresRecomendaciones],
  });

  ngOnInit(): void {
    if (this.existente) {
      this.form.setValue({
        diagnostico: this.existente.diagnostico,
        recomendaciones: this.existente.recomendaciones ?? '',
      });
    }
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { diagnostico, recomendaciones } = this.form.getRawValue();
    const solicitud: DiagnosticoRequest = { diagnostico: diagnostico.trim() };
    if (recomendaciones.trim()) solicitud.recomendaciones = recomendaciones.trim();
    this.guardar.emit(solicitud);
  }
}
