import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminShellComponent } from './admin-shell/admin-shell.component';
import { UsuariosComponent } from './usuarios/usuarios.component';
import { CrearAdministradorModalComponent } from './usuarios/crear-administrador-modal/crear-administrador-modal.component';
import { UsuarioEditarModalComponent } from './usuarios/usuario-editar-modal/usuario-editar-modal.component';
import { EspecialidadesComponent } from './especialidades/especialidades.component';
import { CatalogoEspecialidadesComponent } from './especialidades/catalogo-especialidades/catalogo-especialidades.component';
import { NuevaEspecialidadModalComponent } from './especialidades/nueva-especialidad-modal/nueva-especialidad-modal.component';
import { AsignarTecnicosComponent } from './especialidades/asignar-tecnicos/asignar-tecnicos.component';
import { AsignarEspecialidadesModalComponent } from './especialidades/asignar-especialidades-modal/asignar-especialidades-modal.component';

@NgModule({
  declarations: [
    AdminShellComponent,
    UsuariosComponent,
    CrearAdministradorModalComponent,
    UsuarioEditarModalComponent,
    EspecialidadesComponent,
    CatalogoEspecialidadesComponent,
    NuevaEspecialidadModalComponent,
    AsignarTecnicosComponent,
    AsignarEspecialidadesModalComponent,
  ],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, AdminRoutingModule],
})
export class AdminModule {}
