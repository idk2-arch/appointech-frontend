const FORMATO_PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Pesos colombianos sin decimales, p. ej. "$ 120.000". Un valor ausente o no numérico da texto vacío. */
export function formatearPesos(monto: number | null | undefined): string {
  if (monto === null || monto === undefined || Number.isNaN(monto)) return '';
  return FORMATO_PESOS.format(monto);
}

const FORMATO_PORCENTAJE = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

/** Porcentaje con hasta un decimal y coma decimal, p. ej. "25,5 %". */
export function formatearPorcentaje(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '';
  return `${FORMATO_PORCENTAJE.format(valor)} %`;
}
