import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { TecnicoRoutingModule } from './tecnico-routing.module';
import { TecnicoShellComponent } from './tecnico-shell/tecnico-shell.component';
import { SelectorDiaComponent } from './selector-dia/selector-dia.component';
import { MiAgendaComponent } from './mi-agenda/mi-agenda.component';
import { NoDisponibilidadComponent } from './no-disponibilidad/no-disponibilidad.component';
import { DiagnosticoModalComponent } from './diagnostico-modal/diagnostico-modal.component';
import { MiRutaComponent } from './mi-ruta/mi-ruta.component';
import { MapaRutaComponent } from './mi-ruta/mapa-ruta/mapa-ruta.component';
import { FinalizadasComponent } from './finalizadas/finalizadas.component';
import { PagoCitaTecnicoComponent } from './pago-cita/pago-cita-tecnico.component';

@NgModule({
  declarations: [
    TecnicoShellComponent,
    SelectorDiaComponent,
    MiAgendaComponent,
    NoDisponibilidadComponent,
    MiRutaComponent,
    MapaRutaComponent,
    DiagnosticoModalComponent,
    PagoCitaTecnicoComponent,
    FinalizadasComponent,
  ],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, TecnicoRoutingModule],
})
export class TecnicoModule {}
