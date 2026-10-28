import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-en-construccion',
  standalone: false,
  templateUrl: './en-construccion.component.html',
  styleUrls: ['./en-construccion.component.css'],
})
export class EnConstruccionComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Los tres roles ya tienen panel propio; el placeholder queda solo como respaldo.
    const rol = this.authService.obtenerRol();
    if (rol === 'CLIENTE' || rol === 'ADMINISTRADOR' || rol === 'TECNICO') {
      this.authService.redirigirSegunRol(this.router);
    }
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    void this.router.navigate(['/login']);
  }
}
