import type { EstadoCita, MotivoSolicitudEspecial } from './cita';
import type { MetodoPago } from './pago';

export type RolMetrica = 'CLIENTE' | 'TECNICO' | 'ADMINISTRADOR';

/** Fechas YYYY-MM-DD; `dias` cuenta el día inicial y el final. */
export interface RangoMetricas {
  desde: string;
  hasta: string;
  dias: number;
}

/** Los mapas (porEstado, porMotivo, porMetodo, porRol) traen siempre todas las claves, en cero si no hay datos. */
export interface MetricasCitas {
  total: number;
  porEstado: Record<EstadoCita, number>;
  /** Porcentaje (0 a 100); 0 si no hay citas. */
  tasaCancelacion: number;
}

/** Estado actual: no depende del rango de fechas. */
export interface MetricasSolicitudesEspeciales {
  total: number;
  porMotivo: Record<MotivoSolicitudEspecial, number>;
}

export interface MontoCantidad {
  monto: number;
  cantidad: number;
}

export interface MetricasIngresos {
  total: number;
  cantidadPagos: number;
  porMetodo: Record<MetodoPago, MontoCantidad>;
  /** Estado actual: pagos pendientes con costo final, sin importar el rango. */
  porCobrar: MontoCantidad;
}

export interface MetricasEspecialidad {
  especialidadId: number;
  nombre: string;
  totalCitas: number;
  finalizadas: number;
}

export interface MetricasTecnicoCalificado {
  tecnicoId: number;
  nombre: string;
  promedio: number;
  cantidad: number;
}

export interface MetricasCalificaciones {
  /** Null si no hay calificaciones. */
  promedio: number | null;
  total: number;
  porTecnico: MetricasTecnicoCalificado[];
}

/** Estado actual: no depende del rango de fechas. */
export interface MetricasUsuarios {
  total: number;
  porRol: Record<RolMetrica, number>;
}

/** GET /admin/metricas. Los montos pueden traer decimales: se redondean solo al mostrarlos. */
export interface Metricas {
  rango: RangoMetricas;
  citas: MetricasCitas;
  solicitudesEspeciales: MetricasSolicitudesEspeciales;
  ingresos: MetricasIngresos;
  especialidades: MetricasEspecialidad[];
  calificaciones: MetricasCalificaciones;
  usuariosActivos: MetricasUsuarios;
}

/** Sin fechas el servidor usa los últimos 30 días, contando hoy. */
export interface RangoSolicitado {
  desde?: string | null;
  hasta?: string | null;
}
