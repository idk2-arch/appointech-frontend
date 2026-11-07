import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { ConSalidaConfirmable, salirSinTerminarGuard } from './salir-sin-terminar.guard';

describe('salirSinTerminarGuard', () => {
  const ejecutar = (componente: ConSalidaConfirmable) =>
    salirSinTerminarGuard(componente, {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot, {} as RouterStateSnapshot);

  it('le pregunta a la pantalla y deja salir si no hay nada que proteger', () => {
    const confirmarSalida = vi.fn().mockReturnValue(true);
    expect(ejecutar({ confirmarSalida })).toBe(true);
    expect(confirmarSalida).toHaveBeenCalledOnce();
  });

  it('espera la respuesta de la persona cuando la pantalla pregunta', () => {
    let respuesta: unknown;
    (ejecutar({ confirmarSalida: () => of(false) }) as Observable<boolean>).subscribe((r) => (respuesta = r));
    expect(respuesta).toBe(false);
  });
});
