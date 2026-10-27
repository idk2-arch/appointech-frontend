import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { LARGO_MINIMO_CONTRASENA, TIPOS_DOCUMENTO } from '../../core/utils/formulario-persona';
import { UbicacionElegida } from '../selector-direccion/selector-direccion.component';

let contador = 0;

/**
 * Campos de datos personales + dirección, compartidos por el registro de clientes y la
 * creación de técnicos. Recibe el grupo creado con `crearFormularioPersona`: si el grupo
 * tiene `direccionBase` se comporta como técnico (mapa con pin y especialidades).
 */
@Component({
  selector: 'app-campos-persona',
  standalone: false,
  templateUrl: './campos-persona.component.html',
})
export class CamposPersonaComponent {
  @Input({ required: true }) form!: FormGroup;

  readonly id = `persona-${++contador}`;
  readonly tiposDocumento = TIPOS_DOCUMENTO;
  readonly largoMinimo = LARGO_MINIMO_CONTRASENA;
  mostrarContrasena = false;
  mostrarConfirmacion = false;

  get esTecnico(): boolean {
    return this.form.contains('direccionBase');
  }

  get conContrasena(): boolean {
    return this.form.contains('contrasena');
  }

  get conConfirmacion(): boolean {
    return this.form.contains('confirmarContrasena');
  }

  /** Controles ocultos de coordenadas: latitudBase/longitudBase (técnico) o latitud/longitud (cliente). */
  get campoLatitud(): string {
    return this.esTecnico ? 'latitudBase' : 'latitud';
  }

  get campoLongitud(): string {
    return this.esTecnico ? 'longitudBase' : 'longitud';
  }

  get conMapa(): boolean {
    return this.form.contains(this.campoLatitud);
  }

  get campoDireccion(): string {
    return this.esTecnico ? 'direccionBase' : 'direccion';
  }

  /** Control con error visible: ya se tocó y es inválido. */
  invalido(nombre: string): boolean {
    const c = this.form.get(nombre);
    return !!c && c.invalid && c.touched;
  }

  tiene(nombre: string, error: string): boolean {
    return !!this.form.get(nombre)?.hasError(error);
  }

  get confirmacionInvalida(): boolean {
    const c = this.form.get('confirmarContrasena');
    return !!c && c.touched && (c.invalid || this.form.hasError('contrasenasNoCoinciden'));
  }

  get errorDireccion(): string | null {
    return this.invalido(this.campoDireccion) ? 'Escribe la dirección y elígela de la lista.' : null;
  }

  /** Técnico con dirección escrita pero sin lugar marcado: no aparecería en los horarios de los clientes. */
  get faltaPuntoTecnico(): boolean {
    return (
      this.esTecnico &&
      !!String(this.form.get('direccionBase')?.value ?? '').trim() &&
      this.form.get(this.campoLatitud)?.value === null
    );
  }

  onDireccionCambio(texto: string): void {
    const control = this.form.get(this.campoDireccion);
    control?.setValue(texto);
    control?.markAsTouched();
  }

  onUbicacionCambio(ubicacion: UbicacionElegida): void {
    if (!this.conMapa) return;
    this.form.patchValue({ [this.campoLatitud]: ubicacion.latitud, [this.campoLongitud]: ubicacion.longitud });
  }
}
