import { Component, computed, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AlertasAdminService } from '../../../core/services/alertas-admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConteoNotificacionesService } from '../../../core/services/conteo-notificaciones.service';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { SidebarMenuItem } from '../../../shared/sidebar-menu/sidebar-menu.component';
import { AvisosAlertasService } from '../../../shared/toast/avisos-alertas.service';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-admin-shell',
  standalone: false,
  templateUrl: './admin-shell.component.html',
})
export class AdminShellComponent implements OnInit, OnDestroy {
  sidebarAbierto = false;

  /** Se recalcula solo cuando cambia el total de alertas, para que el menú no se redibuje sin necesidad. */
  readonly menuItems = computed<SidebarMenuItem[]>(() => [
    { value: 'dashboard', label: 'Dashboard', icon: 'chart', routerLink: '/admin/dashboard' },
    { value: 'usuarios', label: 'Usuarios', icon: 'users', routerLink: '/admin/usuarios' },
    { value: 'especialidades', label: 'Especialidades de técnicos', icon: 'tool', routerLink: '/admin/especialidades' },
    { value: 'citas', label: 'Citas', icon: 'calendar', routerLink: '/admin/citas' },
    { value: 'solicitudes-manuales', label: 'Solicitudes por coordinar', icon: 'alert', routerLink: '/admin/solicitudes-manuales' },
    { value: 'alertas', label: 'Alertas', icon: 'bell', routerLink: '/admin/alertas', badge: this.alertas.total() },
    { value: 'notificaciones', label: 'Notificaciones', icon: 'bell', routerLink: '/admin/notificaciones', badge: this.conteo.noLeidas() },
    { value: 'cobertura', label: 'Cobertura', icon: 'settings', routerLink: '/admin/cobertura' },
    { value: 'historial', label: 'Historial financiero', icon: 'receipt', routerLink: '/admin/pagos' },
    { value: 'logs', label: 'Logs', icon: 'logs', routerLink: '/admin/logs' },
  ]);

  private consultaAlertas?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertas: AlertasAdminService,
    private avisosAlertas: AvisosAlertasService,
    private toast: ToastService,
    private conteo: ConteoNotificacionesService
  ) {}

  /** Carga el total para la insignia del menú y, si hay alertas, avisa una vez por sesión. */
  ngOnInit(): void {
    this.conteo.iniciar();
    this.consultaAlertas = this.alertas.obtener().subscribe({
      next: ({ total }) => this.avisosAlertas.anunciar(total),
      error: (err) => this.toast.error('No se pudieron cargar las alertas', obtenerMensajeError(err, 'No fue posible cargar las alertas.')),
    });
  }

  ngOnDestroy(): void {
    this.conteo.detener();
    this.consultaAlertas?.unsubscribe();
  }

  /** Abre el detalle de una cita por su número; ignora entradas que no sean un entero positivo. */
  buscarCita(valor: string): void {
    const id = Number(valor.trim());
    if (!Number.isInteger(id) || id <= 0) return;
    this.cerrarSidebar();
    this.router.navigate(['/admin/citas', id]).catch(() => undefined);
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
