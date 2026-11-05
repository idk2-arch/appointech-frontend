import type { Comprobante, Pago } from './pago';
import type { CitaFinalizadaTecnico } from './tecnico-agenda';

/** Pago con costo final y sin método elegido; cada prueba cambia solo lo que le interesa. */
export function pagoDe(parcial: Partial<Pago> = {}): Pago {
  return {
    citaId: 7,
    montoCotizado: 100000,
    montoFinal: 120000,
    metodo: null,
    estado: 'PENDIENTE',
    referencia: null,
    pagadoEn: null,
    diferenciaSignificativa: false,
    porcentajeDiferencia: null,
    urlPago: null,
    ...parcial,
  };
}

export function comprobanteDe(parcial: Partial<Comprobante> = {}): Comprobante {
  return {
    numero: 'CP-0001',
    emitidoEn: '2026-11-05T10:00:00',
    citaId: 7,
    cliente: 'Ana Pérez',
    tecnico: 'Luis Gómez',
    especialidad: 'Lavadoras',
    monto: 120000,
    moneda: 'COP',
    metodo: 'EFECTIVO',
    referencia: 'REF-123',
    pagadoEn: '2026-11-05T09:30:00',
    ...parcial,
  };
}

export function citaFinalizadaDe(parcial: Partial<CitaFinalizadaTecnico> = {}): CitaFinalizadaTecnico {
  return {
    id: 7,
    estado: 'FINALIZADA',
    fechaHoraInicio: '2026-11-04T08:00:00',
    fechaHoraFin: '2026-11-04T10:00:00',
    descripcionProblema: 'La lavadora no centrifuga',
    direccionServicio: 'Calle 10 # 5-20',
    cliente: { nombre: 'Ana', apellido: 'Pérez', telefono: null },
    estadoPago: 'SIN_COSTO_FINAL',
    ...parcial,
  };
}
