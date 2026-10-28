import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { clienteGuard } from '../../core/guards/cliente.guard';
import { ClienteShellComponent } from './cliente-shell/cliente-shell.component';
import { SolicitarServicioComponent } from './solicitar-servicio/solicitar-servicio.component';
import { MiPerfilComponent } from '../../shared/mi-perfil/mi-perfil.component';
import { MisCitasComponent } from './mis-citas/mis-citas.component';
import { DetalleCitaClienteComponent } from './detalle-cita/detalle-cita-cliente.component';

const routes: Routes = [
  {
    path: '',
    component: ClienteShellComponent,
    canActivate: [clienteGuard],
    children: [
      { path: '', redirectTo: 'solicitar', pathMatch: 'full' },
      { path: 'solicitar', component: SolicitarServicioComponent },
      { path: 'citas', component: MisCitasComponent },
      { path: 'perfil', component: MiPerfilComponent },
      { path: 'citas/:id', component: DetalleCitaClienteComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClienteRoutingModule {}
