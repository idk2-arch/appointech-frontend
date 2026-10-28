import { Component, inject, Input } from '@angular/core';

import { SesionService } from '../../core/services/sesion.service';

/** Foto de la persona con sesión iniciada, como enlace a su página de perfil (para los menús laterales). */
@Component({
  selector: 'app-perfil-sesion',
  standalone: false,
  template: `
    <a
      [routerLink]="enlace"
      class="flex items-center gap-3 rounded-xl px-3 py-2 text-white/70 transition hover:bg-white/5 hover:text-white"
    >
      <app-avatar [fotoUrl]="fotoUrl$ | async" [nombre]="rol" tamano="sm"></app-avatar>
      <span class="min-w-0 truncate">Mi perfil</span>
    </a>
  `,
})
export class PerfilSesionComponent {
  /** Rol de la persona ("Cliente", "Técnico", "Admin"); da las iniciales cuando no hay foto. */
  @Input({ required: true }) rol!: string;
  @Input({ required: true }) enlace!: string;

  readonly fotoUrl$ = inject(SesionService).fotoUrl$;
}
