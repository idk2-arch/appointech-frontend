import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { adminGuard } from '../../core/guards/admin.guard';
import { AdminShellComponent } from './admin-shell/admin-shell.component';
import { UsuariosComponent } from './usuarios/usuarios.component';
import { EspecialidadesComponent } from './especialidades/especialidades.component';
import { CoberturaComponent } from './cobertura/cobertura.component';
import { SolicitudesManualesComponent } from './solicitudes-manuales/solicitudes-manuales.component';
import { LogsComponent } from './logs/logs.component';

const routes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      { path: 'usuarios', component: UsuariosComponent },
      { path: 'especialidades', component: EspecialidadesComponent },
      { path: 'solicitudes-manuales', component: SolicitudesManualesComponent },
      { path: 'cobertura', component: CoberturaComponent },
      { path: 'logs', component: LogsComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
