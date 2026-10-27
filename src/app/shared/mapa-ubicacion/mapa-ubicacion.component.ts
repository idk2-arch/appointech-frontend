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
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import * as L from 'leaflet';

export interface PuntoMapa {
  latitud: number;
  longitud: number;
}

const ZOOM_INICIAL = 17;

/**
 * Mapa Leaflet con un pin arrastrable. Tocar el mapa también mueve el pin.
 * Leaflet corre fuera de la zona de Angular (como GradientWavesComponent) y
 * solo se vuelve a entrar para emitir `puntoCambio`.
 *
 * Aislamiento de estilos: el CSS de Leaflet se importa aquí (no en angular.json),
 * así solo se carga con la pantalla que usa el mapa. Va con ViewEncapsulation.None
 * porque Leaflet crea su propio DOM; todas las reglas propias cuelgan de
 * `.mapa-ubicacion` para no tocar nada fuera del mapa.
 *
 * Se usa un divIcon propio en lugar del ícono por defecto de Leaflet porque
 * este último depende de rutas de imágenes que el bundler no resuelve.
 */
@Component({
  selector: 'app-mapa-ubicacion',
  standalone: false,
  templateUrl: './mapa-ubicacion.component.html',
  styleUrls: ['./mapa-ubicacion.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class MapaUbicacionComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) latitud!: number;
  @Input({ required: true }) longitud!: number;
  @Output() puntoCambio = new EventEmitter<PuntoMapa>();

  @ViewChild('contenedor', { static: true }) private contenedorRef!: ElementRef<HTMLElement>;

  private mapa?: L.Map;
  private pin?: L.Marker;
  private observadorTamano?: ResizeObserver;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const centro = L.latLng(this.latitud, this.longitud);

      this.mapa = L.map(this.contenedorRef.nativeElement, {
        center: centro,
        zoom: ZOOM_INICIAL,
        // Evita que la rueda del ratón o el scroll de la página hagan zoom por accidente.
        scrollWheelZoom: false,
      });

      // Mosaicos de OpenStreetMap: la atribución es obligatoria.
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(this.mapa);

      this.pin = L.marker(centro, {
        draggable: true,
        autoPan: true,
        keyboard: true,
        title: 'Arrastra para mover',
        icon: L.divIcon({
          className: 'mapa-ubicacion__pin',
          html: `<svg viewBox="0 0 40 52" width="32" height="42" aria-hidden="true">
              <path d="M20 50s16-15.2 16-29A16 16 0 0 0 4 21c0 13.8 16 29 16 29z" fill="#D98E4A" stroke="#0B1224" stroke-width="2.5"/>
              <circle cx="20" cy="20.5" r="6.5" fill="#0B1224"/>
            </svg>`,
          iconSize: [32, 42],
          iconAnchor: [16, 40],
        }),
      }).addTo(this.mapa);

      // Al soltar el pin (no mientras se arrastra) se emite el punto final.
      this.pin.on('dragend', () => {
        const punto = this.pin!.getLatLng();
        this.emitir(punto.lat, punto.lng);
      });

      this.mapa.on('click', (evento: L.LeafletMouseEvent) => {
        this.pin?.setLatLng(evento.latlng);
        this.emitir(evento.latlng.lat, evento.latlng.lng);
      });

      // Si el contenedor cambia de tamaño (rotar el móvil), recalcula para no dejar huecos grises.
      this.observadorTamano = new ResizeObserver(() => this.mapa?.invalidateSize());
      this.observadorTamano.observe(this.contenedorRef.nativeElement);
    });
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (!this.mapa || !this.pin) return;
    if (!cambios['latitud'] && !cambios['longitud']) return;

    const actual = this.pin.getLatLng();
    if (actual.lat === this.latitud && actual.lng === this.longitud) return;

    this.zone.runOutsideAngular(() => {
      const nuevo = L.latLng(this.latitud, this.longitud);
      this.pin!.setLatLng(nuevo);
      this.mapa!.setView(nuevo, ZOOM_INICIAL);
    });
  }

  ngOnDestroy(): void {
    this.observadorTamano?.disconnect();
    this.mapa?.remove();
  }

  private emitir(latitud: number, longitud: number): void {
    // Orden: latitud primero, longitud después.
    const punto: PuntoMapa = {
      latitud: Number(latitud.toFixed(6)),
      longitud: Number(longitud.toFixed(6)),
    };
    this.zone.run(() => this.puntoCambio.emit(punto));
  }
}
