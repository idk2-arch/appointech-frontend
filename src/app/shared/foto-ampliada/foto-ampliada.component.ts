import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, ViewChild } from '@angular/core';

/**
 * Diálogo que muestra una foto en grande. Se cierra con la X, con un clic afuera o con Escape; al
 * abrirse lleva el foco a la X y, al cerrarse, lo devuelve a lo que lo tenía antes (la carta pulsada).
 * Quien lo usa decide cuándo mostrarlo (@if) y de dónde sale la imagen.
 */
@Component({
  selector: 'app-foto-ampliada',
  standalone: false,
  templateUrl: './foto-ampliada.component.html',
})
export class FotoAmpliadaComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) src!: string;
  @Input() alt = '';
  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('botonCerrar', { static: true }) private botonCerrar!: ElementRef<HTMLButtonElement>;

  private elementoPrevio: HTMLElement | null = null;

  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    this.cerrar.emit();
  }

  ngAfterViewInit(): void {
    this.elementoPrevio = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.botonCerrar.nativeElement.focus();
  }

  ngOnDestroy(): void {
    if (this.elementoPrevio?.isConnected) this.elementoPrevio.focus();
  }
}
