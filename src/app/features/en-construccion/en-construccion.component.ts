import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-en-construccion',
  standalone: false,
  templateUrl: './en-construccion.component.html',
  styleUrls: ['./en-construccion.component.css'],
})
export class EnConstruccionComponent {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
