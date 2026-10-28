import {
  afterNextRender,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

import { BOUNCE_CARDS_VISTA_PREVIA } from '../../core/config/bounce-cards.config';
import { FOTO_TIPOS_PERMITIDOS, FOTOS_ELECTRODOMESTICO_MAXIMO } from '../../core/config/foto.config';
import { ProcesadorImagenService } from '../../core/services/procesador-imagen.service';
import { ErrorImagen } from '../../core/utils/imagen';
import { ImagenBounce } from '../bounce-cards/bounce-cards.component';

/**
 * Elegir hasta N fotos (opcionales), verlas como tarjetas con rebote y quitar las que no se quieran.
 * Cada foto se reduce y valida en el navegador; el componente no envía nada: quien lo usa recibe
 * en `fotosCambio` la lista de imágenes (data URL) y decide cuándo y adónde subirlas.
 */
@Component({
  selector: 'app-selector-fotos',
  standalone: false,
  templateUrl: './selector-fotos.component.html',
})
export class SelectorFotosComponent implements OnChanges {
  /** Cuántas fotos más se pueden agregar. */
  @Input() maximo = FOTOS_ELECTRODOMESTICO_MAXIMO;
  @Input() deshabilitado = false;
  /** Fotos con las que empieza (por ejemplo, un borrador guardado). */
  @Input() fotos: string[] = [];
  @Output() fotosCambio = new EventEmitter<string[]>();

  readonly tiposAceptados = FOTO_TIPOS_PERMITIDOS.join(',');
  readonly vistaPrevia = BOUNCE_CARDS_VISTA_PREVIA;

  vistas: string[] = [];
  /** Índice de la foto abierta en grande, o null. */
  ampliada: number | null = null;
  /** Las mismas fotos con su texto alternativo, para app-bounce-cards. */
  imagenes: ImagenBounce[] = [];
  procesando = false;
  error: string | null = null;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  constructor(
    private procesador: ProcesadorImagenService,
    private cdr: ChangeDetectorRef
  ) {}

  get lleno(): boolean {
    return this.vistas.length >= this.maximo;
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['fotos']) {
      this.vistas = this.fotos.slice(0, this.maximo);
      this.actualizarImagenes();
    }
  }

  async alElegir(evento: Event): Promise<void> {
    const campo = evento.target as HTMLInputElement;
    const archivos = Array.from(campo.files ?? []);
    campo.value = '';
    if (archivos.length === 0) return;

    this.error = null;
    this.procesando = true;
    const cupo = this.maximo - this.vistas.length;
    const aceptados = archivos.slice(0, Math.max(0, cupo));
    const errores: string[] = [];
    if (archivos.length > aceptados.length) {
      errores.push(`Solo puedes tener ${this.maximo} ${this.maximo === 1 ? 'foto' : 'fotos'}.`);
    }

    // Una por una: así el orden se conserva y se muestra el motivo de cada archivo rechazado.
    for (const archivo of aceptados) {
      try {
        this.vistas = [...this.vistas, await this.procesador.procesar(archivo)];
      } catch (error) {
        const motivo = error instanceof ErrorImagen ? error.message : 'No pudimos preparar la imagen.';
        errores.push(`${archivo.name}: ${motivo}`);
      }
    }

    this.error = errores.length > 0 ? errores.join(' ') : null;
    this.procesando = false;
    this.actualizarImagenes();
    this.fotosCambio.emit(this.vistas);
    this.cdr.markForCheck();
  }

  quitar(indice: number): void {
    this.vistas = this.vistas.filter((_, i) => i !== indice);
    this.actualizarImagenes();
    this.error = null;
    this.fotosCambio.emit(this.vistas);
    this.devolverFoco(indice);
  }

  /** El botón que se usó desaparece: el foco pasa al siguiente "Quitar foto" o, si no quedan, a "Agregar fotos". */
  private devolverFoco(indice: number): void {
    afterNextRender(
      () => {
        const quitar = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('[data-quitar]'));
        const destino = quitar[Math.min(indice, quitar.length - 1)] ?? this.host.nativeElement.querySelector<HTMLElement>('[data-agregar]');
        destino?.focus();
      },
      { injector: this.injector }
    );
  }

  private actualizarImagenes(): void {
    this.imagenes = this.vistas.map((src, i) => ({ src, alt: `Foto ${i + 1} del electrodoméstico` }));
  }
}
