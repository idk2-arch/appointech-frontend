import { describe, expect, it } from 'vitest';

import type { UsuarioAdmin } from '../../../../core/services/admin.service';
import type { ClienteResponse } from '../../../../core/services/cliente-admin.service';
import type { TecnicoResponse } from '../../../../core/services/tecnico.service';
import { COLUMNAS, filaDeAdministrador, filaDeCliente, filaDeTecnico } from './filas-usuarios';

const TECNICO: TecnicoResponse = {
  id: 1,
  nombre: 'Luis',
  apellido: 'Gómez',
  correo: 'Luis@Correo.co',
  direccionBase: 'Calle 6 # 12-34',
  radioCoberturaKm: 15,
  especialidades: [{ id: 3, nombre: 'Lavadoras', descripcion: 'Reparación' }],
  usuarioId: 9,
  telefono: '3001234567',
  tipoDocumento: 'CC',
  numeroDocumento: '123',
  activo: true,
  latitudBase: 4.3,
  longitudBase: -74.3,
  fotoUrl: '/api/fotos/luis',
};

const CLIENTE: ClienteResponse = {
  id: 2,
  usuarioId: 8,
  nombre: 'Ana',
  apellido: 'Pérez',
  correo: 'ana@correo.co',
  telefono: null,
  tipoDocumento: 'CE',
  numeroDocumento: '987',
  activo: false,
  direccion: 'Carrera 7',
  latitud: 4.7,
  longitud: -74.1,
};

const ADMIN: UsuarioAdmin = {
  id: 5,
  nombre: 'Sara',
  apellido: 'Ruiz',
  correo: 'sara@correo.co',
  telefono: '3110000000',
  tipoDocumento: null,
  numeroDocumento: null,
  rol: 'ADMINISTRADOR',
  activo: true,
  creadoEn: '2026-01-15T10:00:00',
};

describe('COLUMNAS', () => {
  it('cada tipo de usuario tiene sus columnas, y el nombre va primero', () => {
    expect(COLUMNAS.TECNICO.map((c) => c.clave)).toEqual(['nombre', 'correo', 'telefono', 'especialidades', 'direccion', 'radio', 'ubicacion']);
    expect(COLUMNAS.CLIENTE.map((c) => c.clave)).toEqual(['nombre', 'correo', 'telefono', 'documento', 'direccion']);
    expect(COLUMNAS.ADMINISTRADOR.map((c) => c.clave)).toEqual(['nombre', 'correo', 'telefono', 'creadoEn']);
    for (const tipo of Object.values(COLUMNAS)) expect(tipo[0].clave).toBe('nombre');
  });

  it('marca los tipos de celda especiales', () => {
    expect(COLUMNAS.TECNICO.find((c) => c.clave === 'especialidades')?.tipo).toBe('etiquetas');
    expect(COLUMNAS.TECNICO.find((c) => c.clave === 'ubicacion')?.tipo).toBe('ubicacion');
    expect(COLUMNAS.ADMINISTRADOR.find((c) => c.clave === 'creadoEn')?.tipo).toBe('fecha');
  });
});

describe('filaDeTecnico', () => {
  const fila = filaDeTecnico(TECNICO);

  it('identifica la fila con el id del técnico y el del usuario', () => {
    expect(fila).toMatchObject({ tipo: 'TECNICO', id: 1, usuarioId: 9, nombre: 'Luis Gómez', fotoUrl: '/api/fotos/luis', activo: true });
    expect(fila.origen).toBe(TECNICO);
  });

  it('la búsqueda es en minúsculas e incluye nombre y correo', () => {
    expect(fila.busqueda).toBe('luis gómez luis@correo.co');
  });

  it('las celdas traen especialidades, radio y si tiene ubicación', () => {
    expect(fila.celdas).toMatchObject({
      nombre: 'Luis Gómez',
      direccion: 'Calle 6 # 12-34',
      radio: '15 km',
      ubicacion: true,
      especialidades: TECNICO.especialidades,
    });
  });

  it('sin radio de cobertura la celda queda nula', () => {
    expect(filaDeTecnico({ ...TECNICO, radioCoberturaKm: null as unknown as number }).celdas['radio']).toBeNull();
  });

  it('sin coordenadas, no tiene ubicación (basta con que falte una)', () => {
    expect(filaDeTecnico({ ...TECNICO, latitudBase: null }).celdas['ubicacion']).toBe(false);
    expect(filaDeTecnico({ ...TECNICO, longitudBase: null }).celdas['ubicacion']).toBe(false);
  });
});

describe('filaDeCliente', () => {
  const fila = filaDeCliente(CLIENTE);

  it('identifica la fila y respeta si está inactivo', () => {
    expect(fila).toMatchObject({ tipo: 'CLIENTE', id: 2, usuarioId: 8, nombre: 'Ana Pérez', activo: false });
  });

  it('une tipo y número de documento', () => {
    expect(fila.celdas['documento']).toBe('CE 987');
  });

  it('sin documento la celda queda vacía; con solo uno de los dos, muestra ese', () => {
    expect(filaDeCliente({ ...CLIENTE, tipoDocumento: null, numeroDocumento: null }).celdas['documento']).toBe('');
    expect(filaDeCliente({ ...CLIENTE, numeroDocumento: null }).celdas['documento']).toBe('CE');
  });

  it('copia teléfono y dirección tal cual (incluso nulos)', () => {
    expect(fila.celdas).toMatchObject({ telefono: null, direccion: 'Carrera 7', correo: 'ana@correo.co' });
  });
});

describe('filaDeAdministrador', () => {
  const fila = filaDeAdministrador(ADMIN);

  it('el id de la fila y el del usuario son el mismo', () => {
    expect(fila).toMatchObject({ tipo: 'ADMINISTRADOR', id: 5, usuarioId: 5, nombre: 'Sara Ruiz', activo: true });
  });

  it('las celdas traen la fecha de creación', () => {
    expect(fila.celdas).toMatchObject({ creadoEn: '2026-01-15T10:00:00', telefono: '3110000000' });
  });

  it('el nombre no deja espacios sobrantes si falta el apellido', () => {
    expect(filaDeAdministrador({ ...ADMIN, apellido: '' }).nombre).toBe('Sara');
  });
});
