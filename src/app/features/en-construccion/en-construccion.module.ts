import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from '../../shared/shared.module';
import { EnConstruccionRoutingModule } from './en-construccion-routing.module';
import { EnConstruccionComponent } from './en-construccion.component';

@NgModule({
  declarations: [EnConstruccionComponent],
  imports: [CommonModule, SharedModule, EnConstruccionRoutingModule],
})
export class EnConstruccionModule {}
