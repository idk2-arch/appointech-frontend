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
    { value: 'citas', label: 'Citas', icon: 'calendar', routerLink: '/admin/citas' },
    { value: 'solicitudes-manuales', label: 'Solicitudes por coordinar', icon: 'alert', routerLink: '/admin/solicitudes-manuales' },
    { value: 'gestion', label: 'Gestión operativa', icon: 'alert', disabled: true },
    { value: 'cobertura', label: 'Cobertura', icon: 'settings', routerLink: '/admin/cobertura' },
    { value: 'historial', label: 'Historial financiero', icon: 'receipt', disabled: true },
    { value: 'logs', label: 'Logs', icon: 'logs', routerLink: '/admin/logs' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /** Abre el detalle de una cita por su número; ignora entradas que no sean un entero positivo. */
  buscarCita(valor: string): void {
    const id = Number(valor.trim());
    if (!Number.isInteger(id) || id <= 0) return;
    this.cerrarSidebar();
    void this.router.navigate(['/admin/citas', id]);
  }

  abrirSidebar(): void {
    this.sidebarAbierto = true;
  }

  cerrarSidebar(): void {
    this.sidebarAbierto = false;
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    void this.router.navigate(['/login']);
  }
}
