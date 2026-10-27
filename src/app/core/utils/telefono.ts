/** Enlace tel: sin espacios ni guiones, para llamar con un toque desde el celular. */
export function enlaceTelefono(telefono: string): string {
  return `tel:${telefono.replace(/[^\d+]/g, '')}`;
}
