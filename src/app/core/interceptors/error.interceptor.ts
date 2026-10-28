import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';

/**
 * 401, o 403 sin sesión válida (token vencido), manda al login. Las rutas
 * /auth/** se excluyen porque ahí un 401 significa credenciales incorrectas y
 * lo maneja el propio formulario. Un 403 con sesión vigente se deja pasar para
 * que la pantalla muestre "No tienes permisos".
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      const esNuestraApi = req.url.startsWith(API_BASE_URL);
      if (err instanceof HttpErrorResponse && esNuestraApi && !req.url.includes('/auth/')) {
        const sesionInvalida =
          err.status === 401 || (err.status === 403 && !authService.estaAutenticado());
        if (sesionInvalida) {
          authService.cerrarSesion();
          void router.navigate(['/login']);
        }
      }
      return throwError(() => err);
    })
  );
};
