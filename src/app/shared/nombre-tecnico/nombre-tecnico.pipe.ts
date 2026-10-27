import { Pipe, PipeTransform } from '@angular/core';

interface ConTecnico {
  tecnicoNombre?: string | null;
  tecnicoApellido?: string | null;
}

/** "Nombre Apellido" del técnico de una franja o cita; null si el backend no lo envía. */
@Pipe({
  name: 'nombreTecnico',
  standalone: false,
})
export class NombreTecnicoPipe implements PipeTransform {
  transform(origen: ConTecnico | null | undefined): string | null {
    const nombre = [origen?.tecnicoNombre, origen?.tecnicoApellido]
      .map((parte) => parte?.trim())
      .filter(Boolean)
      .join(' ');
    return nombre || null;
  }
}
