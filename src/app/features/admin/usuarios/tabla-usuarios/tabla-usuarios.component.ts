import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ColumnaTabla, EtiquetaCelda, FilaUsuario } from './tabla-usuarios.modelos';

/**
 * Tabla de una pestaña de usuarios. Solo muestra las filas y avisa de las acciones;
 * las columnas y los datos de cada fila vienen de fuera.
 */
@Component({
  selector: 'app-tabla-usuarios',
  standalone: false,
  templateUrl: './tabla-usuarios.component.html',
})
export class TablaUsuariosComponent {
  @Input({ required: true }) columnas: ColumnaTabla[] = [];
  @Input({ required: true }) filas: FilaUsuario[] = [];
  @Output() editar = new EventEmitter<FilaUsuario>();
  @Output() desactivar = new EventEmitter<FilaUsuario>();
  @Output() activar = new EventEmitter<FilaUsuario>();

  private descripcionesAbiertas = new Set<string>();

  texto(fila: FilaUsuario, columna: ColumnaTabla): string {
    const valor = fila.celdas[columna.clave];
    return valor === null || valor === undefined || valor === '' ? '—' : String(valor);
  }

  etiquetas(fila: FilaUsuario, columna: ColumnaTabla): EtiquetaCelda[] {
    return (fila.celdas[columna.clave] as EtiquetaCelda[] | null) ?? [];
  }

  esVerdadero(fila: FilaUsuario, columna: ColumnaTabla): boolean {
    return fila.celdas[columna.clave] === true;
  }

  fecha(fila: FilaUsuario, columna: ColumnaTabla): string | null {
    return (fila.celdas[columna.clave] as string | null) || null;
  }

  alternarDescripcion(fila: FilaUsuario, etiqueta: EtiquetaCelda): void {
    const clave = this.claveDescripcion(fila, etiqueta);
    if (!this.descripcionesAbiertas.delete(clave)) this.descripcionesAbiertas.add(clave);
  }

  descripcionAbierta(fila: FilaUsuario, etiqueta: EtiquetaCelda): boolean {
    return this.descripcionesAbiertas.has(this.claveDescripcion(fila, etiqueta));
  }

  private claveDescripcion(fila: FilaUsuario, etiqueta: EtiquetaCelda): string {
    return `${fila.usuarioId}-${etiqueta.id}`;
  }
}
