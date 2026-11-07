import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { salirSinTerminarGuard } from '../../core/guards/salir-sin-terminar.guard';
import { clienteGuard } from '../../core/guards/cliente.guard';
import { ClienteShellComponent } from './cliente-shell/cliente-shell.component';
import { SolicitarServicioComponent } from './solicitar-servicio/solicitar-servicio.component';
import { NotificacionesComponent } from '../../shared/notificaciones/notificaciones.component';
import { MiPerfilComponent } from '../../shared/mi-perfil/mi-perfil.component';
import { HistorialClienteComponent } from './historial/historial-cliente.component';
import { MisCitasComponent } from './mis-citas/mis-citas.component';
import { DetalleCitaClienteComponent } from './detalle-cita/detalle-cita-cliente.component';
import { ResultadoPagoComponent } from './pago-resultado/resultado-pago.component';

const routes: Routes = [
  {
    path: '',
    component: ClienteShellComponent,
    canActivate: [clienteGuard],
    children: [
      { path: '', redirectTo: 'solicitar', pathMatch: 'full' },
      { path: 'solicitar', component: SolicitarServicioComponent, canDeactivate: [salirSinTerminarGuard] },
      { path: 'citas', component: MisCitasComponent },
      { path: 'historial', component: HistorialClienteComponent },
      { path: 'notificaciones', component: NotificacionesComponent },
      { path: 'perfil', component: MiPerfilComponent },
      { path: 'citas/:id', component: DetalleCitaClienteComponent },
      { path: 'pago/resultado', component: ResultadoPagoComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClienteRoutingModule {}
