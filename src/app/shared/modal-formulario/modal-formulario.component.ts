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
  /** Opcional: mantiene apagado el botón principal mientras falte algo obligatorio. */
  @Input() enviarDeshabilitado = false;
  /** Opcional: oculta Cancelar y el botón principal (p. ej. en una pantalla de agradecimiento con su propio botón). */
  @Input() sinAcciones = false;
  @Input() errorMensaje: string | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() enviar = new EventEmitter<void>();

  @ViewChild('panel', { static: true }) private panel!: ElementRef<HTMLElement>;

  private elementoPrevio: HTMLElement | null = null;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.cargando) this.cerrar.emit();
  }

  @HostListener('document:keydown', ['$event'])
  mantenerFoco(evento: Event): void {
    if (!(evento instanceof KeyboardEvent) || evento.key !== 'Tab') return;
    const campos = Array.from(this.panel.nativeElement.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]'))
      .filter(campo => !campo.matches(':disabled') && !campo.closest('[hidden]'));
    const primero = campos[0];
    const ultimo = campos.at(-1);
    if (!primero) { evento.preventDefault(); return; }
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault(); ultimo?.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault(); primero.focus();
    } else if (!this.panel.nativeElement.contains(document.activeElement)) {
      evento.preventDefault(); primero.focus();
    }
  }

  /** Al abrir enfoca el primer campo o botón; al cerrar devuelve el foco al control anterior. */
  ngAfterViewInit(): void {
    this.elementoPrevio = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const raiz = this.panel.nativeElement;
    const campo = raiz.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), select:not([disabled])');
    (campo ?? raiz.querySelector<HTMLElement>('button:not([disabled]), a[href]'))?.focus();
  }

  ngOnDestroy(): void {
    this.elementoPrevio?.focus();
  }
}
