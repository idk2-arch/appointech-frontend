import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { tecnicoGuard } from '../../core/guards/tecnico.guard';
import { TecnicoShellComponent } from './tecnico-shell/tecnico-shell.component';
import { MiAgendaComponent } from './mi-agenda/mi-agenda.component';
import { NoDisponibilidadComponent } from './no-disponibilidad/no-disponibilidad.component';
import { MiRutaComponent } from './mi-ruta/mi-ruta.component';

const routes: Routes = [
  {
    path: '',
    component: TecnicoShellComponent,
    canActivate: [tecnicoGuard],
    children: [
      { path: '', redirectTo: 'agenda', pathMatch: 'full' },
      { path: 'agenda', component: MiAgendaComponent },
      { path: 'bloques', component: NoDisponibilidadComponent },
      { path: 'ruta', component: MiRutaComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TecnicoRoutingModule {}
