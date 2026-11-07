import type { EstadoCita, MotivoSolicitudEspecial } from '../../../core/models/cita';
import type { Metricas, RolMetrica } from '../../../core/models/metricas';
import type { MetodoPago } from '../../../core/models/pago';
import { claseBarraEstado, etiquetaEstadoCita } from '../../../core/utils/estado-cita';
import { etiquetaMetodoPago } from '../../../core/utils/estado-pago';
import { formatearDia, formatearTasa } from '../../../core/utils/formato-metricas';
import { formatearPesos } from '../../../core/utils/moneda';
import { etiquetaMotivoSolicitud } from '../../../core/utils/motivo-solicitud-especial';

const ESTADOS: EstadoCita[] = ['PENDIENTE', 'CONFIRMADA', 'EN_CAMINO', 'EN_PROCESO', 'FINALIZADA', 'CANCELADA'];
const METODOS: MetodoPago[] = ['EFECTIVO', 'EN_LINEA'];
const MOTIVOS: MotivoSolicitudEspecial[] = ['FUERA_DE_COBERTURA', 'SIN_TECNICOS_ESPECIALIDAD'];
const ROLES: { rol: RolMetrica; etiqueta: string }[] = [
  { rol: 'CLIENTE', etiqueta: 'Clientes' },
  { rol: 'TECNICO', etiqueta: 'Técnicos' },
  { rol: 'ADMINISTRADOR', etiqueta: 'Administradores' },
];

export const RADIO_ANILLO = 42;
export const CIRCUNFERENCIA_ANILLO = 2 * Math.PI * RADIO_ANILLO;
const ESTRELLAS = 5;
/** Técnicos que caben en la tarjeta de calificaciones; el resto se resume como "+N más". */
export const TECNICOS_EN_RANKING = 5;
/** Con menos calificaciones que estas, el promedio de un técnico es poco representativo. */
export const MIN_CALIFICACIONES_REPRESENTATIVAS = 3;

export interface FilaConteo {
  etiqueta: string;
  cantidad: number;
}

export interface FilaBarra extends FilaConteo {
  /** 0 a 100, proporcional a la barra más larga de la tarjeta. */
  ancho: number;
  clase: string;
}

export interface FilaMetodo {
  etiqueta: string;
  monto: string;
  cantidad: number;
}

export interface FilaEspecialidad {
  nombre: string;
  totalCitas: number;
  finalizadas: number;
  anchoTotal: number;
  anchoFinalizadas: number;
  /** Sin citas en el rango: se muestra atenuada, no se oculta. */
  atenuada: boolean;
}

export interface FilaTecnico {
  nombre: string;
  promedio: number;
  cantidad: number;
}

export interface VistaMetricas {
  rangoTexto: string;
  dias: number;
  /** Nada que mostrar en el rango: las tarjetas quedan en cero y se avisa. */
  sinActividad: boolean;
  citas: { total: number; barras: FilaBarra[] };
  tasa: { texto: string; porcentaje: number; trazo: string };
  ingresos: { total: string; cantidadPagos: number; metodos: FilaMetodo[] };
  porCobrar: { cantidad: number; monto: string };
  calificaciones: { promedio: number | null; total: number; estrellas: number[]; ranking: FilaTecnico[]; masTecnicos: number };
  especialidades: FilaEspecialidad[];
  solicitudes: { total: number; filas: FilaConteo[] };
  usuarios: { total: number; filas: FilaConteo[] };
}

const limitar = (valor: number, minimo: number, maximo: number): number => Math.min(maximo, Math.max(minimo, valor));

/** Porcentaje (0 a 100) de `valor` respecto de `maximo`; 0 si no hay con qué comparar. */
const proporcion = (valor: number, maximo: number): number => (maximo > 0 ? Math.round((valor / maximo) * 1000) / 10 : 0);

/** Relleno (0 a 1) de cada una de las 5 estrellas para un promedio; todas vacías sin promedio. */
export function rellenoDeEstrellas(promedio: number | null): number[] {
  return Array.from({ length: ESTRELLAS }, (_, i) => (promedio === null ? 0 : limitar(promedio - i, 0, 1)));
}

export function construirVista(m: Metricas): VistaMetricas {
  const porEstado = ESTADOS.map((estado) => ({ estado, cantidad: m.citas.porEstado[estado] ?? 0 }));
  const maxEstado = Math.max(0, ...porEstado.map((fila) => fila.cantidad));

  const maxCitasEspecialidad = Math.max(0, ...m.especialidades.map((e) => e.totalCitas));
  const tasa = limitar(m.citas.tasaCancelacion ?? 0, 0, 100);
  const trazo = (CIRCUNFERENCIA_ANILLO * tasa) / 100;

  return {
    rangoTexto: `Del ${formatearDia(m.rango.desde)} al ${formatearDia(m.rango.hasta)}`,
    dias: m.rango.dias,
    sinActividad:
      m.citas.total === 0 &&
      m.ingresos.cantidadPagos === 0 &&
      m.calificaciones.total === 0 &&
      m.especialidades.every((e) => e.totalCitas === 0),
    citas: {
      total: m.citas.total,
      barras: porEstado.map(({ estado, cantidad }) => ({
        etiqueta: etiquetaEstadoCita(estado),
        cantidad,
        ancho: proporcion(cantidad, maxEstado),
        clase: claseBarraEstado(estado),
      })),
    },
    tasa: { texto: formatearTasa(m.citas.tasaCancelacion), porcentaje: tasa, trazo: `${trazo.toFixed(2)} ${(CIRCUNFERENCIA_ANILLO - trazo).toFixed(2)}` },
    ingresos: {
      total: formatearPesos(m.ingresos.total),
      cantidadPagos: m.ingresos.cantidadPagos,
      metodos: METODOS.map((metodo) => ({
        etiqueta: etiquetaMetodoPago(metodo),
        monto: formatearPesos(m.ingresos.porMetodo[metodo]?.monto ?? 0),
        cantidad: m.ingresos.porMetodo[metodo]?.cantidad ?? 0,
      })),
    },
    porCobrar: { cantidad: m.ingresos.porCobrar.cantidad, monto: formatearPesos(m.ingresos.porCobrar.monto) },
    calificaciones: {
      promedio: m.calificaciones.promedio,
      total: m.calificaciones.total,
      estrellas: rellenoDeEstrellas(m.calificaciones.promedio),
      ranking: [...m.calificaciones.porTecnico]
        .sort((a, b) => b.promedio - a.promedio || b.cantidad - a.cantidad)
        .slice(0, TECNICOS_EN_RANKING)
        .map(({ nombre, promedio, cantidad }) => ({ nombre, promedio, cantidad })),
      masTecnicos: Math.max(0, m.calificaciones.porTecnico.length - TECNICOS_EN_RANKING),
    },
    especialidades: m.especialidades.map((e) => ({
      nombre: e.nombre,
      totalCitas: e.totalCitas,
      finalizadas: e.finalizadas,
      anchoTotal: proporcion(e.totalCitas, maxCitasEspecialidad),
      anchoFinalizadas: proporcion(e.finalizadas, maxCitasEspecialidad),
      atenuada: e.totalCitas === 0,
    })),
    solicitudes: {
      total: m.solicitudesEspeciales.total,
      filas: MOTIVOS.map((motivo) => ({ etiqueta: etiquetaMotivoSolicitud(motivo) ?? motivo, cantidad: m.solicitudesEspeciales.porMotivo[motivo] ?? 0 })),
    },
    usuarios: {
      total: m.usuariosActivos.total,
      filas: ROLES.map(({ rol, etiqueta }) => ({ etiqueta, cantidad: m.usuariosActivos.porRol[rol] ?? 0 })),
    },
  };
}
