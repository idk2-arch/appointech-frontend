import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { GradientWavesComponent } from './gradient-waves/gradient-waves.component';
import { SidebarMenuComponent } from './sidebar-menu/sidebar-menu.component';
import { FuseButtonComponent } from './fuse-button/fuse-button.component';
import { RubberSegmentComponent } from './rubber-segment/rubber-segment.component';

@NgModule({
  declarations: [GradientWavesComponent, SidebarMenuComponent, FuseButtonComponent, RubberSegmentComponent],
  imports: [CommonModule, RouterModule],
  exports: [GradientWavesComponent, SidebarMenuComponent, FuseButtonComponent, RubberSegmentComponent],
})
export class SharedModule {}
