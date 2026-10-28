import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { finalize } from 'rxjs';

import { AdminService, UsuarioAdmin } from '../../../core/services/admin.service';
import { ClienteResponse } from '../../../core/services/cliente-admin.service';
import { DirectorioUsuarios, DirectorioUsuariosService } from '../../../core/services/directorio-usuarios.service';
import { TecnicoResponse } from '../../../core/services/tecnico.service';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';
import { RubberSegmentItem } from '../../../shared/rubber-segment/rubber-segment.component';
import { TecnicoGuardado } from '../tecnicos/tecnico-modal/tecnico-modal.component';
import { COLUMNAS, filaDeAdministrador, filaDeCliente, filaDeTecnico } from './tabla-usuarios/filas-usuarios';
import { ColumnaTabla, FilaUsuario, TipoUsuario } from './tabla-usuarios/tabla-usuarios.modelos';

const PESTANAS: { valor: TipoUsuario; etiqueta: string; sinDatos: string }[] = [
  { valor: 'TECNICO', etiqueta: 'Técnico', sinDatos: 'Todavía no hay técnicos registrados.' },
  { valor: 'CLIENTE', etiqueta: 'Cliente', sinDatos: 'Todavía no hay clientes registrados.' },
  { valor: 'ADMINISTRADOR', etiqueta: 'Administrador', sinDatos: 'Todavía no hay administradores registrados.' },
];

@Component({
  selector: 'app-usuarios',
  standalone: false,
  templateUrl: './usuarios.component.html',
})
export class UsuariosComponent implements OnInit, OnDestroy {
  cargando = true;
  errorCarga: string | null = null;

  pestana: TipoUsuario = 'TECNICO';
  pestanas: RubberSegmentItem[] = [];
  busqueda = '';
  columnas: ColumnaTabla[] = COLUMNAS[this.pestana];
  filasVisibles: FilaUsuario[] = [];
  mensajeSinDatos = '';

  mostrarModalCrear = false;
  mostrarModalTecnico = false;
  filaConFoto: FilaUsuario | null = null;
  tecnicoEditando: TecnicoResponse | null = null;
  clienteEditando: ClienteResponse | null = null;
  usuarioEditando: UsuarioAdmin | null = null;
  filaParaCambiarEstado: FilaUsuario | null = null;
  cargandoEstado = false;

  mensajeExito: string | null = null;
  mensajeError: string | null = null;
  private temporizadorExito?: ReturnType<typeof setTimeout>;

  private filasPorPestana: Record<TipoUsuario, FilaUsuario[]> = { TECNICO: [], CLIENTE: [], ADMINISTRADOR: [] };

  constructor(
    private directorio: DirectorioUsuariosService,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizadorExito);
  }

  cargarUsuarios(mostrarCargando = true): void {
    if (mostrarCargando) this.cargando = true;
    this.errorCarga = null;

    this.directorio
      .cargar()
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (directorio) => this.aplicarDirectorio(directorio),
        error: (err) => {
          this.aplicarDirectorio({ tecnicos: [], clientes: [], administradores: [] });
          this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar la lista de usuarios.');
        },
      });
  }

  // ---- Pestañas y búsqueda ----

  cambiarPestana(valor: string): void {
    this.pestana = valor as TipoUsuario;
    this.busqueda = '';
    this.actualizarVista();
  }

  buscar(texto: string): void {
    this.busqueda = texto;
    this.actualizarVista();
  }

  private aplicarDirectorio(directorio: DirectorioUsuarios): void {
    this.filasPorPestana = {
      TECNICO: directorio.tecnicos.map(filaDeTecnico),
      CLIENTE: directorio.clientes.map(filaDeCliente),
      ADMINISTRADOR: directorio.administradores.map(filaDeAdministrador),
    };
    this.pestanas = PESTANAS.map((p) => ({ value: p.valor, label: `${p.etiqueta} (${this.filasPorPestana[p.valor].length})` }));
    this.actualizarVista();
  }

  private actualizarVista(): void {
    const filas = this.filasPorPestana[this.pestana];
    const consulta = this.busqueda.trim().toLowerCase();
    this.columnas = COLUMNAS[this.pestana];
    this.filasVisibles = consulta ? filas.filter((f) => f.busqueda.includes(consulta)) : filas;
    this.mensajeSinDatos = filas.length
      ? 'No encontramos a nadie con ese nombre o correo.'
      : (PESTANAS.find((p) => p.valor === this.pestana)?.sinDatos ?? '');
  }

  // ---- Crear ----

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

  abrirModalTecnico(): void {
    this.mostrarModalTecnico = true;
  }

  // ---- Editar: cada tipo abre su formulario completo; el administrador, el modal corto ----

  editar(fila: FilaUsuario): void {
    this.mensajeError = null;
    switch (fila.tipo) {
      case 'TECNICO':
        this.tecnicoEditando = fila.origen;
        break;
      case 'CLIENTE':
        this.clienteEditando = fila.origen;
        break;
      case 'ADMINISTRADOR':
        this.usuarioEditando = fila.origen;
    }
  }

  cerrarModalTecnico(): void {
    this.mostrarModalTecnico = false;
    this.tecnicoEditando = null;
  }

  onTecnicoGuardado({ tecnico, creado }: TecnicoGuardado): void {
    this.cerrarModalTecnico();
    this.mostrarExito(`El técnico ${tecnico.nombre} ${tecnico.apellido} se ${creado ? 'creó' : 'guardó'} correctamente.`);
    this.cargarUsuarios(false);
  }

  cerrarModalCliente(): void {
    this.clienteEditando = null;
  }

  onClienteGuardado(cliente: ClienteResponse): void {
    this.cerrarModalCliente();
    this.mostrarExito(`Los datos de ${cliente.nombre} ${cliente.apellido} se guardaron correctamente.`);
    this.cargarUsuarios(false);
  }

  cerrarModalEditar(): void {
    this.usuarioEditando = null;
  }

  onUsuarioActualizado(): void {
    this.usuarioEditando = null;
    this.cargarUsuarios(false);
  }

  // ---- Activar / desactivar (PATCH /admin/usuarios/{usuarioId}/estado) ----

  desactivar(fila: FilaUsuario): void {
    this.cambiarEstado(fila, false);
  }

  solicitarActivacion(fila: FilaUsuario): void {
    this.filaParaCambiarEstado = fila;
  }

  cancelarCambioEstado(): void {
    this.filaParaCambiarEstado = null;
  }

  confirmarCambioEstado(): void {
    const fila = this.filaParaCambiarEstado;
    if (!fila) return;
    this.cargandoEstado = true;
    this.cambiarEstado(fila, !fila.activo);
  }

  private cambiarEstado(fila: FilaUsuario, activo: boolean): void {
    this.adminService.cambiarEstadoUsuario(fila.usuarioId, { activo }).subscribe({
      next: () => {
        this.terminarCambioEstado();
        this.cargarUsuarios(false);
      },
      error: () => {
        this.terminarCambioEstado();
        this.mensajeError = `No fue posible ${activo ? 'activar' : 'desactivar'} a ${fila.nombre}. Intenta de nuevo.`;
        this.cdr.markForCheck();
      },
    });
  }

  private terminarCambioEstado(): void {
    this.cargandoEstado = false;
    this.filaParaCambiarEstado = null;
  }

  // ---- Avisos ----

  cerrarAvisos(): void {
    this.mensajeExito = null;
    this.mensajeError = null;
    clearTimeout(this.temporizadorExito);
  }

  private mostrarExito(mensaje: string): void {
    this.mensajeExito = mensaje;
    clearTimeout(this.temporizadorExito);
    this.temporizadorExito = setTimeout(() => {
      this.mensajeExito = null;
      this.cdr.markForCheck();
    }, 8000);
  }
}
