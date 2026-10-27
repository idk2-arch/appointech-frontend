import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { GradientWavesComponent } from './gradient-waves/gradient-waves.component';
import { SidebarMenuComponent } from './sidebar-menu/sidebar-menu.component';
import { FuseButtonComponent } from './fuse-button/fuse-button.component';
import { RubberSegmentComponent } from './rubber-segment/rubber-segment.component';
import { DriftWallComponent } from './drift-wall/drift-wall.component';
import { KilometrosPipe, MinutosViajePipe } from './formato-viaje/formato-viaje.pipes';
import { IconoWhatsappComponent } from './icono-whatsapp/icono-whatsapp.component';
import { PanelLateralComponent } from './panel-lateral/panel-lateral.component';
import { NombreTecnicoPipe } from './nombre-tecnico/nombre-tecnico.pipe';
import { FechaLocalPipe } from './fecha-local/fecha-local.pipe';
import { MapaUbicacionComponent } from './mapa-ubicacion/mapa-ubicacion.component';
import { CamposPersonaComponent } from './campos-persona/campos-persona.component';
import { ModalFormularioComponent } from './modal-formulario/modal-formulario.component';
import { SelectorDireccionComponent } from './selector-direccion/selector-direccion.component';
import { SelectorEspecialidadesComponent } from './selector-especialidades/selector-especialidades.component';

@NgModule({
  declarations: [
    GradientWavesComponent,
    SidebarMenuComponent,
    FuseButtonComponent,
    RubberSegmentComponent,
    DriftWallComponent,
    FechaLocalPipe,
    NombreTecnicoPipe,
    KilometrosPipe,
    MinutosViajePipe,
    PanelLateralComponent,
    IconoWhatsappComponent,
    MapaUbicacionComponent,
    SelectorDireccionComponent,
    CamposPersonaComponent,
    SelectorEspecialidadesComponent,
    ModalFormularioComponent,
  ],
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  exports: [
    GradientWavesComponent,
    SidebarMenuComponent,
    FuseButtonComponent,
    RubberSegmentComponent,
    DriftWallComponent,
    FechaLocalPipe,
    NombreTecnicoPipe,
    KilometrosPipe,
    MinutosViajePipe,
    PanelLateralComponent,
    IconoWhatsappComponent,
    MapaUbicacionComponent,
    SelectorDireccionComponent,
    CamposPersonaComponent,
    SelectorEspecialidadesComponent,
    ModalFormularioComponent,
  ],
})
export class SharedModule {}
