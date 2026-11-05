import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { EstadoPago, Pago } from '../../core/models/pago';
import { formatearPesos, formatearPorcentaje } from '../../core/utils/moneda';
import { ToastService } from './toast.service';

const CLAVE = 'appointech_avisos_pago';

/**
 * Qué avisos emergentes corresponden a cada paso del pago. Solo se avisa de las transiciones: lo que acaba
 * de pasar por una acción de la persona, o un resultado de pago que no se había anunciado ya. Así volver
 * a una pantalla con un pago antiguo no repite el aviso.
 */
@Injectable({ providedIn: 'root' })
export class AvisosPagoService {
  constructor(
    private toast: ToastService,
    private router: Router,
    @Inject(DOCUMENT) private doc: Document
  ) {}

  /** Resultado de una consulta del pago en línea (cliente). Se anuncia una vez por cada cambio de estado. */
  anunciarResultado(pago: Pago): void {
    if (this.leer()[pago.citaId] === pago.estado) return;
    this.recordar(pago.citaId, pago.estado);

    switch (pago.estado) {
      case 'PAGADO':
        this.toast.exito('Pago recibido', 'Tu pago se registró correctamente.', {
          etiqueta: 'Ver comprobante',
          accion: this.verComprobante(['/cliente/citas', pago.citaId]),
        });
        break;
      case 'FALLIDO':
        this.toast.error('El pago no se completó', 'Puedes intentarlo de nuevo o elegir otro método.');
        break;
      default:
        this.toast.info('Pago en proceso', 'Aún no recibimos la confirmación. Verifica de nuevo en unos instantes.');
    }
  }

  /** El cliente inicia un nuevo intento de pago: el próximo resultado debe volver a anunciarse. */
  reiniciar(citaId: number): void {
    const estados = this.leer();
    delete estados[citaId];
    this.guardar(estados);
  }

  anunciarEfectivoConfirmado(citaId: number): void {
    this.toast.exito('Pago en efectivo confirmado', 'El pago quedó registrado como pagado.', {
      etiqueta: 'Ver comprobante',
      accion: this.verComprobante(['/tecnico/citas', citaId, 'pago']),
    });
  }

  anunciarCostoFinal(pago: Pago): void {
    this.toast.exito('Costo final registrado', `Quedó en ${formatearPesos(pago.montoFinal)}.`);
    if (pago.diferenciaSignificativa) {
      this.toast.advertencia(
        'El costo final difiere del estimado',
        `${formatearPorcentaje(pago.porcentajeDiferencia)} respecto al valor estimado. El cliente verá la advertencia.`
      );
    }
  }

  anunciarCitaConfirmada(): void {
    this.toast.exito('Cita confirmada', 'El técnico irá a tu domicilio en el horario elegido.');
  }

  /** Falla de una acción de pago: el mismo mensaje que ya se muestra en pantalla. */
  error(titulo: string, mensaje: string): void {
    this.toast.error(titulo, mensaje);
  }

  /** Lleva a la pantalla del pago y, si ya está el comprobante, lo deja a la vista. */
  private verComprobante(ruta: (string | number)[]): () => void {
    return () => {
      this.router
        .navigate(ruta)
        .then(() => this.doc.querySelector('app-comprobante')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }))
        // Si la navegación falla, el router ya lo reporta; aquí solo se evita una promesa sin manejar.
        .catch(() => undefined);
    };
  }

  private leer(): Record<number, EstadoPago> {
    try {
      return (JSON.parse(sessionStorage.getItem(CLAVE) ?? '{}') ?? {}) as Record<number, EstadoPago>;
    } catch {
      return {};
    }
  }

  private recordar(citaId: number, estado: EstadoPago): void {
    this.guardar({ ...this.leer(), [citaId]: estado });
  }

  private guardar(estados: Record<number, EstadoPago>): void {
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(estados));
    } catch {
      // Sin almacenamiento, el peor caso es repetir un aviso al volver a la pantalla.
    }
  }
}
