/** Cancelar una animación web rechaza su `finished` con un AbortError: es lo esperado, no un fallo. */
export function esCancelacion(motivo: unknown): boolean {
  return motivo instanceof DOMException && motivo.name === 'AbortError';
}

/**
 * Llama a `alTerminar` cuando la animación acaba o se cancela. La cancelación (AbortError) cuenta como un
 * final normal; cualquier otro error se relanza para que no pase inadvertido.
 */
export function alAcabarAnimacion(animacion: { finished: PromiseLike<unknown> }, alTerminar: () => void): void {
  animacion.finished.then(
    () => alTerminar(),
    (motivo: unknown) => {
      if (!esCancelacion(motivo)) throw motivo;
      alTerminar();
    }
  );
}
