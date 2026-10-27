import type { UsuarioAdmin } from '../../../../core/services/admin.service';
import type { ClienteResponse } from '../../../../core/services/cliente-admin.service';
import type { TecnicoResponse } from '../../../../core/services/tecnico.service';
import type { ColumnaTabla, FilaUsuario, TipoUsuario } from './tabla-usuarios.modelos';

export const COLUMNAS: Record<TipoUsuario, ColumnaTabla[]> = {
  TECNICO: [
    { clave: 'nombre', titulo: 'Nombre' },
    { clave: 'correo', titulo: 'Correo' },
    { clave: 'telefono', titulo: 'Teléfono' },
    { clave: 'especialidades', titulo: 'Especialidades', tipo: 'etiquetas', ancho: 'ancho' },
    { clave: 'direccion', titulo: 'Dirección base', ancho: 'ancho' },
    { clave: 'radio', titulo: 'Radio de cobertura' },
    { clave: 'ubicacion', titulo: 'Ubicación', tipo: 'ubicacion' },
  ],
  CLIENTE: [
    { clave: 'nombre', titulo: 'Nombre' },
    { clave: 'correo', titulo: 'Correo' },
    { clave: 'telefono', titulo: 'Teléfono' },
    { clave: 'documento', titulo: 'Documento' },
    { clave: 'direccion', titulo: 'Dirección', ancho: 'ancho' },
  ],
  ADMINISTRADOR: [
    { clave: 'nombre', titulo: 'Nombre' },
    { clave: 'correo', titulo: 'Correo' },
    { clave: 'telefono', titulo: 'Teléfono' },
    { clave: 'creadoEn', titulo: 'Fecha de creación', tipo: 'fecha' },
  ],
};

function nombreCompleto(nombre: string, apellido: string): string {
  return `${nombre} ${apellido}`.trim();
}

function textoBusqueda(nombre: string, correo: string): string {
  return `${nombre} ${correo}`.toLowerCase();
}

export function filaDeTecnico(t: TecnicoResponse): FilaUsuario {
  const nombre = nombreCompleto(t.nombre, t.apellido);
  return {
    tipo: 'TECNICO',
    id: t.id,
    usuarioId: t.usuarioId,
    nombre,
    activo: t.activo,
    busqueda: textoBusqueda(nombre, t.correo),
    origen: t,
    celdas: {
      nombre,
      correo: t.correo,
      telefono: t.telefono,
      especialidades: t.especialidades,
      direccion: t.direccionBase,
      radio: t.radioCoberturaKm == null ? null : `${t.radioCoberturaKm} km`,
      ubicacion: t.latitudBase !== null && t.longitudBase !== null,
    },
  };
}

export function filaDeCliente(c: ClienteResponse): FilaUsuario {
  const nombre = nombreCompleto(c.nombre, c.apellido);
  const documento = [c.tipoDocumento, c.numeroDocumento].filter(Boolean).join(' ');
  return {
    tipo: 'CLIENTE',
    id: c.id,
    usuarioId: c.usuarioId,
    nombre,
    activo: c.activo,
    busqueda: textoBusqueda(nombre, c.correo),
    origen: c,
    celdas: { nombre, correo: c.correo, telefono: c.telefono, documento, direccion: c.direccion },
  };
}

export function filaDeAdministrador(u: UsuarioAdmin): FilaUsuario {
  const nombre = nombreCompleto(u.nombre, u.apellido);
  return {
    tipo: 'ADMINISTRADOR',
    id: u.id,
    usuarioId: u.id,
    nombre,
    activo: u.activo,
    busqueda: textoBusqueda(nombre, u.correo),
    origen: u,
    celdas: { nombre, correo: u.correo, telefono: u.telefono, creadoEn: u.creadoEn },
  };
}
