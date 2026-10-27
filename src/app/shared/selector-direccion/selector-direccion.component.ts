import { Component, EventEmitter, Input, NgZone, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { catchError, concat, debounceTime, distinctUntilChanged, map, of, Subscription, switchMap } from 'rxjs';

import { UBICACION_POR_DEFECTO } from '../../core/config/api.config';
import { BuscadorDirecciones, GeocodificadorInverso, ResultadoDireccion } from '../../core/services/geocodificacion';
import { estaEnColombia, MENSAJE_FUERA_DE_COLOMBIA } from '../../core/utils/coordenadas';
import { PuntoMapa } from '../mapa-ubicacion/mapa-ubicacion.component';

/** `direccion` es null cuando el texto escrito no cambia (solo se movió el punto). */
export interface UbicacionElegida {
  direccion: string | null;
  latitud: number;
  longitud: number;
}

type EstadoBusqueda = 'inactivo' | 'cargando' | 'listo' | 'error';

const MINIMO_CARACTERES = 3;
const ESPERA_MS = 300;

/**
 * Campo "Dirección" con sugerencias, botón "Usar mi ubicación actual" y mapa con pin movible.
 * La persona nunca ve ni escribe coordenadas: salen por `ubicacionCambio`.
 */
@Component({
  selector: 'app-selector-direccion',
  standalone: false,
  templateUrl: './selector-direccion.component.html',
})
export class SelectorDireccionComponent implements OnInit, OnDestroy {
  @Input() direccion = '';
  @Input() latitud: number | null = null;
  @Input() longitud: number | null = null;
  @Input() deshabilitado = false;
  /** Mensaje de error del campo, controlado por el formulario padre. */
  @Input() errorDireccion: string | null = null;
  @Input() etiqueta = 'Dirección';
  /** false: solo campo y botón de ubicación, sin mapa (p. ej. registro de clientes). */
  @Input() mostrarMapa = true;

  @Output() ubicacionCambio = new EventEmitter<UbicacionElegida>();
  /** Texto del campo mientras se escribe (para el formulario padre). */
  @Output() direccionCambio = new EventEmitter<string>();

  readonly texto = new FormControl('', { nonNullable: true });
  readonly idBase = `selector-direccion-${Math.random().toString(36).slice(2, 8)}`;

  sugerencias: ResultadoDireccion[] = [];
  estado: EstadoBusqueda = 'inactivo';
  abierto = false;
  indiceActivo = -1;
  textoMuyCorto = false;

  puntoMapa: PuntoMapa | null = null;
  actualizandoDireccion = false;
  obteniendoUbicacion = false;
  avisoUbicacion: string | null = null;

  readonly geolocalizacionDisponible = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  readonly mensajeFueraDeColombia = MENSAJE_FUERA_DE_COLOMBIA;

  private suscripciones = new Subscription();
  private busquedaInversa?: Subscription;

  constructor(
    private buscador: BuscadorDirecciones,
    private geocodificadorInverso: GeocodificadorInverso,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.texto.setValue(this.direccion ?? '', { emitEvent: false });
    if (this.latitud !== null && this.longitud !== null) {
      this.puntoMapa = { latitud: this.latitud, longitud: this.longitud };
      // Ubicación ya guardada sin texto de dirección: se muestra la dirección que le corresponde.
      if (!this.texto.value.trim()) this.completarDireccion(this.puntoMapa);
    }

    // valueChanges solo se dispara cuando la persona escribe (los cambios internos usan emitEvent: false).
    this.suscripciones.add(
      this.texto.valueChanges.subscribe((valor) => {
        const largo = valor.trim().length;
        this.direccionCambio.emit(valor);
        this.textoMuyCorto = largo > 0 && largo < MINIMO_CARACTERES;
        if (largo < MINIMO_CARACTERES) {
          this.sugerencias = [];
          this.estado = 'inactivo';
          this.abierto = false;
        }
      })
    );

    // Mínimo 3 letras, espera de 300 ms y la consulta anterior se cancela (switchMap).
    this.suscripciones.add(
      this.texto.valueChanges
        .pipe(
          debounceTime(ESPERA_MS),
          map((valor) => valor.trim()),
          distinctUntilChanged(),
          switchMap((valor) => {
            if (valor.length < MINIMO_CARACTERES) {
              return of({ estado: 'inactivo' as EstadoBusqueda, lista: [] as ResultadoDireccion[] });
            }
            return concat(
              of({ estado: 'cargando' as EstadoBusqueda, lista: [] as ResultadoDireccion[] }),
              this.buscador.sugerirDirecciones(valor).pipe(
                map((lista) => ({ estado: 'listo' as EstadoBusqueda, lista })),
                catchError(() => of({ estado: 'error' as EstadoBusqueda, lista: [] as ResultadoDireccion[] }))
              )
            );
          })
        )
        .subscribe(({ estado, lista }) => {
          this.estado = estado;
          this.sugerencias = lista;
          this.indiceActivo = -1;
          this.abierto = estado !== 'inactivo';
        })
    );
  }

  ngOnDestroy(): void {
    this.suscripciones.unsubscribe();
    this.busquedaInversa?.unsubscribe();
  }

  get fueraDeColombia(): boolean {
    return !!this.puntoMapa && !estaEnColombia(this.puntoMapa.latitud, this.puntoMapa.longitud);
  }

  // ---- Teclado y selección ----

  onKeydown(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      this.abierto = false;
      return;
    }
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      if (!this.sugerencias.length) return;
      evento.preventDefault();
      this.abierto = true;
      const total = this.sugerencias.length;
      const paso = evento.key === 'ArrowDown' ? 1 : -1;
      this.indiceActivo = (this.indiceActivo + paso + total) % total;
      return;
    }
    if (evento.key === 'Enter') {
      // Enter nunca envía el formulario desde este campo.
      evento.preventDefault();
      if (this.abierto && this.indiceActivo >= 0) {
        this.elegir(this.sugerencias[this.indiceActivo]);
      } else if (this.abierto && this.sugerencias.length === 1) {
        this.elegir(this.sugerencias[0]);
      }
    }
  }

  elegir(sugerencia: ResultadoDireccion): void {
    this.texto.setValue(sugerencia.nombre, { emitEvent: false });
    this.direccionCambio.emit(sugerencia.nombre);
    this.abierto = false;
    this.sugerencias = [];
    this.estado = 'inactivo';
    this.textoMuyCorto = false;
    this.avisoUbicacion = null;
    this.busquedaInversa?.unsubscribe();
    this.actualizandoDireccion = false;
    const punto = this.fijarPunto(sugerencia.latitud, sugerencia.longitud);
    this.ubicacionCambio.emit({ direccion: sugerencia.nombre, ...punto });
  }

  // ---- Mi ubicación y pin ----

  usarMiUbicacion(): void {
    if (!this.geolocalizacionDisponible || this.obteniendoUbicacion) return;

    this.obteniendoUbicacion = true;
    this.avisoUbicacion = null;

    navigator.geolocation.getCurrentPosition(
      (posicion) =>
        this.zone.run(() => {
          this.obteniendoUbicacion = false;
          // Orden: latitud primero, longitud después.
          this.moverA(posicion.coords.latitude, posicion.coords.longitude);
        }),
      (error) =>
        this.zone.run(() => {
          this.obteniendoUbicacion = false;
          this.avisoUbicacion =
            error.code === error.PERMISSION_DENIED
              ? 'No nos diste permiso para saber dónde estás. Escribe tu dirección o toca el mapa.'
              : 'No pudimos saber dónde estás. Escribe tu dirección o toca el mapa.';
          // Se muestra el mapa para que la persona marque el lugar; aún no se guarda ninguna ubicación.
          this.puntoMapa ??= { ...UBICACION_POR_DEFECTO };
        }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  onPuntoCambio(punto: PuntoMapa): void {
    this.avisoUbicacion = null;
    this.moverA(punto.latitud, punto.longitud);
  }

  private moverA(latitud: number, longitud: number): void {
    const punto = this.fijarPunto(latitud, longitud);
    this.ubicacionCambio.emit({ direccion: null, ...punto });
    this.completarDireccion(punto);
  }

  private fijarPunto(latitud: number, longitud: number): PuntoMapa {
    const punto: PuntoMapa = { latitud: Number(latitud.toFixed(6)), longitud: Number(longitud.toFixed(6)) };
    this.puntoMapa = punto;
    return punto;
  }

  /** Geocodificación inversa: escribe la dirección que corresponde al pin. */
  private completarDireccion(punto: PuntoMapa): void {
    this.busquedaInversa?.unsubscribe();
    if (!estaEnColombia(punto.latitud, punto.longitud)) {
      this.actualizandoDireccion = false;
      return;
    }

    this.actualizandoDireccion = true;
    this.busquedaInversa = this.geocodificadorInverso.buscarPorCoordenadas(punto.latitud, punto.longitud).subscribe({
      next: (direccion) => {
        this.actualizandoDireccion = false;
        if (!direccion) return;
        this.texto.setValue(direccion, { emitEvent: false });
        this.direccionCambio.emit(direccion);
        this.ubicacionCambio.emit({ direccion, ...punto });
      },
      // Si falla, se conserva lo que la persona ya tenía escrito.
      error: () => (this.actualizandoDireccion = false),
    });
  }
}
