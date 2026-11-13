import { Component } from '@angular/core';

import { ActualizacionAppService } from './core/services/actualizacion-app.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor(actualizacion: ActualizacionAppService) {
    actualizacion.vigilar();
  }
}