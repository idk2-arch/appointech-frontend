import { Component } from '@angular/core';

/** Pestañas de la configuración de agendamiento: la distancia y el contacto, y las reglas de franjas. */
@Component({
  selector: 'app-cobertura-pestanas',
  standalone: false,
  template: `
    <nav aria-label="Configuración de agendamiento" class="mb-6 flex gap-1 border-b border-white/10">
      <a
        routerLink="/admin/cobertura"
        routerLinkActive="border-[#D98E4A] text-white"
        [routerLinkActiveOptions]="{ exact: true }"
        #cobertura="routerLinkActive"
        [attr.aria-current]="cobertura.isActive ? 'page' : null"
        class="-mb-px border-b-2 border-transparent px-3 py-2 fs-cuerpo font-medium text-white/60 transition hover:text-white
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D98E4A]"
      >
        Distancia y contacto
      </a>
      <a
        routerLink="/admin/cobertura/franjas"
        routerLinkActive="border-[#D98E4A] text-white"
        #franjas="routerLinkActive"
        [attr.aria-current]="franjas.isActive ? 'page' : null"
        class="-mb-px border-b-2 border-transparent px-3 py-2 fs-cuerpo font-medium text-white/60 transition hover:text-white
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D98E4A]"
      >
        Reglas de franjas
      </a>
    </nav>
  `,
})
export class CoberturaPestanasComponent {}
