import {
  afterNextRender,
  ChangeDetectorRef,
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  Injector,
  Input,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type ValorSelect = string | number | null;

export interface OpcionSelect {
  value: ValorSelect;
  label: string;
}

/** Alto máximo del menú (15 rem) para decidir si abre hacia arriba. */
const ALTO_MAXIMO_MENU_PX = 240;
const ALTO_OPCION_PX = 36;
const PAUSA_BUSQUEDA_MS = 600;

let siguienteId = 0;

/**
 * Selector desplegable con la estética del proyecto (menú oscuro, píldora naranja que se desliza
 * entre opciones y marca en la elegida). Funciona con formularios reactivos y con ngModel.
 * Teclado: flechas, Home/End, Enter o espacio para elegir, Escape para cerrar y letras para buscar.
 */
@Component({
  selector: 'app-select',
  standalone: false,
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.css'],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true }],
})
export class SelectComponent implements ControlValueAccessor, OnDestroy {
  @Input() options: OpcionSelect[] = [];
  @Input() placeholder = 'Selecciona una opción';
  @Input() disabled = false;
  @Input() ariaLabel: string | null = null;
  /** id del botón, para enlazarlo con un <label for>. */
  @Input() inputId: string | null = null;
  /** Clases extra para el botón (por ejemplo, para igualar la altura de otros campos). */
  @Input() claseBoton = '';

  readonly listaId = `app-select-${++siguienteId}`;

  valor: ValorSelect = null;
  abierto = false;
  arriba = false;
  indiceActivo = -1;

  @ViewChild('boton', { static: true }) private boton!: ElementRef<HTMLButtonElement>;
  @ViewChildren('opcion') private opcionesEl!: QueryList<ElementRef<HTMLElement>>;

  private deshabilitadoPorFormulario = false;
  private busqueda = '';
  private temporizadorBusqueda?: ReturnType<typeof setTimeout>;
  private onChange: (valor: ValorSelect) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly injector = inject(Injector);

  get estaDeshabilitado(): boolean {
    return this.disabled || this.deshabilitadoPorFormulario;
  }

  get seleccion(): OpcionSelect | null {
    return this.options.find((o) => this.iguales(o.value, this.valor)) ?? null;
  }

  get idActivo(): string | null {
    return this.abierto && this.indiceActivo >= 0 ? `${this.listaId}-${this.indiceActivo}` : null;
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizadorBusqueda);
  }

  // ControlValueAccessor
  writeValue(valor: ValorSelect): void {
    this.valor = valor ?? null;
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (valor: ValorSelect) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitadoPorFormulario = deshabilitado;
    if (deshabilitado) this.cerrar();
    this.cdr.markForCheck();
  }

  alternar(): void {
    if (this.estaDeshabilitado) return;
    if (this.abierto) this.cerrar();
    else this.abrir();
  }

  abrir(): void {
    if (this.estaDeshabilitado || this.abierto) return;
    const caja = this.boton.nativeElement.getBoundingClientRect();
    const alto = Math.min(ALTO_MAXIMO_MENU_PX, this.options.length * ALTO_OPCION_PX + 8);
    const espacioAbajo = window.innerHeight - caja.bottom;
    this.arriba = espacioAbajo < alto + 8 && caja.top > espacioAbajo;

    const elegido = this.options.findIndex((o) => this.iguales(o.value, this.valor));
    this.indiceActivo = elegido >= 0 ? elegido : this.options.length > 0 ? 0 : -1;
    this.abierto = true;
    this.mostrarActiva();
  }

  cerrar(): void {
    if (!this.abierto) return;
    this.abierto = false;
    this.indiceActivo = -1;
    this.busqueda = '';
    this.onTouched();
    this.cdr.markForCheck();
  }

  resaltar(indice: number): void {
    this.indiceActivo = indice;
  }

  elegir(indice: number): void {
    const opcion = this.options[indice];
    if (!opcion) return;
    if (!this.iguales(opcion.value, this.valor)) {
      this.valor = opcion.value;
      this.onChange(opcion.value);
    }
    this.cerrar();
    this.boton.nativeElement.focus();
  }

  alPresionarTecla(evento: KeyboardEvent): void {
    if (this.estaDeshabilitado) return;

    switch (evento.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        evento.preventDefault();
        if (!this.abierto) {
          this.abrir();
          return;
        }
        const paso = evento.key === 'ArrowDown' ? 1 : -1;
        this.moverA(Math.min(Math.max(this.indiceActivo + paso, 0), this.options.length - 1));
        return;
      }
      case 'Home':
      case 'End':
        evento.preventDefault();
        if (!this.abierto) this.abrir();
        this.moverA(evento.key === 'Home' ? 0 : this.options.length - 1);
        return;
      case 'Enter':
        evento.preventDefault();
        if (this.abierto) this.elegir(this.indiceActivo);
        else this.abrir();
        return;
      case 'Escape':
        if (this.abierto) {
          // Evita que el Escape cierre también un diálogo que contenga al selector.
          evento.preventDefault();
          evento.stopPropagation();
          this.cerrar();
        }
        return;
      case 'Tab':
        this.cerrar();
        return;
      case ' ':
        if (!this.busqueda) {
          evento.preventDefault();
          if (this.abierto) this.elegir(this.indiceActivo);
          else this.abrir();
          return;
        }
        break;
    }

    if (evento.key.length === 1 && !evento.ctrlKey && !evento.metaKey && !evento.altKey) {
      evento.preventDefault();
      this.buscar(evento.key);
    }
  }

  @HostListener('document:click', ['$event'])
  alHacerClicFuera(evento: Event): void {
    if (this.abierto && !this.host.nativeElement.contains(evento.target as Node)) this.cerrar();
  }

  private moverA(indice: number): void {
    this.indiceActivo = indice;
    this.mostrarActiva();
    this.cdr.markForCheck();
  }

  /** Escribir letras seguidas afina la búsqueda; una pausa la reinicia. */
  private buscar(letra: string): void {
    if (!this.abierto) this.abrir();
    this.busqueda += letra.toLowerCase();
    clearTimeout(this.temporizadorBusqueda);
    this.temporizadorBusqueda = setTimeout(() => (this.busqueda = ''), PAUSA_BUSQUEDA_MS);

    // Con una sola letra repetida se avanza a la siguiente coincidencia.
    const inicio = this.busqueda.length === 1 ? this.indiceActivo + 1 : this.indiceActivo;
    const total = this.options.length;
    for (let i = 0; i < total; i++) {
      const candidata = (inicio + i + total) % total;
      if (this.options[candidata].label.toLowerCase().startsWith(this.busqueda)) {
        this.moverA(candidata);
        return;
      }
    }
  }

  private mostrarActiva(): void {
    afterNextRender(
      () => this.opcionesEl.get(this.indiceActivo)?.nativeElement.scrollIntoView?.({ block: 'nearest' }),
      { injector: this.injector }
    );
  }

  private iguales(a: ValorSelect, b: ValorSelect): boolean {
    return a === b || (a !== null && b !== null && String(a) === String(b));
  }
}
