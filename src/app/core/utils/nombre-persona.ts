const ETIQUETAS_ROL: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  CLIENTE: 'Cliente',
  TECNICO: 'Técnico',
};

/** "Nombre Apellido" sin espacios sobrantes; cadena vacía si no hay ninguno de los dos. */
export function nombreCompleto(nombre: string | null | undefined, apellido: string | null | undefined): string {
  return [nombre, apellido]
    .map((parte) => parte?.trim())
    .filter(Boolean)
    .join(' ');
}

export function etiquetaRol(rol: string | null | undefined): string {
  return rol ? (ETIQUETAS_ROL[rol] ?? rol) : '';
}
