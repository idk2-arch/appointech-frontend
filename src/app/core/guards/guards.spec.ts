import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../services/auth.service';
import { adminGuard } from './admin.guard';
import { authGuard } from './auth.guard';
import { clienteGuard } from './cliente.guard';
import { tecnicoGuard } from './tecnico.guard';

describe('guards de ruta', () => {
  let auth: { estaAutenticado: ReturnType<typeof vi.fn>; obtenerRol: ReturnType<typeof vi.fn> };
  let navegar: ReturnType<typeof vi.fn>;

  const ejecutar = (guard: CanActivateFn): unknown => TestBed.runInInjectionContext(() => guard({} as never, {} as never));

  beforeEach(() => {
    auth = { estaAutenticado: vi.fn().mockReturnValue(true), obtenerRol: vi.fn().mockReturnValue(null) };
    navegar = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: { navigate: navegar } },
      ],
    });
  });

  describe('authGuard', () => {
    it('deja pasar a quien tiene sesión vigente', () => {
      expect(ejecutar(authGuard)).toBe(true);
      expect(navegar).not.toHaveBeenCalled();
    });

    it('sin sesión lleva al login y bloquea la ruta', () => {
      auth.estaAutenticado.mockReturnValue(false);

      expect(ejecutar(authGuard)).toBe(false);
      expect(navegar).toHaveBeenCalledWith(['/login']);
    });
  });

  describe.each([
    ['adminGuard', adminGuard, 'ADMINISTRADOR', ['CLIENTE', 'TECNICO']],
    ['clienteGuard', clienteGuard, 'CLIENTE', ['ADMINISTRADOR', 'TECNICO']],
    ['tecnicoGuard', tecnicoGuard, 'TECNICO', ['ADMINISTRADOR', 'CLIENTE']],
  ] as const)('%s', (_nombre, guard, rolPermitido, otrosRoles) => {
    it(`deja pasar al rol ${rolPermitido} con sesión vigente`, () => {
      auth.obtenerRol.mockReturnValue(rolPermitido);

      expect(ejecutar(guard)).toBe(true);
      expect(navegar).not.toHaveBeenCalled();
    });

    it.each(otrosRoles)('bloquea al rol %s y lo manda al login', (rol) => {
      auth.obtenerRol.mockReturnValue(rol);

      expect(ejecutar(guard)).toBe(false);
      expect(navegar).toHaveBeenCalledWith(['/login']);
    });

    it('bloquea si la sesión venció, aunque el rol sea el correcto', () => {
      auth.obtenerRol.mockReturnValue(rolPermitido);
      auth.estaAutenticado.mockReturnValue(false);

      expect(ejecutar(guard)).toBe(false);
      expect(navegar).toHaveBeenCalledWith(['/login']);
    });

    it('bloquea si no hay rol', () => {
      auth.obtenerRol.mockReturnValue(null);
      expect(ejecutar(guard)).toBe(false);
    });
  });
});
