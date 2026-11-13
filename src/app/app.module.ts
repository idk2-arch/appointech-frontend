import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ServiceWorkerModule } from '@angular/service-worker';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { App } from './app';
import { ToastModule } from './shared/toast/toast.module';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { BuscadorDirecciones, GeocodificadorInverso } from './core/services/geocodificacion';
import { GeocodificacionService } from './core/services/geocodificacion.service';

@NgModule({
  declarations: [App],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ToastModule,
    // Solo en producción: en desarrollo el service worker cachearía archivos viejos.
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
  providers: [
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    { provide: BuscadorDirecciones, useExisting: GeocodificacionService },
    { provide: GeocodificadorInverso, useExisting: GeocodificacionService },
  ],
  bootstrap: [App],
})
export class AppModule {}
