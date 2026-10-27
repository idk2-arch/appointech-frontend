import { Pipe, PipeTransform } from '@angular/core';

function formatear(valor: number, decimales: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: decimales }).format(valor);
}

/** Distancia en km con un decimal; si es positiva pero se redondearía a 0, "menos de 0,1 km". */
@Pipe({ name: 'kilometros', standalone: false })
export class KilometrosPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '';
    if (valor > 0 && Math.round(valor * 10) === 0) return 'menos de 0,1 km';
    return `${formatear(valor, 1)} km`;
  }
}

/** Tiempo de viaje en minutos enteros; entre 0 y 1 minuto, "menos de 1 min". */
@Pipe({ name: 'minutosViaje', standalone: false })
export class MinutosViajePipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '';
    if (valor > 0 && valor < 1) return 'menos de 1 min';
    return `${formatear(valor, 0)} min`;
  }
}
