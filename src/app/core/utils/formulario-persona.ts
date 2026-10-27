import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import type { RegistroClienteRequest, TipoDocumento } from '../services/auth.service';
import type { ActualizarClienteRequest, ClienteResponse } from '../services/cliente-admin.service';
import type { ActualizarTecnicoRequest, CrearTecnicoRequest, TecnicoResponse } from '../services/tecnico.service';
import { parCoordenadasValidator, validadoresLatitud, validadoresLongitud } from './coordenadas';

export const TIPOS_DOCUMENTO: { valor: TipoDocumento; etiqueta: string }[] = [
  { valor: 'CC', etiqueta: 'Cédula de ciudadanía' },
  { valor: 'CE', etiqueta: 'Cédula de extranjería' },
  { valor: 'PASAPORTE', etiqueta: 'Pasaporte' },
];

export const LARGO_MINIMO_CONTRASENA = 8;

function contrasenasCoincidenValidator(grupo: AbstractControl): ValidationErrors | null {
  return grupo.get('contrasena')?.value === grupo.get('confirmarContrasena')?.value
    ? null
    : { contrasenasNoCoinciden: true };
}

export interface OpcionesFormularioPersona {
  /** Agrega "Confirmar contraseña" (registro público). */
  confirmarContrasena?: boolean;
  /** Agrega dirección base, especialidades y coordenadas ocultas del técnico. */
  tecnico?: boolean;
  /** Cliente con coordenadas ocultas (edición por el administrador). */
  ubicacionCliente?: boolean;
  /** Edición: sin contraseña (no se edita aquí) y el tipo de documento no es obligatorio. */
  edicion?: boolean;
}

/**
 * Grupo de controles compartido por el registro de clientes y el alta/edición de técnicos.
 * Las validaciones replican las del backend. En modo cliente la dirección es `direccion`;
 * en modo técnico es `direccionBase`.
 */
export function crearFormularioPersona(fb: FormBuilder, opciones: OpcionesFormularioPersona = {}): FormGroup {
  const controles: Record<string, unknown[]> = {
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    correo: ['', [Validators.required, Validators.email]],
    telefono: [''],
    tipoDocumento: ['', opciones.edicion ? [] : [Validators.required]],
    numeroDocumento: [''],
  };
  const validadores: ValidatorFn[] = [];

  if (!opciones.edicion) {
    controles['contrasena'] = ['', [Validators.required, Validators.minLength(LARGO_MINIMO_CONTRASENA)]];
  }

  if (opciones.confirmarContrasena) {
    controles['confirmarContrasena'] = ['', [Validators.required]];
    validadores.push(contrasenasCoincidenValidator);
  }

  if (opciones.tecnico) {
    controles['direccionBase'] = ['', [Validators.required]];
    controles['latitudBase'] = [null as number | null, validadoresLatitud];
    controles['longitudBase'] = [null as number | null, validadoresLongitud];
    controles['especialidadIds'] = [[] as number[]];
    validadores.push(parCoordenadasValidator('latitudBase', 'longitudBase'));
  } else {
    controles['direccion'] = ['', [Validators.required]];
    if (opciones.ubicacionCliente) {
      controles['latitud'] = [null as number | null, validadoresLatitud];
      controles['longitud'] = [null as number | null, validadoresLongitud];
      validadores.push(parCoordenadasValidator('latitud', 'longitud'));
    }
  }

  return fb.group(controles, { validators: validadores });
}

/** Valores iniciales del formulario de técnico (alta vacía o edición con los datos actuales). */
export function valoresFormularioTecnico(tecnico: TecnicoResponse | null): Record<string, unknown> {
  return {
    nombre: tecnico?.nombre ?? '',
    apellido: tecnico?.apellido ?? '',
    correo: tecnico?.correo ?? '',
    contrasena: '',
    telefono: tecnico?.telefono ?? '',
    tipoDocumento: tecnico?.tipoDocumento ?? '',
    numeroDocumento: tecnico?.numeroDocumento ?? '',
    direccionBase: tecnico?.direccionBase ?? '',
    latitudBase: tecnico?.latitudBase ?? null,
    longitudBase: tecnico?.longitudBase ?? null,
    especialidadIds: tecnico?.especialidades.map((e) => e.id) ?? [],
  };
}

/** Valores iniciales del formulario de cliente en edición. */
export function valoresFormularioCliente(cliente: ClienteResponse): Record<string, unknown> {
  return {
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    correo: cliente.correo,
    telefono: cliente.telefono ?? '',
    tipoDocumento: cliente.tipoDocumento ?? '',
    numeroDocumento: cliente.numeroDocumento ?? '',
    direccion: cliente.direccion ?? '',
    latitud: cliente.latitud,
    longitud: cliente.longitud,
  };
}

function texto(valor: unknown): string {
  return String(valor ?? '').trim();
}

function hayValor(valor: unknown): boolean {
  return valor !== null && valor !== undefined && valor !== '';
}

/** Campos opcionales: vacío = se omite (el backend no modifica lo ausente). */
function datosPersonales(v: Record<string, unknown>) {
  const telefono = texto(v['telefono']);
  const numeroDocumento = texto(v['numeroDocumento']);
  const tipoDocumento = v['tipoDocumento'] as TipoDocumento | '';
  return {
    nombre: texto(v['nombre']),
    apellido: texto(v['apellido']),
    correo: texto(v['correo']),
    ...(tipoDocumento && { tipoDocumento }),
    ...(telefono && { telefono }),
    ...(numeroDocumento && { numeroDocumento }),
  };
}

function datosTecnico(v: Record<string, unknown>) {
  const hayPunto = hayValor(v['latitudBase']) && hayValor(v['longitudBase']);
  return {
    direccionBase: texto(v['direccionBase']),
    especialidadIds: (v['especialidadIds'] as number[] | null) ?? [],
    ...(hayPunto && { latitudBase: Number(v['latitudBase']), longitudBase: Number(v['longitudBase']) }),
  };
}

export function aSolicitudCliente(valor: Record<string, unknown>): RegistroClienteRequest {
  return {
    ...(datosPersonales(valor) as Omit<RegistroClienteRequest, 'contrasena' | 'direccion'>),
    contrasena: String(valor['contrasena'] ?? ''),
    direccion: texto(valor['direccion']),
  };
}

export function aCrearTecnico(valor: Record<string, unknown>): CrearTecnicoRequest {
  return {
    ...(datosPersonales(valor) as Omit<CrearTecnicoRequest, 'contrasena' | 'direccionBase'>),
    ...datosTecnico(valor),
    contrasena: String(valor['contrasena'] ?? ''),
  };
}

export function aActualizarTecnico(valor: Record<string, unknown>): ActualizarTecnicoRequest {
  return { ...datosPersonales(valor), ...datosTecnico(valor) };
}

export function aActualizarCliente(valor: Record<string, unknown>): ActualizarClienteRequest {
  const hayPunto = hayValor(valor['latitud']) && hayValor(valor['longitud']);
  const direccion = texto(valor['direccion']);
  return {
    ...datosPersonales(valor),
    ...(direccion && { direccion }),
    ...(hayPunto && { latitud: Number(valor['latitud']), longitud: Number(valor['longitud']) }),
  };
}
