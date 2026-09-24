import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth.guard';
import { EnConstruccionComponent } from './en-construccion.component';

const routes: Routes = [
  { path: '', component: EnConstruccionComponent, canActivate: [authGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EnConstruccionRoutingModule {}
