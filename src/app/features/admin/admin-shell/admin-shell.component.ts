import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { SidebarMenuItem } from '../../../shared/sidebar-menu/sidebar-menu.component';

@Component({
  selector: 'app-admin-shell',
  standalone: false,
  templateUrl: './admin-shell.component.html',
})
export class AdminShellComponent {
  sidebarAbierto = false;

  readonly menuItems: SidebarMenuItem[] = [
    { value: 'dashboard', label: 'Dashboard', icon: 'chart', disabled: true },
    { value: 'usuarios', label: 'Usuarios', icon: 'users', routerLink: '/admin/usuarios' },
    { value: 'especialidades', label: 'Especialidades de técnicos', icon: 'tool', routerLink: '/admin/especialidades' },
    { value: 'gestion', label: 'Gestión operativa', icon: 'alert', disabled: true },
    { value: 'configuracion', label: 'Configuración', icon: 'settings', disabled: true },
    { value: 'historial', label: 'Historial financiero', icon: 'receipt', disabled: true },
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
