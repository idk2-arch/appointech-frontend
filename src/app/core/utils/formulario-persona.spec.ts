import { FormBuilder } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import type { ClienteResponse } from '../services/cliente-admin.service';
import type { TecnicoResponse } from '../services/tecnico.service';
import {
  aActualizarCliente,
  aActualizarTecnico,
  aCrearTecnico,
  aSolicitudCliente,
  crearFormularioPersona,
  LARGO_MINIMO_CONTRASENA,
  OPCIONES_TIPO_DOCUMENTO,
  TIPOS_DOCUMENTO,
  valoresFormularioCliente,
  valoresFormularioTecnico,
} from './formulario-persona';

const fb = new FormBuilder();

const TECNICO: TecnicoResponse = {
  id: 1,
  nombre: 'Luis',
  apellido: 'Gómez',
  correo: 'luis@correo.co',
  direccionBase: 'Calle 6 # 12-34',
  radioCoberturaKm: 15,
  especialidades: [
    { id: 3, nombre: 'Lavadoras', descripcion: '' },
    { id: 5, nombre: 'Neveras', descripcion: '' },
  ],
  usuarioId: 9,
  telefono: '3001234567',
  tipoDocumento: 'CC',
  numeroDocumento: '123',
  activo: true,
  latitudBase: 4.3,
  longitudBase: -74.3,
};

const CLIENTE: ClienteResponse = {
  id: 2,
  usuarioId: 8,
  nombre: 'Ana',
  apellido: 'Pérez',
  correo: 'ana@correo.co',
  telefono: null,
  tipoDocumento: 'CE',
  numeroDocumento: null,
  activo: true,
  direccion: 'Carrera 7',
  latitud: 4.7,
  longitud: -74.1,
};

describe('catálogos', () => {
  it('ofrece los tres tipos de documento, también con la forma de app-select', () => {
    expect(TIPOS_DOCUMENTO.map((t) => t.valor)).toEqual(['CC', 'CE', 'PASAPORTE']);
    expect(OPCIONES_TIPO_DOCUMENTO).toEqual(TIPOS_DOCUMENTO.map((t) => ({ value: t.valor, label: t.etiqueta })));
  });
});

describe('crearFormularioPersona', () => {
  it('registro de cliente: nombre, apellido, correo, documento, contraseña y dirección son obligatorios', () => {
    const form = crearFormularioPersona(fb);
    expect(Object.keys(form.controls).sort()).toEqual(
      ['apellido', 'contrasena', 'correo', 'direccion', 'nombre', 'numeroDocumento', 'telefono', 'tipoDocumento'].sort()
    );
    expect(form.valid).toBe(false);

    form.patchValue({
      nombre: 'Ana',
      apellido: 'Pérez',
      correo: 'ana@correo.co',
      tipoDocumento: 'CC',
      contrasena: 'a'.repeat(LARGO_MINIMO_CONTRASENA),
      direccion: 'Calle 6',
    });
    expect(form.valid).toBe(true);
  });

  it('valida el formato del correo y el largo mínimo de la contraseña', () => {
    const form = crearFormularioPersona(fb);
    form.patchValue({ correo: 'no-es-correo', contrasena: 'corta' });
    expect(form.get('correo')?.hasError('email')).toBe(true);
    expect(form.get('contrasena')?.hasError('minlength')).toBe(true);
  });

  it('con confirmación, las contraseñas deben coincidir', () => {
    const form = crearFormularioPersona(fb, { confirmarContrasena: true });
    form.patchValue({ contrasena: 'secreta123', confirmarContrasena: 'otra-distinta' });
    expect(form.hasError('contrasenasNoCoinciden')).toBe(true);

    form.patchValue({ confirmarContrasena: 'secreta123' });
    expect(form.hasError('contrasenasNoCoinciden')).toBe(false);
  });

  it('técnico: agrega dirección base, coordenadas y especialidades, sin dirección de cliente', () => {
    const form = crearFormularioPersona(fb, { tecnico: true });
    expect(form.contains('direccionBase')).toBe(true);
    expect(form.contains('latitudBase')).toBe(true);
    expect(form.contains('especialidadIds')).toBe(true);
    expect(form.contains('direccion')).toBe(false);
    expect(form.get('direccionBase')?.hasError('required')).toBe(true);
  });

  it('técnico: las coordenadas van juntas o ninguna y deben estar en Colombia', () => {
    const form = crearFormularioPersona(fb, { tecnico: true });
    form.patchValue({ latitudBase: 4.3 });
    expect(form.hasError('coordenadasIncompletas')).toBe(true);

    form.patchValue({ longitudBase: -74.3 });
    expect(form.hasError('coordenadasIncompletas')).toBe(false);

    form.patchValue({ latitudBase: 40 });
    expect(form.get('latitudBase')?.hasError('max')).toBe(true);
  });

  it('cliente con ubicación: agrega latitud y longitud validadas', () => {
    const form = crearFormularioPersona(fb, { ubicacionCliente: true });
    expect(form.contains('latitud')).toBe(true);
    form.patchValue({ latitud: -74.3, longitud: 4.3 });
    expect(form.hasError('coordenadasInvertidas')).toBe(true);
  });

  it('edición: sin contraseña y con tipo de documento opcional', () => {
    const form = crearFormularioPersona(fb, { edicion: true });
    expect(form.contains('contrasena')).toBe(false);
    expect(form.get('tipoDocumento')?.valid).toBe(true);
  });
});

describe('valores iniciales', () => {
  it('técnico nuevo: todo vacío', () => {
    expect(valoresFormularioTecnico(null)).toMatchObject({
      nombre: '',
      correo: '',
      contrasena: '',
      direccionBase: '',
      latitudBase: null,
      especialidadIds: [],
    });
  });

  it('técnico existente: copia sus datos y los ids de sus especialidades', () => {
    expect(valoresFormularioTecnico(TECNICO)).toMatchObject({
      nombre: 'Luis',
      telefono: '3001234567',
      tipoDocumento: 'CC',
      direccionBase: 'Calle 6 # 12-34',
      latitudBase: 4.3,
      especialidadIds: [3, 5],
    });
  });

  it('técnico existente con datos faltantes usa cadenas vacías', () => {
    const valores = valoresFormularioTecnico({ ...TECNICO, telefono: null, tipoDocumento: null, numeroDocumento: null });
    expect(valores).toMatchObject({ telefono: '', tipoDocumento: '', numeroDocumento: '' });
  });

  it('cliente existente: copia sus datos y deja vacíos los que no tiene', () => {
    expect(valoresFormularioCliente(CLIENTE)).toMatchObject({
      nombre: 'Ana',
      telefono: '',
      tipoDocumento: 'CE',
      numeroDocumento: '',
      direccion: 'Carrera 7',
      latitud: 4.7,
    });
    expect(valoresFormularioCliente({ ...CLIENTE, direccion: null })['direccion']).toBe('');
  });
});

describe('conversión a solicitudes del backend', () => {
  const base = {
    nombre: '  Ana ',
    apellido: ' Pérez ',
    correo: ' ana@correo.co ',
    tipoDocumento: 'CC',
    telefono: ' 300 ',
    numeroDocumento: ' 123 ',
    contrasena: 'secreta123',
    direccion: ' Calle 6 ',
  };

  it('registro de cliente: recorta los textos y trae contraseña y dirección', () => {
    expect(aSolicitudCliente(base)).toEqual({
      nombre: 'Ana',
      apellido: 'Pérez',
      correo: 'ana@correo.co',
      tipoDocumento: 'CC',
      telefono: '300',
      numeroDocumento: '123',
      contrasena: 'secreta123',
      direccion: 'Calle 6',
    });
  });

  it('los campos opcionales vacíos se omiten', () => {
    const solicitud = aSolicitudCliente({ ...base, telefono: '  ', numeroDocumento: '', tipoDocumento: '' });
    expect(solicitud).not.toHaveProperty('telefono');
    expect(solicitud).not.toHaveProperty('numeroDocumento');
    expect(solicitud).not.toHaveProperty('tipoDocumento');
  });

  it('una contraseña ausente queda como cadena vacía', () => {
    expect(aSolicitudCliente({ ...base, contrasena: undefined }).contrasena).toBe('');
  });

  it('crear técnico: datos personales, dirección base, especialidades y coordenadas', () => {
    const solicitud = aCrearTecnico({ ...base, direccionBase: ' Calle 9 ', especialidadIds: [1, 2], latitudBase: '4.3', longitudBase: '-74.3' });
    expect(solicitud).toMatchObject({
      nombre: 'Ana',
      direccionBase: 'Calle 9',
      especialidadIds: [1, 2],
      latitudBase: 4.3,
      longitudBase: -74.3,
      contrasena: 'secreta123',
    });
  });

  it('crear técnico sin punto en el mapa no envía coordenadas y sin especialidades envía lista vacía', () => {
    const solicitud = aCrearTecnico({ ...base, direccionBase: 'Calle 9', latitudBase: null, longitudBase: null, especialidadIds: null });
    expect(solicitud).not.toHaveProperty('latitudBase');
    expect(solicitud.especialidadIds).toEqual([]);
  });

  it('un punto a medias (solo latitud) tampoco se envía', () => {
    const solicitud = aActualizarTecnico({ ...base, direccionBase: 'Calle 9', latitudBase: 4.3, longitudBase: '' });
    expect(solicitud).not.toHaveProperty('latitudBase');
    expect(solicitud).not.toHaveProperty('longitudBase');
  });

  it('actualizar técnico no trae contraseña', () => {
    const solicitud = aActualizarTecnico({ ...base, direccionBase: 'Calle 9', especialidadIds: [4] });
    expect(solicitud).not.toHaveProperty('contrasena');
    expect(solicitud.especialidadIds).toEqual([4]);
  });

  it('actualizar cliente: dirección y coordenadas solo si están completas', () => {
    expect(aActualizarCliente({ ...base, latitud: 4.7, longitud: -74.1 })).toMatchObject({ direccion: 'Calle 6', latitud: 4.7, longitud: -74.1 });

    const sinPunto = aActualizarCliente({ ...base, direccion: '  ', latitud: null, longitud: null });
    expect(sinPunto).not.toHaveProperty('direccion');
    expect(sinPunto).not.toHaveProperty('latitud');
  });
});
