import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { FOTO_TIPOS_PERMITIDOS } from '../../core/config/foto.config';
import { ProcesadorImagenService } from '../../core/services/procesador-imagen.service';
import { ErrorImagen } from '../../core/utils/imagen';

/**
 * Elegir, previsualizar, guardar y quitar una foto de perfil. Valida y reduce la imagen en el
 * navegador, pero no habla con el servidor: quien lo usa recibe la imagen lista en `guardar`
 * (o el aviso `quitar`) y decide qué endpoint llamar.
 */
@Component({
  selector: 'app-carga-foto',
  standalone: false,
  templateUrl: './carga-foto.component.html',
})
export class CargaFotoComponent implements OnChanges {
  /** Foto actual guardada en el servidor. */
  @Input() fotoUrl: string | null | undefined = null;
  @Input() nombre: string | null | undefined = '';
  /** Verdadero mientras quien lo usa envía la foto o la quita. */
  @Input() enviando = false;
  /** Falso cuando el contexto no permite quitar la foto. */
  @Input() permitirQuitar = true;
  /** Error del servidor al guardar o quitar. */
  @Input() errorMensaje: string | null = null;
  @Output() guardar = new EventEmitter<string>();
  @Output() quitar = new EventEmitter<void>();

  readonly tiposAceptados = FOTO_TIPOS_PERMITIDOS.join(',');

  vistaPrevia: string | null = null;
  procesando = false;
  errorLocal: string | null = null;

  constructor(
    private procesador: ProcesadorImagenService,
    private cdr: ChangeDetectorRef
  ) {}

  get ocupado(): boolean {
    return this.procesando || this.enviando;
  }

  get error(): string | null {
    return this.errorLocal ?? this.errorMensaje;
  }

  ngOnChanges(cambios: SimpleChanges): void {
    // Cuando el servidor confirma una foto nueva (o se quita), la vista previa ya no hace falta.
    if (cambios['fotoUrl']) this.vistaPrevia = null;
  }

  async alElegirArchivo(evento: Event): Promise<void> {
    const campo = evento.target as HTMLInputElement;
    const archivo = campo.files?.[0];
    campo.value = '';
    if (!archivo) return;

    this.procesando = true;
    this.errorLocal = null;
    try {
      this.vistaPrevia = await this.procesador.procesar(archivo);
    } catch (error) {
      this.errorLocal = error instanceof ErrorImagen ? error.message : 'No pudimos preparar la imagen. Intenta con otra.';
    } finally {
      this.procesando = false;
      this.cdr.markForCheck();
    }
  }

  descartar(): void {
    this.vistaPrevia = null;
    this.errorLocal = null;
  }

  confirmar(): void {
    if (this.vistaPrevia) this.guardar.emit(this.vistaPrevia);
  }
}
