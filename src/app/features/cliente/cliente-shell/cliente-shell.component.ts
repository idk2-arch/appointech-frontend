import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { SidebarMenuItem } from '../../../shared/sidebar-menu/sidebar-menu.component';

@Component({
  selector: 'app-cliente-shell',
  standalone: false,
  templateUrl: './cliente-shell.component.html',
})
export class ClienteShellComponent {
  readonly menuItems: SidebarMenuItem[] = [
    { value: 'solicitar', label: 'Solicitar servicio', icon: 'tool', routerLink: '/cliente/solicitar' },
    { value: 'citas', label: 'Mis citas', icon: 'calendar', routerLink: '/cliente/citas' },
    { value: 'historial', label: 'Historial', icon: 'receipt', disabled: true },
    { value: 'notificaciones', label: 'Notificaciones', icon: 'bell', disabled: true },
    { value: 'perfil', label: 'Mi perfil', icon: 'user', routerLink: '/cliente/perfil' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
