import { AfterViewInit, Directive, ElementRef, EventEmitter, OnDestroy, Output } from '@angular/core';

/** Cuántos píxeles antes de entrar a la pantalla se avisa: da tiempo a pedir lo que se va a ver. */
const MARGEN_PX = 200;

/**
 * Avisa una sola vez (`alEntrar`) cuando el elemento está a punto de verse. Sirve para pedir datos solo de lo que
 * está en pantalla (o cerca) en vez de todo a la vez. Sin IntersectionObserver avisa enseguida.
 */
@Directive({
  selector: '[appAlEntrar]',
  standalone: false,
})
export class AlEntrarDirective implements AfterViewInit, OnDestroy {
  @Output() alEntrar = new EventEmitter<void>();

  private observador?: IntersectionObserver;
  private avisado = false;

  constructor(private ref: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      // Fuera de la pasada de detección de cambios en curso: quien escucha puede actualizar su estado.
      queueMicrotask(() => this.avisar());
      return;
    }
    this.observador = new IntersectionObserver((entradas) => entradas.some((e) => e.isIntersecting) && this.avisar(), {
      rootMargin: `${MARGEN_PX}px 0px`,
    });
    this.observador.observe(this.ref.nativeElement);
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    this.observador = undefined;
  }

  private avisar(): void {
    if (this.avisado) return;
    this.avisado = true;
    this.observador?.disconnect();
    this.alEntrar.emit();
  }
}
