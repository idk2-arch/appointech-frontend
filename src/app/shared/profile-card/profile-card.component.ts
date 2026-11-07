import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';

import { iniciales } from '../../core/utils/iniciales';
import { MotorTarjeta } from './profile-card.motor';
import { esColorOscuro, GRANO, LAMINAS, TEMAS } from './profile-card.temas';

type TemaTarjeta = 'dark' | 'light';

/** Safari en iPhone pide permiso para leer la orientación del teléfono. */
type EventoOrientacionConPermiso = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };

const limitar = (valor: number, min: number, max: number): number => Math.min(max, Math.max(min, valor));

/**
 * Tarjeta de perfil con inclinación 3D hacia el cursor, brillo y lámina holográfica.
 * Es informativa: solo el botón de contacto (si hay `contactText`) es interactivo.
 * Sin `avatarUrl` (o si la imagen no carga) muestra las iniciales de `name` sobre un degradado de acento.
 * Los estilos son globales (sin encapsulación) con prefijo `.profile-card` porque el movimiento escribe
 * variables CSS en el elemento raíz.
 */
@Component({
  selector: 'app-profile-card',
  standalone: false,
  templateUrl: './profile-card.component.html',
  styleUrl: './profile-card.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class ProfileCardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() avatarUrl = '';
  /** Patrón repetible (URL o data URI) a través del cual se ve la lámina holográfica. */
  @Input() iconUrl?: string;
  @Input() miniAvatarUrl?: string;
  @Input() name = '';
  @Input() title = '';
  @Input() handle = '';
  /** Texto delante del `handle`; vacío para mostrar un correo tal cual. */
  @Input() handlePrefix = '@';
  @Input() status = '';
  @Input() statusColor = '#22c55e';
  /** Texto del botón de contacto; vacío = sin botón. */
  @Input() contactText = '';
  @Input() showUserInfo = true;
  @Input() theme: TemaTarjeta = 'dark';
  @Input() backdropColor?: string;
  @Input() radius = 16;
  @Input() holo = 0.8;
  @Input() glare = 0.5;
  @Input() enableTilt = true;
  @Input() tiltStrength = 12;
  @Input() parallax = 8;
  @Input() enableMobileTilt = false;
  @Input() mobileTiltSensitivity = 5;
  @Input() intro = true;
  @Output() contactClick = new EventEmitter<void>();

  @ViewChild('raiz', { static: true }) private raiz!: ElementRef<HTMLElement>;

  /** La foto no cargó: se muestran las iniciales como si no hubiera foto. */
  fotoFallida = false;

  private motor?: MotorTarjeta;
  private escuchandoOrientacion = false;
  private quitarClick?: () => void;

  constructor(private zona: NgZone) {}

  get iniciales(): string {
    return this.name.trim() ? iniciales(this.name) : '';
  }

  get conFoto(): boolean {
    return !!this.avatarUrl && !this.fotoFallida;
  }

  get etiquetaContacto(): string {
    return this.name ? `${this.contactText} ${this.name}` : this.contactText;
  }

  ngAfterViewInit(): void {
    this.aplicarVariables();
    // El movimiento corre fuera de Angular: cada cuadro escribe estilos sin disparar detección de cambios.
    this.zona.runOutsideAngular(() => {
      this.motor = new MotorTarjeta(this.raiz.nativeElement, () => this);
      this.motor.iniciar();
      this.configurarInclinacionMovil();
    });
  }

  ngOnChanges(cambios: { [clave: string]: unknown }): void {
    if (!this.motor) return;
    this.aplicarVariables();
    this.motor.escribir();
    if (cambios['avatarUrl']) this.fotoFallida = false;
    if (cambios['enableMobileTilt']) this.zona.runOutsideAngular(() => this.configurarInclinacionMovil());
  }

  ngOnDestroy(): void {
    this.motor?.destruir();
    this.motor = undefined;
    this.detenerInclinacionMovil();
  }

  alFallarFoto(): void {
    this.fotoFallida = true;
  }

  /** Tema, colores y patrón: todo se escribe como variable CSS en la raíz, sin [style] ni ngStyle. */
  private aplicarVariables(): void {
    const estilo = this.raiz.nativeElement.style;
    const paleta: TemaTarjeta = this.theme === 'light' ? 'light' : 'dark';
    const oscuro = this.backdropColor ? (esColorOscuro(this.backdropColor) ?? paleta === 'dark') : paleta === 'dark';
    const lamina: TemaTarjeta = this.backdropColor ? (oscuro ? 'dark' : 'light') : paleta;
    const fondo = this.backdropColor
      ? `linear-gradient(180deg, color-mix(in srgb, ${this.backdropColor}, #ffffff 12%) 0%, color-mix(in srgb, ${this.backdropColor}, #000000 18%) 100%)`
      : 'var(--pc-tile)';

    const variables: Record<string, string> = {
      ...TEMAS[paleta],
      ...LAMINAS[lamina],
      '--pc-radius': `${Math.max(0, this.radius)}px`,
      '--pc-backdrop': fondo,
      '--pc-holo': String(limitar(this.holo, 0, 1)),
      '--pc-glare': String(limitar(this.glare, 0, 1)),
      '--pc-parallax': `${Math.max(0, this.parallax)}px`,
      '--pc-status': this.statusColor,
      '--pc-grain': GRANO,
      '--pc-pattern': this.iconUrl ? `url("${this.iconUrl}")` : 'linear-gradient(#000, #000)',
      '--pc-pattern-size': this.iconUrl ? '180% auto' : '100% 100%',
      '--pc-holo-gain': this.iconUrl ? '1.25' : '0.75',
      '--pc-holo-detail': this.iconUrl && lamina === 'dark' ? '1' : '0',
    };
    for (const [clave, valor] of Object.entries(variables)) estilo.setProperty(clave, valor);
  }

  private readonly alOrientar = (evento: DeviceOrientationEvent): void => {
    if (evento.beta == null || evento.gamma == null) return;
    const sensibilidad = this.mobileTiltSensitivity;
    this.motor?.apuntar((evento.gamma * sensibilidad) / 150, ((evento.beta - 20) * sensibilidad) / 150);
  };

  private escucharOrientacion(): void {
    if (this.escuchandoOrientacion) return;
    this.escuchandoOrientacion = true;
    window.addEventListener('deviceorientation', this.alOrientar);
  }

  private readonly alPulsar = (): void => {
    const Movimiento = window.DeviceOrientationEvent as EventoOrientacionConPermiso | undefined;
    if (Movimiento && typeof Movimiento.requestPermission === 'function') {
      Movimiento.requestPermission().then(
        (estado) => {
          if (estado === 'granted') this.escucharOrientacion();
        },
        () => undefined
      );
    } else {
      this.escucharOrientacion();
    }
  };

  /** La inclinación por orientación del teléfono es opcional y arranca con un toque (iOS pide permiso). */
  private configurarInclinacionMovil(): void {
    this.detenerInclinacionMovil();
    if (!this.enableMobileTilt) return;
    const raiz = this.raiz.nativeElement;
    raiz.addEventListener('click', this.alPulsar);
    this.quitarClick = () => raiz.removeEventListener('click', this.alPulsar);
  }

  private detenerInclinacionMovil(): void {
    this.quitarClick?.();
    this.quitarClick = undefined;
    window.removeEventListener('deviceorientation', this.alOrientar);
    this.escuchandoOrientacion = false;
  }
}
