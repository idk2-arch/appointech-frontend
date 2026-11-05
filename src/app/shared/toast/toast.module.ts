import { NgModule } from '@angular/core';

import { ToastContenedorComponent } from './toast-contenedor.component';
import { ToastComponent } from './toast.component';

/**
 * Módulo propio para que `AppModule` monte el contenedor sin cargar todo `SharedModule`; `SharedModule`
 * lo reexporta para el resto de la app.
 */
@NgModule({
  declarations: [ToastComponent, ToastContenedorComponent],
  exports: [ToastComponent, ToastContenedorComponent],
})
export class ToastModule {}
