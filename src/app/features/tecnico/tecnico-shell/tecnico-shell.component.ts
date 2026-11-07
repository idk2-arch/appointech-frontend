import { Component, computed, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { ConteoNotificacionesService } from '../../../core/services/conteo-notificaciones.service';
import { SidebarMenuItem } from '../../../shared/sidebar-menu/sidebar-menu.component';

@Component({
  selector: 'app-tecnico-shell',
  standalone: false,
  templateUrl: './tecnico-shell.component.html',
})
export class TecnicoShellComponent implements OnInit, OnDestroy {
  sidebarAbierto = false;

  readonly menuItems = computed<SidebarMenuItem[]>(() => [
    { value: 'agenda', label: 'Mi agenda', icon: 'calendar', routerLink: '/tecnico/agenda' },
    { value: 'finalizadas', label: 'Finalizadas', icon: 'receipt', routerLink: '/tecnico/finalizadas' },
    { value: 'bloques', label: 'No disponibilidad', icon: 'block', routerLink: '/tecnico/bloques' },
    { value: 'ruta', label: 'Mi ruta', icon: 'route', routerLink: '/tecnico/ruta' },
    { value: 'notificaciones', label: 'Notificaciones', icon: 'bell', routerLink: '/tecnico/notificaciones', badge: this.conteo.noLeidas() },
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

  abrirSidebar(): void {
    this.sidebarAbierto = true;
  }

  cerrarSidebar(): void {
    this.sidebarAbierto = false;
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']).catch(() => undefined);
  }
}
