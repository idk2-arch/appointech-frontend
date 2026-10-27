import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

/**
 * Marco común de los formularios en ventana (título, cierre, error, Cancelar y Guardar).
 * El contenido del formulario se proyecta; quien lo usa decide cuándo mostrarlo (@if),
 * así los campos se crean de nuevo cada vez que se abre.
 */
@Component({
  selector: 'app-modal-formulario',
  standalone: false,
  templateUrl: './modal-formulario.component.html',
})
export class ModalFormularioComponent {
  @Input({ required: true }) titulo!: string;
  @Input() subtitulo = '';
  @Input() textoEnviar = 'Guardar cambios';
  @Input() textoCargando = 'Guardando…';
  @Input() cargando = false;
  @Input() errorMensaje: string | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() enviar = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.cargando) this.cerrar.emit();
  }
}
