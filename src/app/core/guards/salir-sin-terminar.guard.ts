import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

/** Pantalla que puede pedir confirmación antes de que la persona se vaya (p. ej. con datos sin terminar). */
export interface ConSalidaConfirmable {
  /** `true` deja salir; `false` se queda. Puede esperar la respuesta de la persona. */
  confirmarSalida(): boolean | Observable<boolean>;
}

/** Antes de abandonar la ruta, pregunta a la pantalla si hay algo que proteger. */
export const salirSinTerminarGuard: CanDeactivateFn<ConSalidaConfirmable> = (componente) => componente.confirmarSalida();
