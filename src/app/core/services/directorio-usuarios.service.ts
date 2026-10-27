import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';

import { AdminService, UsuarioAdmin } from './admin.service';
import { ClienteAdminService, ClienteResponse } from './cliente-admin.service';
import { TecnicoResponse, TecnicoService } from './tecnico.service';

export interface DirectorioUsuarios {
  tecnicos: TecnicoResponse[];
  clientes: ClienteResponse[];
  administradores: UsuarioAdmin[];
}

/** Reúne las tres listas de la gestión de usuarios; cada una trae los datos propios de su rol. */
@Injectable({ providedIn: 'root' })
export class DirectorioUsuariosService {
  constructor(
    private tecnicoService: TecnicoService,
    private clienteAdminService: ClienteAdminService,
    private adminService: AdminService
  ) {}

  cargar(): Observable<DirectorioUsuarios> {
    return forkJoin({
      tecnicos: this.tecnicoService.obtenerTecnicos(),
      clientes: this.clienteAdminService.obtenerClientes(),
      usuarios: this.adminService.obtenerUsuarios(),
    }).pipe(
      map(({ tecnicos, clientes, usuarios }) => ({
        tecnicos: Array.isArray(tecnicos) ? tecnicos : [],
        clientes: Array.isArray(clientes) ? clientes : [],
        administradores: (Array.isArray(usuarios) ? usuarios : []).filter((u) => u.rol === 'ADMINISTRADOR'),
      }))
    );
  }
}
