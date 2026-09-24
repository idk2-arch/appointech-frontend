import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { CompletarPerfilRoutingModule } from './completar-perfil-routing.module';
import { CompletarPerfilComponent } from './completar-perfil.component';

@NgModule({
  declarations: [CompletarPerfilComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, CompletarPerfilRoutingModule],
})
export class CompletarPerfilModule {}
