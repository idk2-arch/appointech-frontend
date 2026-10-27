import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // El token solo va a nuestra API; nunca a servicios externos (p. ej. Geoapify).
  if (!req.url.startsWith(API_BASE_URL)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.obtenerToken();

  if (token) {
    const reqConToken = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(reqConToken);
  }

  return next(req);
};
