/**
 * Ejecuta `tarea` después del primer pintado y cuando el navegador esté libre (o, a más tardar, al pasar `esperaMaxima`).
 * Sirve para trabajo pesado que no es necesario para ver y usar la pantalla (fondos WebGL, scripts externos):
 * así no compite con el primer cuadro ni con las animaciones de entrada. Devuelve la función que lo cancela.
 */
export function despuesDelPrimerPintado(tarea: () => void, esperaMaxima = 1000): () => void {
  let cancelado = false;
  let cuadro1 = 0;
  let cuadro2 = 0;
  let libre = 0;
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const ejecutar = (): void => {
    if (!cancelado) tarea();
  };

  // Dos cuadros: el primero pinta lo que ya hay y el segundo confirma que el navegador ya mostró algo.
  cuadro1 = requestAnimationFrame(() => {
    cuadro2 = requestAnimationFrame(() => {
      if (typeof requestIdleCallback === 'function') libre = requestIdleCallback(ejecutar, { timeout: esperaMaxima });
      else temporizador = setTimeout(ejecutar, 50);
    });
  });

  return () => {
    cancelado = true;
    cancelAnimationFrame(cuadro1);
    cancelAnimationFrame(cuadro2);
    if (libre && typeof cancelIdleCallback === 'function') cancelIdleCallback(libre);
    clearTimeout(temporizador);
  };
}
