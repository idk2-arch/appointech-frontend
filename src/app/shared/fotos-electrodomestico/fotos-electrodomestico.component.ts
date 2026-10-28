import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { Subscription } from 'rxjs';

import { FotoElectrodomestico } from '../../core/models/cita';
import { FotoCitaService } from '../../core/services/foto-cita.service';
import { ItemCardSwap } from '../card-swap/card-swap.component';

/**
 * Fotos del electrodoméstico de una cita en una pila de cartas. Descarga cada imagen con el token
 * (FotoCitaService) y, al tocar la carta del frente, la abre en grande (app-foto-ampliada). Con `editable`, muestra
 * además miniaturas con un botón para quitar cada foto.
 */
@Component({
  selector: 'app-fotos-electrodomestico',
  standalone: false,
  templateUrl: './fotos-electrodomestico.component.html',
  // Un servicio por componente: sus URLs de objeto se liberan al destruirse.
  providers: [FotoCitaService],
})
export class FotosElectrodomesticoComponent implements OnChanges, OnDestroy {
  @Input() fotos: FotoElectrodomestico[] | null | undefined = [];
  @Input() editable = false;
  /** Verdadero mientras se quita una foto, para deshabilitar los botones. */
  @Input() ocupado = false;
  @Output() quitar = new EventEmitter<FotoElectrodomestico>();

  items: ItemCardSwap[] = [];
  /** Fotos de `items`, en el mismo orden (para quitar desde las miniaturas). */
  cargadas: FotoElectrodomestico[] = [];
  cargando = false;
  fallidas = 0;
  /** Índice de la carta al frente. */
  frente = 0;
  /** Índice de la foto abierta en grande, o null. */
  ampliada: number | null = null;

  private readonly urls = new Map<number, string>();
  private readonly fallos = new Set<number>();
  private readonly rutas = new Map<number, string>();
  private readonly pendientes = new Map<number, Subscription>();

  constructor(
    private fotoCita: FotoCitaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(): void {
    const lista = this.fotos ?? [];
    this.soltarAusentes(lista);
    lista.forEach((foto) => this.descargar(foto));
    this.reconstruir();
  }

  ngOnDestroy(): void {
    this.pendientes.forEach((descarga) => descarga.unsubscribe());
    this.pendientes.clear();
  }

  reintentar(): void {
    this.fallos.clear();
    this.ngOnChanges();
  }

  alCambiarFrente(indice: number): void {
    this.frente = indice;
  }

  /** Tocar la carta del frente la abre en grande; tocar una de atrás solo la trae al frente. */
  alPulsarCarta(indice: number): void {
    if (indice !== this.frente) return;
    this.ampliada = indice;
    this.cdr.markForCheck();
  }

  cerrarAmpliada(): void {
    if (this.ampliada === null) return;
    this.ampliada = null;
    this.cdr.markForCheck();
  }

  private descargar(foto: FotoElectrodomestico): void {
    if (this.urls.has(foto.id) || this.fallos.has(foto.id) || this.pendientes.has(foto.id)) return;
    this.rutas.set(foto.id, foto.url);
    const descarga = this.fotoCita.urlSegura(foto.url).subscribe({
      next: (url) => this.urls.set(foto.id, url),
      error: () => this.fallos.add(foto.id),
    });
    // Si la respuesta ya estaba en memoria, el subscribe se resolvió de inmediato.
    if (!descarga.closed) this.pendientes.set(foto.id, descarga);
    descarga.add(() => {
      this.pendientes.delete(foto.id);
      this.reconstruir();
      this.cdr.markForCheck();
    });
  }

  /** Libera las fotos que ya no están en la lista (por ejemplo, las que se quitaron). */
  private soltarAusentes(lista: FotoElectrodomestico[]): void {
    const ids = new Set(lista.map((f) => f.id));
    for (const id of [...this.urls.keys()]) {
      if (ids.has(id)) continue;
      const ruta = this.rutas.get(id);
      if (ruta) this.fotoCita.liberar(ruta);
      this.urls.delete(id);
      this.rutas.delete(id);
    }
    for (const id of [...this.pendientes.keys()]) {
      if (ids.has(id)) continue;
      this.pendientes.get(id)?.unsubscribe();
      this.pendientes.delete(id);
    }
    for (const id of [...this.fallos]) if (!ids.has(id)) this.fallos.delete(id);
  }

  /** Las cartas se arman cuando terminan todas las descargas, para no reiniciar la pila a cada foto. */
  private reconstruir(): void {
    const lista = this.fotos ?? [];
    this.cargando = this.pendientes.size > 0;
    if (this.cargando) return;

    this.cargadas = lista.filter((f) => this.urls.has(f.id));
    this.fallidas = lista.length - this.cargadas.length;
    this.items = this.cargadas.map((foto, i) => ({
      title: `Foto ${i + 1}`,
      imageUrl: this.urls.get(foto.id) as string,
      alt: `Foto ${i + 1} del electrodoméstico`,
    }));
    if (this.frente >= this.items.length) this.frente = 0;
  }
}
