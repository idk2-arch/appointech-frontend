import type { TipoDocumento } from '../services/auth.service';

export interface EspecialidadPerfil {
  id: number;
  nombre: string;
  descripcion?: string | null;
}

/**
 * GET /perfil. Los datos de contacto se editan; correo, documento, rol y, en el técnico, las
 * especialidades y el radio de cobertura solo se muestran (los cambia el administrador).
 */
export interface Perfil {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string | null;
  tipoDocumento: TipoDocumento | null;
  numeroDocumento: string | null;
  /** Cliente y técnico (en el técnico, su dirección base). El administrador no tiene. */
  direccion?: string | null;
  rol?: string | null;
  especialidades?: EspecialidadPerfil[] | null;
  radioCoberturaKm?: number | null;
  fotoUrl?: string | null;
}

/** PUT /perfil: solo estos cuatro campos; lo que se omite no se modifica. */
export interface ActualizarPerfilRequest {
  nombre: string;
  apellido: string;
  telefono?: string;
  direccion?: string;
}
