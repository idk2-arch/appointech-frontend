import { ChangeDetectorRef, Component, OnInit } from '@angular/core';

import { AdminService, UsuarioAdmin } from '../../../core/services/admin.service';
import { RubberSegmentItem } from '../../../shared/rubber-segment/rubber-segment.component';

@Component({
  selector: 'app-usuarios',
  standalone: false,
  templateUrl: './usuarios.component.html',
})
export class UsuariosComponent implements OnInit {
  usuarios: UsuarioAdmin[] = [];
  cargando = true;
  errorCarga: string | null = null;

  mostrarModalCrear = false;
  usuarioEditando: UsuarioAdmin | null = null;
  usuarioParaCambiarEstado: UsuarioAdmin | null = null;
  cargandoEstado = false;

  readonly filtrosRol: RubberSegmentItem[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'CLIENTE', label: 'Cliente' },
    { value: 'TECNICO', label: 'Técnico' },
    { value: 'ADMINISTRADOR', label: 'Administrador' },
  ];
  rolFiltro = 'todos';

  get usuariosFiltrados(): UsuarioAdmin[] {
    if (this.rolFiltro === 'todos') return this.usuarios;
    return this.usuarios.filter((u) => u.rol === this.rolFiltro);
  }

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(mostrarCargando = true): void {
    if (mostrarCargando) {
      this.cargando = true;
    }
    this.errorCarga = null;

    this.adminService.obtenerUsuarios().subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargando = false;
        this.errorCarga = 'No fue posible cargar la lista de usuarios.';
        this.cdr.markForCheck();
      },
    });
  }

  abrirModalCrear(): void {
    this.mostrarModalCrear = true;
  }

  cerrarModalCrear(): void {
    this.mostrarModalCrear = false;
  }

  onAdministradorCreado(): void {
    this.mostrarModalCrear = false;
    this.cargarUsuarios(false);
  }

  abrirModalEditar(usuario: UsuarioAdmin): void {
    this.usuarioEditando = usuario;
  }

  cerrarModalEditar(): void {
    this.usuarioEditando = null;
  }

  onUsuarioActualizado(): void {
    this.usuarioEditando = null;
    this.cargarUsuarios(false);
  }

  desactivarUsuario(usuario: UsuarioAdmin): void {
    this.adminService.cambiarEstadoUsuario(usuario.id, { activo: false }).subscribe({
      next: () => this.cargarUsuarios(false),
      error: () => {
        this.errorCarga = `No fue posible desactivar a ${usuario.nombre}. Intenta de nuevo.`;
        this.cdr.markForCheck();
      },
    });
  }

  solicitarCambioEstado(usuario: UsuarioAdmin): void {
    this.usuarioParaCambiarEstado = usuario;
  }

  cancelarCambioEstado(): void {
    this.usuarioParaCambiarEstado = null;
  }

  confirmarCambioEstado(): void {
    const usuario = this.usuarioParaCambiarEstado;
    if (!usuario) return;

    this.cargandoEstado = true;
    const nuevoEstado = !usuario.activo;

    this.adminService.cambiarEstadoUsuario(usuario.id, { activo: nuevoEstado }).subscribe({
      next: () => {
        this.cargandoEstado = false;
        this.usuarioParaCambiarEstado = null;
        this.cargarUsuarios(false);
      },
      error: () => {
        this.cargandoEstado = false;
        this.usuarioParaCambiarEstado = null;
        this.errorCarga = `No fue posible ${nuevoEstado ? 'activar' : 'desactivar'} a ${usuario.nombre}. Intenta de nuevo.`;
        this.cdr.markForCheck();
      },
    });
  }
}
