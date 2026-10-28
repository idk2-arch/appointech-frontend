import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';

import { MAX_MOTIVO, validadoresMotivo } from '../../core/utils/validadores-cita';

/**
 * Diálogo para pedir un motivo (cancelar una cita). Es obligatorio o no según `obligatorio`;
 * en ambos casos admite hasta 500 caracteres. El texto se emite recortado, o `undefined` si quedó vacío.
 */
@Component({
  selector: 'app-dialogo-motivo',
  standalone: false,
  templateUrl: './dialogo-motivo.component.html',
})
export class DialogoMotivoComponent implements OnInit {
  @Input({ required: true }) titulo!: string;
  @Input() subtitulo = '';
  @Input() etiqueta = 'Motivo';
  @Input() obligatorio = false;
  @Input() textoEnviar = 'Confirmar';
  @Input() textoCargando = 'Enviando…';
  @Input() cargando = false;
  @Input() errorMensaje: string | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() confirmar = new EventEmitter<string | undefined>();

  readonly max = MAX_MOTIVO;
  motivo = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.motivo.setValidators(validadoresMotivo(this.obligatorio));
    this.motivo.updateValueAndValidity();
  }

  enviar(): void {
    if (this.motivo.invalid) {
      this.motivo.markAsTouched();
      return;
    }
    this.confirmar.emit(this.motivo.value.trim() || undefined);
  }
}
