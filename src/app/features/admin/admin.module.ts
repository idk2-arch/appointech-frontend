import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminShellComponent } from './admin-shell/admin-shell.component';
import { UsuariosComponent } from './usuarios/usuarios.component';
import { CrearAdministradorModalComponent } from './usuarios/crear-administrador-modal/crear-administrador-modal.component';
import { ClienteModalComponent } from './clientes/cliente-modal/cliente-modal.component';
import { TecnicoModalComponent } from './tecnicos/tecnico-modal/tecnico-modal.component';
import { TablaUsuariosComponent } from './usuarios/tabla-usuarios/tabla-usuarios.component';
import { UsuarioEditarModalComponent } from './usuarios/usuario-editar-modal/usuario-editar-modal.component';
import { EspecialidadesComponent } from './especialidades/especialidades.component';
import { CatalogoEspecialidadesComponent } from './especialidades/catalogo-especialidades/catalogo-especialidades.component';
import { NuevaEspecialidadModalComponent } from './especialidades/nueva-especialidad-modal/nueva-especialidad-modal.component';
import { AsignarTecnicosComponent } from './especialidades/asignar-tecnicos/asignar-tecnicos.component';
import { AsignarEspecialidadesModalComponent } from './especialidades/asignar-especialidades-modal/asignar-especialidades-modal.component';
import { CoberturaComponent } from './cobertura/cobertura.component';
import { SolicitudesManualesComponent } from './solicitudes-manuales/solicitudes-manuales.component';
import { AsignarSolicitudModalComponent } from './solicitudes-manuales/asignar-solicitud-modal/asignar-solicitud-modal.component';
import { LogsComponent } from './logs/logs.component';

@NgModule({
  declarations: [
    AdminShellComponent,
    UsuariosComponent,
    CrearAdministradorModalComponent,
    TecnicoModalComponent,
    ClienteModalComponent,
    TablaUsuariosComponent,
    UsuarioEditarModalComponent,
    EspecialidadesComponent,
    CatalogoEspecialidadesComponent,
    NuevaEspecialidadModalComponent,
    AsignarTecnicosComponent,
    AsignarEspecialidadesModalComponent,
    CoberturaComponent,
    SolicitudesManualesComponent,
    AsignarSolicitudModalComponent,
    LogsComponent,
  ],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, AdminRoutingModule],
})
export class AdminModule {}
