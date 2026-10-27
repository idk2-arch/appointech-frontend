import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import * as L from 'leaflet';

import { ParadaRuta, PuntoGeografico } from '../../../../core/models/tecnico-agenda';

/**
 * Mapa de la ruta del día: la base, un pin numerado por parada (en orden de visita)
 * y una línea que las une. La línea es solo el ORDEN de visita, no el camino por
 * carretera: el backend no entrega la geometría de la ruta.
 *
 * Mismo criterio que MapaUbicacionComponent: Leaflet fuera de la zona de Angular,
 * CSS de Leaflet importado aquí (no global), ViewEncapsulation.None y reglas
 * propias colgando de `.mapa-ruta`. Mosaicos de OpenStreetMap con su atribución.
 */
@Component({
  selector: 'app-mapa-ruta',
  standalone: false,
  templateUrl: './mapa-ruta.component.html',
  styleUrls: ['./mapa-ruta.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class MapaRutaComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) origen!: PuntoGeografico;
  @Input() paradas: ParadaRuta[] = [];

  @ViewChild('contenedor', { static: true }) private contenedorRef!: ElementRef<HTMLElement>;

  private mapa?: L.Map;
  private capa?: L.LayerGroup;
  private observadorTamano?: ResizeObserver;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.mapa = L.map(this.contenedorRef.nativeElement, {
        center: L.latLng(this.origen.latitud, this.origen.longitud),
        zoom: 13,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(this.mapa);

      this.capa = L.layerGroup().addTo(this.mapa);
      this.dibujar();

      this.observadorTamano = new ResizeObserver(() => this.mapa?.invalidateSize());
      this.observadorTamano.observe(this.contenedorRef.nativeElement);
    });
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (this.mapa && (cambios['origen'] || cambios['paradas'])) {
      this.zone.runOutsideAngular(() => this.dibujar());
    }
  }

  ngOnDestroy(): void {
    this.observadorTamano?.disconnect();
    this.mapa?.remove();
  }

  private dibujar(): void {
    if (!this.mapa || !this.capa) return;
    this.capa.clearLayers();

    const base = L.latLng(this.origen.latitud, this.origen.longitud);
    const puntos: L.LatLng[] = [base];

    L.marker(base, {
      title: 'Tu base',
      icon: L.divIcon({
        className: 'mapa-ruta__pin',
        html: `<span class="mapa-ruta__base" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 11l8-7 8 7M6 10v10h12V10"/>
            </svg>
          </span>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
    }).addTo(this.capa);

    for (const parada of this.paradas) {
      // Una parada sin coordenadas sigue en la lista, pero no tiene pin.
      if (parada.latitud === null || parada.longitud === null) continue;
      const punto = L.latLng(parada.latitud, parada.longitud);
      puntos.push(punto);

      const clase = parada.alcanzaATiempo ? 'mapa-ruta__parada' : 'mapa-ruta__parada mapa-ruta__parada--alerta';
      L.marker(punto, {
        title: `Parada ${parada.orden}: ${parada.direccionServicio}`,
        icon: L.divIcon({
          className: 'mapa-ruta__pin',
          html: `<span class="${clase}">${Number(parada.orden)}</span>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
      }).addTo(this.capa);
    }

    if (puntos.length > 1) {
      L.polyline(puntos, { color: '#D98E4A', weight: 3, opacity: 0.9, dashArray: '8 8' }).addTo(this.capa);
      this.mapa.fitBounds(L.latLngBounds(puntos), { padding: [40, 40], maxZoom: 16 });
    } else {
      this.mapa.setView(base, 15);
    }
  }
}
