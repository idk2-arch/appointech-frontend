import type { UsuarioAdmin } from '../../../../core/services/admin.service';
import type { ClienteResponse } from '../../../../core/services/cliente-admin.service';
import type { TecnicoResponse } from '../../../../core/services/tecnico.service';

export type TipoCelda = 'texto' | 'etiquetas' | 'ubicacion' | 'fecha';

export interface ColumnaTabla {
  clave: string;
  titulo: string;
  tipo?: TipoCelda;
  /** 'ancho': la columna puede partir el texto en varias líneas; el resto no. */
  ancho?: 'ancho';
}

export interface EtiquetaCelda {
  id: number;
  nombre: string;
  descripcion: string;
}

interface FilaBase {
  /** Id de la entidad de la fila (técnico, cliente o usuario). */
  id: number;
  /** Id del usuario: es el que usa el cambio de estado. */
  usuarioId: number;
  nombre: string;
  fotoUrl?: string | null;
  activo: boolean;
  /** Texto en minúsculas para la búsqueda por nombre o correo. */
  busqueda: string;
  celdas: Record<string, unknown>;
}

export type FilaUsuario = FilaBase &
  (
    | { tipo: 'TECNICO'; origen: TecnicoResponse }
    | { tipo: 'CLIENTE'; origen: ClienteResponse }
    | { tipo: 'ADMINISTRADOR'; origen: UsuarioAdmin }
  );

export type TipoUsuario = FilaUsuario['tipo'];
