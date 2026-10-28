import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';

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
export class ModalFormularioComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) titulo!: string;
  @Input() subtitulo = '';
  @Input() textoEnviar = 'Guardar cambios';
  @Input() textoCargando = 'Guardando…';
  @Input() cargando = false;
  @Input() errorMensaje: string | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() enviar = new EventEmitter<void>();

  @ViewChild('panel', { static: true }) private panel!: ElementRef<HTMLElement>;

  private elementoPrevio: HTMLElement | null = null;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.cargando) this.cerrar.emit();
  }

  /** Al abrir, el foco pasa al primer campo (o al diálogo) y al cerrar vuelve a donde estaba. */
  ngAfterViewInit(): void {
    this.elementoPrevio = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const raiz = this.panel.nativeElement;
    const campo = raiz.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), select:not([disabled])');
    (campo ?? raiz).focus();
  }

  ngOnDestroy(): void {
    this.elementoPrevio?.focus();
  }
}
