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
import { FotoAmpliadaComponent } from './foto-ampliada/foto-ampliada.component';
import { BounceCardsComponent } from './bounce-cards/bounce-cards.component';
import { CardSwapComponent } from './card-swap/card-swap.component';
import { FotosElectrodomesticoComponent } from './fotos-electrodomestico/fotos-electrodomestico.component';
import { PrediagnosticoComponent } from './prediagnostico/prediagnostico.component';
import { SelectorFotosComponent } from './selector-fotos/selector-fotos.component';
import { AvatarComponent } from './avatar/avatar.component';
import { CargaFotoComponent } from './carga-foto/carga-foto.component';
import { PerfilDatosComponent } from './perfil-datos/perfil-datos.component';
import { MiPerfilComponent } from './mi-perfil/mi-perfil.component';
import { PerfilSesionComponent } from './perfil-sesion/perfil-sesion.component';
import { SelectComponent } from './select/select.component';
import { InsigniaEstadoComponent } from './insignia-estado/insignia-estado.component';
import { DialogoMotivoComponent } from './dialogo-motivo/dialogo-motivo.component';
import { DetalleCitaComponent } from './detalle-cita/detalle-cita.component';
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
    InsigniaEstadoComponent,
    DialogoMotivoComponent,
    DetalleCitaComponent,
    SelectComponent,
    AvatarComponent,
    CargaFotoComponent,
    MiPerfilComponent,
    PerfilSesionComponent,
    CardSwapComponent,
    FotosElectrodomesticoComponent,
    PrediagnosticoComponent,
    SelectorFotosComponent,
    BounceCardsComponent,
    FotoAmpliadaComponent,
    PerfilDatosComponent,
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
    InsigniaEstadoComponent,
    DialogoMotivoComponent,
    DetalleCitaComponent,
    SelectComponent,
    AvatarComponent,
    CargaFotoComponent,
    MiPerfilComponent,
    PerfilSesionComponent,
    CardSwapComponent,
    FotosElectrodomesticoComponent,
    PrediagnosticoComponent,
    SelectorFotosComponent,
    BounceCardsComponent,
    FotoAmpliadaComponent,
    PerfilDatosComponent,
  ],
})
export class SharedModule {}
