/** Una página de resultados paginados por el servidor, con el total que cumple el filtro (encabezado X-Total-Count). */
export interface PaginaServidor<T> {
  filas: T[];
  total: number;
}
