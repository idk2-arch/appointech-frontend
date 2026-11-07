import { Component, computed, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { ConteoNotificacionesService } from '../../../core/services/conteo-notificaciones.service';
import { SidebarMenuItem } from '../../../shared/sidebar-menu/sidebar-menu.component';

@Component({
  selector: 'app-cliente-shell',
  standalone: false,
  templateUrl: './cliente-shell.component.html',
})
export class ClienteShellComponent implements OnInit, OnDestroy {
  readonly menuItems = computed<SidebarMenuItem[]>(() => [
    { value: 'solicitar', label: 'Solicitar servicio', icon: 'tool', routerLink: '/cliente/solicitar' },
    { value: 'citas', label: 'Mis citas', icon: 'calendar', routerLink: '/cliente/citas' },
    { value: 'historial', label: 'Historial', icon: 'receipt', routerLink: '/cliente/historial' },
    { value: 'notificaciones', label: 'Notificaciones', icon: 'bell', routerLink: '/cliente/notificaciones', badge: this.conteo.noLeidas() },
    { value: 'perfil', label: 'Mi perfil', icon: 'user', routerLink: '/cliente/perfil' },
  ]);

  constructor(
    private authService: AuthService,
    private router: Router,
    private conteo: ConteoNotificacionesService
  ) {}

  /** El contador de la campana se actualiza mientras el menú esté en pantalla. */
  ngOnInit(): void {
    this.conteo.iniciar();
  }

  ngOnDestroy(): void {
    this.conteo.detener();
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']).catch(() => undefined);
  }
}
