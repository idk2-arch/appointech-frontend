import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';

import { Cobertura, CoberturaService } from '../../../core/services/cobertura.service';
import { obtenerMensajeErrorEscritura } from '../../../core/utils/manejo-errores';
import { esTelefonoWhatsappValido, normalizarTelefonoWhatsapp } from '../../../core/utils/whatsapp';

export const RADIO_MINIMO_KM = 1;
export const RADIO_MAXIMO_KM = 100;

function whatsappValidator(control: AbstractControl): ValidationErrors | null {
  return esTelefonoWhatsappValido(control.value) ? null : { whatsappInvalido: true };
}

@Component({
  selector: 'app-cobertura',
  standalone: false,
  templateUrl: './cobertura.component.html',
})
export class CoberturaComponent implements OnInit, OnDestroy {
  private tareas = new Subscription();
  private radioActual = 0;

  form: FormGroup;
  cargando = true;
  guardando = false;
  errorCarga: string | null = null;
  errorGuardado: string | null = null;
  mensajeExito: string | null = null;

  constructor(
    private fb: FormBuilder,
    private coberturaService: CoberturaService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      radioMaximoKm: [
        null as number | null,
        [Validators.required, Validators.min(RADIO_MINIMO_KM), Validators.max(RADIO_MAXIMO_KM), Validators.pattern(/^\d+$/)],
      ],
      telefonoWhatsappAdmin: ['', [whatsappValidator]],
    });
  }

  get radio() {
    return this.form.get('radioMaximoKm');
  }

  get whatsapp() {
    return this.form.get('telefonoWhatsappAdmin');
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void { this.tareas.unsubscribe(); }

  cargar(): void {
    this.cargando = true;
    this.errorCarga = null;

    this.tareas.add(this.coberturaService
      .obtener()
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (cobertura) => this.mostrar(cobertura),
        error: (err) =>
          (this.errorCarga = obtenerMensajeErrorEscritura(err, 'cargar la distancia de atención', 'No se pudo leer la distancia.')),
      }));
  }

  guardar(): void {
    if (this.guardando || this.cargando || this.errorCarga) return;
    this.mensajeExito = null;
    this.errorGuardado = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.tareas.add(this.coberturaService
      .actualizar({
        radioMaximoKm: this.radioActual,
        // Vacío borra el número guardado; null lo dejaría igual.
        telefonoWhatsappAdmin: normalizarTelefonoWhatsapp(this.whatsapp?.value) ?? '',
      })
      .pipe(
        finalize(() => {
          this.guardando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (cobertura) => {
          this.mostrar(cobertura);
          this.mensajeExito = 'Contacto guardado correctamente.';
        },
        error: (err) =>
          (this.errorGuardado = obtenerMensajeErrorEscritura(
            err,
            'guardar el contacto',
            'Revisa el número de WhatsApp.'
          )),
      }));
  }

  private mostrar(cobertura: Cobertura): void {
    this.radioActual = cobertura.radioMaximoKm;
    this.radio?.disable();
    this.form.reset({
      radioMaximoKm: cobertura.radioMaximoKm,
      telefonoWhatsappAdmin: cobertura.telefonoWhatsappAdmin ?? '',
    });
  }
}
