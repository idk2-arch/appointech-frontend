import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth.guard';
import { CompletarPerfilComponent } from './completar-perfil.component';

const routes: Routes = [
  { path: '', component: CompletarPerfilComponent, canActivate: [authGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CompletarPerfilRoutingModule {}
