import type { Metricas } from './metricas';

/** Las métricas de ejemplo del contrato; cada prueba cambia solo lo que le interesa. */
export function metricasDe(parcial: Partial<Metricas> = {}): Metricas {
  return {
    rango: { desde: '2026-10-08', hasta: '2026-11-06', dias: 30 },
    citas: {
      total: 20,
      porEstado: { PENDIENTE: 7, CONFIRMADA: 5, EN_CAMINO: 0, EN_PROCESO: 0, FINALIZADA: 7, CANCELADA: 1 },
      tasaCancelacion: 5,
    },
    solicitudesEspeciales: { total: 0, porMotivo: { SIN_TECNICOS_ESPECIALIDAD: 0, FUERA_DE_COBERTURA: 0 } },
    ingresos: {
      total: 585000,
      cantidadPagos: 4,
      porMetodo: { EFECTIVO: { monto: 395000, cantidad: 2 }, EN_LINEA: { monto: 190000, cantidad: 2 } },
      porCobrar: { cantidad: 1, monto: 300000 },
    },
    especialidades: [{ especialidadId: 6, nombre: 'Aires acondicionados', totalCitas: 2, finalizadas: 0 }],
    calificaciones: { promedio: 5, total: 1, porTecnico: [{ tecnicoId: 1, nombre: 'Freddy Monroy', promedio: 5, cantidad: 1 }] },
    usuariosActivos: { total: 4, porRol: { CLIENTE: 2, TECNICO: 1, ADMINISTRADOR: 1 } },
    ...parcial,
  };
}

/** Un rango sin nada: todos los mapas con sus claves en cero, sin calificaciones. */
export function metricasVacias(): Metricas {
  return metricasDe({
    citas: { total: 0, porEstado: { PENDIENTE: 0, CONFIRMADA: 0, EN_CAMINO: 0, EN_PROCESO: 0, FINALIZADA: 0, CANCELADA: 0 }, tasaCancelacion: 0 },
    ingresos: {
      total: 0,
      cantidadPagos: 0,
      porMetodo: { EFECTIVO: { monto: 0, cantidad: 0 }, EN_LINEA: { monto: 0, cantidad: 0 } },
      porCobrar: { cantidad: 0, monto: 0 },
    },
    especialidades: [{ especialidadId: 6, nombre: 'Aires acondicionados', totalCitas: 0, finalizadas: 0 }],
    calificaciones: { promedio: null, total: 0, porTecnico: [] },
  });
}
