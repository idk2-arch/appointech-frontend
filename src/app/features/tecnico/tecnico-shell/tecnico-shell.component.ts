import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { SidebarMenuItem } from '../../../shared/sidebar-menu/sidebar-menu.component';

@Component({
  selector: 'app-tecnico-shell',
  standalone: false,
  templateUrl: './tecnico-shell.component.html',
})
export class TecnicoShellComponent {
  sidebarAbierto = false;

  readonly menuItems: SidebarMenuItem[] = [
    { value: 'agenda', label: 'Mi agenda', icon: 'calendar', routerLink: '/tecnico/agenda' },
    { value: 'bloques', label: 'No disponibilidad', icon: 'block', routerLink: '/tecnico/bloques' },
    { value: 'ruta', label: 'Mi ruta', icon: 'route', routerLink: '/tecnico/ruta' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  abrirSidebar(): void {
    this.sidebarAbierto = true;
  }

  cerrarSidebar(): void {
    this.sidebarAbierto = false;
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
