import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { App } from './app';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { BuscadorDirecciones, GeocodificadorInverso } from './core/services/geocodificacion';
import { GeocodificacionService } from './core/services/geocodificacion.service';

@NgModule({
  declarations: [App],
  imports: [BrowserModule, AppRoutingModule],
  providers: [
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    { provide: BuscadorDirecciones, useExisting: GeocodificacionService },
    { provide: GeocodificadorInverso, useExisting: GeocodificacionService },
  ],
  bootstrap: [App],
})
export class AppModule {}
