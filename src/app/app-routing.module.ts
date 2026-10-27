import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadChildren: () =>
      import('./features/en-construccion/en-construccion.module').then(
        (m) => m.EnConstruccionModule
      ),
  },
  {
    path: '',
    loadChildren: () =>
      import('./features/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.module').then((m) => m.AdminModule),
  },
  {
    path: 'cliente',
    loadChildren: () =>
      import('./features/cliente/cliente.module').then((m) => m.ClienteModule),
  },
  {
    path: 'tecnico',
    loadChildren: () =>
      import('./features/tecnico/tecnico.module').then((m) => m.TecnicoModule),
  },
  {
    path: 'completar-perfil',
    loadChildren: () =>
      import('./features/completar-perfil/completar-perfil.module').then(
        (m) => m.CompletarPerfilModule
      ),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
