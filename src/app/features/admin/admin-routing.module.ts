import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { adminGuard } from '../../core/guards/admin.guard';
import { AdminShellComponent } from './admin-shell/admin-shell.component';
import { UsuariosComponent } from './usuarios/usuarios.component';
import { EspecialidadesComponent } from './especialidades/especialidades.component';

const routes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      { path: 'usuarios', component: UsuariosComponent },
      { path: 'especialidades', component: EspecialidadesComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
