import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { ClienteRoutingModule } from './cliente-routing.module';
import { ClienteShellComponent } from './cliente-shell/cliente-shell.component';
import { SolicitarServicioComponent } from './solicitar-servicio/solicitar-servicio.component';
import { ElegirEspecialidadComponent } from './solicitar-servicio/elegir-especialidad/elegir-especialidad.component';
import { DetalleSolicitudComponent } from './solicitar-servicio/detalle-solicitud/detalle-solicitud.component';
import { ElegirFranjaComponent } from './solicitar-servicio/elegir-franja/elegir-franja.component';
import { ConfirmarCitaComponent } from './solicitar-servicio/confirmar-cita/confirmar-cita.component';
import { CitaConfirmadaComponent } from './solicitar-servicio/cita-confirmada/cita-confirmada.component';
import { MisCitasComponent } from './mis-citas/mis-citas.component';
import { DetalleCitaClienteComponent } from './detalle-cita/detalle-cita-cliente.component';
import { ReprogramarModalComponent } from './reprogramar-modal/reprogramar-modal.component';
import { DictadoVozComponent } from './dictado-voz/dictado-voz.component';

@NgModule({
  declarations: [
    ClienteShellComponent,
    SolicitarServicioComponent,
    ElegirEspecialidadComponent,
    DetalleSolicitudComponent,
    ElegirFranjaComponent,
    ConfirmarCitaComponent,
    DictadoVozComponent,
    CitaConfirmadaComponent,
    MisCitasComponent,
    DetalleCitaClienteComponent,
    ReprogramarModalComponent,
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SharedModule, ClienteRoutingModule],
})
export class ClienteModule {}
