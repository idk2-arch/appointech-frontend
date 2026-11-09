import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

type IdPestana = 'cobertura' | 'franjas';

const RUTA_FRANJAS = '/admin/cobertura/franjas';

/**
 * La activa y la inactiva usan clases distintas, nunca las dos a la vez: Tailwind genera `text-white` antes que
 * `text-white/60` y `border-[#D98E4A]` antes que `border-transparent`, y con la misma especificidad ganaba la
 * posterior, así que la pestaña activa casi nunca se veía resaltada (solo mientras el mouse estaba encima).
 */
const CLASES_ACTIVA = 'border-[#D98E4A] text-white';
const CLASES_INACTIVA = 'border-transparent text-white/60 hover:text-white';

/** Pestañas de la configuración de agendamiento: la distancia y el contacto, y las reglas de franjas. */
@Component({
  selector: 'app-cobertura-pestanas',
  standalone: false,
  template: `
    <nav aria-label="Configuración de agendamiento" class="mb-6 flex gap-1 border-b border-white/10">
      @for (pestana of pestanas; track pestana.id) {
        <a
          [routerLink]="pestana.ruta"
          [attr.aria-current]="activa() === pestana.id ? 'page' : null"
          [class]="activa() === pestana.id ? clasesActiva : clasesInactiva"
          class="-mb-px border-b-2 px-3 py-2 fs-cuerpo font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D98E4A]"
        >
          {{ pestana.etiqueta }}
        </a>
      }
    </nav>
  `,
})
export class CoberturaPestanasComponent {
  readonly pestanas: { id: IdPestana; etiqueta: string; ruta: string }[] = [
    { id: 'cobertura', etiqueta: 'Distancia y contacto', ruta: '/admin/cobertura' },
    { id: 'franjas', etiqueta: 'Reglas de franjas', ruta: RUTA_FRANJAS },
  ];
  readonly clasesActiva = CLASES_ACTIVA;
  readonly clasesInactiva = CLASES_INACTIVA;

  private readonly router = inject(Router);

  /** La URL actual: la pestaña activa sale de la ruta, no de un estado propio que pueda perderse. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { requireSync: true }
  );

  readonly activa = computed<IdPestana>(() => {
    const sinParametros = this.url().split(/[?#]/)[0];
    let fin = sinParametros.length;
    while (fin > 0 && sinParametros[fin - 1] === '/') fin--;
    const ruta = sinParametros.slice(0, fin);
    return ruta === RUTA_FRANJAS ? 'franjas' : 'cobertura';
  });
}
