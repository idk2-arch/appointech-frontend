import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { clienteGuard } from '../../core/guards/cliente.guard';
import { ClienteShellComponent } from './cliente-shell/cliente-shell.component';
import { SolicitarServicioComponent } from './solicitar-servicio/solicitar-servicio.component';

const routes: Routes = [
  {
    path: '',
    component: ClienteShellComponent,
    canActivate: [clienteGuard],
    children: [
      { path: '', redirectTo: 'solicitar', pathMatch: 'full' },
      { path: 'solicitar', component: SolicitarServicioComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClienteRoutingModule {}
