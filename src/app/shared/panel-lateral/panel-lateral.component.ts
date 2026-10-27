import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { SidebarMenuItem } from '../sidebar-menu/sidebar-menu.component';

/**
 * Marco de un panel con menú lateral (el mismo aspecto del panel de administración):
 * encabezado, menú, "Cerrar sesión" al final y barra móvil que abre y cierra el menú.
 * El contenido de la página se proyecta. Quien lo usa define el rol y los items.
 */
@Component({
  selector: 'app-panel-lateral',
  standalone: false,
  templateUrl: './panel-lateral.component.html',
})
export class PanelLateralComponent {
  @Input({ required: true }) rol!: string;
  @Input({ required: true }) menuItems: SidebarMenuItem[] = [];
  @Output() cerrarSesion = new EventEmitter<void>();

  sidebarAbierto = false;

  abrirSidebar(): void {
    this.sidebarAbierto = true;
  }

  cerrarSidebar(): void {
    this.sidebarAbierto = false;
  }
}
