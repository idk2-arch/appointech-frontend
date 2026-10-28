import { ChangeDetectorRef, SimpleChange } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminService, UsuarioAdmin } from '../../core/services/admin.service';
import { ClienteAdminService, ClienteResponse } from '../../core/services/cliente-admin.service';
import { EspecialidadService } from '../../core/services/especialidad.service';
import { FotoPerfilService } from '../../core/services/foto-perfil.service';
import { TecnicoAdminService } from '../../core/services/tecnico-admin.service';
import { TecnicoResponse, TecnicoService } from '../../core/services/tecnico.service';
import { AsignarEspecialidadesModalComponent } from './especialidades/asignar-especialidades-modal/asignar-especialidades-modal.component';
import { NuevaEspecialidadModalComponent } from './especialidades/nueva-especialidad-modal/nueva-especialidad-modal.component';
import { ClienteModalComponent } from './clientes/cliente-modal/cliente-modal.component';
import { TecnicoModalComponent } from './tecnicos/tecnico-modal/tecnico-modal.component';
import { CrearAdministradorModalComponent } from './usuarios/crear-administrador-modal/crear-administrador-modal.component';
import { FotoUsuarioModalComponent } from './usuarios/foto-usuario-modal/foto-usuario-modal.component';
import { FilaUsuario } from './usuarios/tabla-usuarios/tabla-usuarios.modelos';
import { UsuarioEditarModalComponent } from './usuarios/usuario-editar-modal/usuario-editar-modal.component';
import './admin.module';

const cdr = { markForCheck: vi.fn() } as unknown as ChangeDetectorRef;
const falloHttp = (status: number, error?: unknown): HttpErrorResponse => new HttpErrorResponse({ status, error });
const cambio = (clave: string, actual: unknown = true): Record<string, SimpleChange> => ({ [clave]: new SimpleChange(null, actual, false) });

const TECNICO = {
  id: 4,
  nombre: 'Luis',
  apellido: 'Gómez',
  correo: 'luis@correo.co',
  direccionBase: 'Calle 6',
  especialidades: [{ id: 1, nombre: 'Lavadoras', descripcion: '' }],
  usuarioId: 9,
  telefono: '300',
  tipoDocumento: 'CC',
  numeroDocumento: '1',
  activo: true,
  latitudBase: 4.3,
  longitudBase: -74.3,
  radioCoberturaKm: 10,
} as TecnicoResponse;

const CLIENTE = {
  id: 2,
  usuarioId: 8,
  nombre: 'Ana',
  apellido: 'Pérez',
  correo: 'ana@correo.co',
  telefono: null,
  tipoDocumento: 'CC',
  numeroDocumento: '1',
  activo: true,
  direccion: 'Carrera 7',
  latitud: 4.7,
  longitud: -74.1,
} as ClienteResponse;

describe('NuevaEspecialidadModalComponent', () => {
  let servicio: { crearEspecialidad: ReturnType<typeof vi.fn> };
  let modal: NuevaEspecialidadModalComponent;
  let creadas: number;

  beforeEach(() => {
    servicio = { crearEspecialidad: vi.fn().mockReturnValue(of({})) };
    modal = new NuevaEspecialidadModalComponent(new FormBuilder(), servicio as unknown as EspecialidadService, cdr);
    creadas = 0;
    modal.creada.subscribe(() => creadas++);
  });

  it('el nombre es obligatorio; la descripción es opcional', () => {
    expect(modal.nombre?.hasError('required')).toBe(true);
    modal.form.patchValue({ nombre: 'Estufas' });
    expect(modal.form.valid).toBe(true);
  });

  it('al abrirse reinicia el formulario y los errores', () => {
    modal.form.patchValue({ nombre: 'Viejo', descripcion: 'x' });
    modal.errorMensaje = 'viejo';
    modal.cargando = true;

    modal.abierto = true;
    modal.ngOnChanges(cambio('abierto'));

    expect(modal.form.value).toEqual({ nombre: '', descripcion: '' });
    expect(modal.errorMensaje).toBeNull();
    expect(modal.cargando).toBe(false);
  });

  it('otros cambios de entrada, o cerrarse, no reinician nada', () => {
    modal.form.patchValue({ nombre: 'Estufas' });
    modal.ngOnChanges(cambio('otra'));
    modal.abierto = false;
    modal.ngOnChanges(cambio('abierto', false));
    expect(modal.nombre?.value).toBe('Estufas');
  });

  it('inválido: marca los campos y no llama al backend', () => {
    modal.onSubmit();
    expect(servicio.crearEspecialidad).not.toHaveBeenCalled();
    expect(modal.nombre?.touched).toBe(true);
  });

  it('crea la especialidad y avisa', () => {
    modal.form.patchValue({ nombre: 'Estufas', descripcion: 'Gas y eléctricas' });
    modal.onSubmit();

    expect(servicio.crearEspecialidad).toHaveBeenCalledWith({ nombre: 'Estufas', descripcion: 'Gas y eléctricas' });
    expect(creadas).toBe(1);
    expect(modal.cargando).toBe(false);
  });

  it('si falla muestra un mensaje en español y deja reintentar', () => {
    servicio.crearEspecialidad.mockReturnValue(throwError(() => falloHttp(500)));
    modal.form.patchValue({ nombre: 'Estufas' });
    modal.onSubmit();

    expect(modal.errorMensaje).toBe('No fue posible crear la especialidad. Intenta de nuevo.');
    expect(creadas).toBe(0);
    expect(modal.cargando).toBe(false);
  });

  it('Escape y Cancelar cierran, salvo mientras se guarda', () => {
    const cierres: number[] = [];
    modal.cerrar.subscribe(() => cierres.push(1));

    modal.abierto = true;
    modal.onEscape();
    modal.onCancelar();
    expect(cierres).toHaveLength(2);

    modal.cargando = true;
    modal.onEscape();
    expect(cierres).toHaveLength(2);

    modal.abierto = false;
    modal.cargando = false;
    modal.onEscape();
    expect(cierres).toHaveLength(2);
  });
});

describe('UsuarioEditarModalComponent', () => {
  const ADMIN = { id: 5, nombre: 'Sara', apellido: 'Ruiz', correo: 'sara@correo.co', telefono: null } as UsuarioAdmin;
  let servicio: { actualizarUsuario: ReturnType<typeof vi.fn> };
  let modal: UsuarioEditarModalComponent;
  let actualizados: number;
  let cierres: number;

  beforeEach(() => {
    servicio = { actualizarUsuario: vi.fn().mockReturnValue(of({})) };
    modal = new UsuarioEditarModalComponent(new FormBuilder(), servicio as unknown as AdminService, cdr);
    actualizados = 0;
    cierres = 0;
    modal.actualizado.subscribe(() => actualizados++);
    modal.cerrar.subscribe(() => cierres++);
  });

  it('al recibir el usuario carga sus datos en el formulario', () => {
    modal.usuario = ADMIN;
    modal.ngOnChanges(cambio('usuario', ADMIN));
    expect(modal.form.value).toEqual({ nombre: 'Sara', apellido: 'Ruiz', telefono: '' });
  });

  it('sin usuario no carga nada', () => {
    modal.ngOnChanges(cambio('usuario', null));
    expect(modal.form.value).toEqual({ nombre: '', apellido: '', telefono: '' });
  });

  it('nombre y apellido son obligatorios', () => {
    expect(modal.nombre?.hasError('required')).toBe(true);
    expect(modal.apellido?.hasError('required')).toBe(true);
  });

  it('guarda los cambios del usuario correcto y avisa', () => {
    modal.usuario = ADMIN;
    modal.ngOnChanges(cambio('usuario', ADMIN));
    modal.form.patchValue({ nombre: 'Sara María' });

    modal.onSubmit();

    expect(servicio.actualizarUsuario).toHaveBeenCalledWith(5, { nombre: 'Sara María', apellido: 'Ruiz', telefono: '' });
    expect(actualizados).toBe(1);
  });

  it('sin usuario, o con el formulario inválido, no llama al backend', () => {
    modal.onSubmit();
    modal.usuario = ADMIN;
    modal.onSubmit();
    expect(servicio.actualizarUsuario).not.toHaveBeenCalled();
    expect(modal.nombre?.touched).toBe(true);
  });

  it('si falla muestra un mensaje en español', () => {
    servicio.actualizarUsuario.mockReturnValue(throwError(() => falloHttp(500)));
    modal.usuario = ADMIN;
    modal.form.patchValue({ nombre: 'Sara', apellido: 'Ruiz' });

    modal.onSubmit();

    expect(modal.errorMensaje).toBe('No fue posible guardar los cambios. Intenta de nuevo.');
    expect(modal.cargando).toBe(false);
    expect(actualizados).toBe(0);
  });

  it('Escape y Cancelar cierran, salvo si no hay usuario o se está guardando', () => {
    modal.onEscape();
    expect(cierres).toBe(0);

    modal.usuario = ADMIN;
    modal.onEscape();
    modal.onCancelar();
    expect(cierres).toBe(2);

    modal.cargando = true;
    modal.onEscape();
    expect(cierres).toBe(2);
  });
});

describe('FotoUsuarioModalComponent', () => {
  const FILA = { id: 2, usuarioId: 8, nombre: 'Ana Pérez', fotoUrl: '/api/fotos/vieja' } as FilaUsuario;
  let servicio: { subirDeUsuario: ReturnType<typeof vi.fn> };
  let modal: FotoUsuarioModalComponent;
  let actualizadas: number;
  let cierres: number;

  beforeEach(() => {
    servicio = { subirDeUsuario: vi.fn().mockReturnValue(of({ fotoUrl: '/api/fotos/nueva' })) };
    modal = TestBed.runInInjectionContext(() => new FotoUsuarioModalComponent(servicio as unknown as FotoPerfilService, cdr));
    actualizadas = 0;
    cierres = 0;
    modal.actualizada.subscribe(() => actualizadas++);
    modal.cerrar.subscribe(() => cierres++);
    modal.fila = FILA;
    modal.ngOnChanges(cambio('fila', FILA));
  });

  afterEach(() => modal.ngOnDestroy());

  it('al abrirse muestra la foto actual y limpia avisos', () => {
    expect(modal.fotoActual).toBe('/api/fotos/vieja');
    expect(modal.errorMensaje).toBeNull();
    expect(modal.mensajeExito).toBeNull();
  });

  it('guardar sube la foto al usuario de esa fila (no a quien tiene la sesión) y avisa', () => {
    modal.guardar('data:image/jpeg;base64,AAAA');

    expect(servicio.subirDeUsuario).toHaveBeenCalledWith(8, 'data:image/jpeg;base64,AAAA');
    expect(modal.fotoActual).toBe('/api/fotos/nueva');
    expect(modal.mensajeExito).toBe('La foto fue actualizada.');
    expect(actualizadas).toBe(1);
    expect(modal.enviando).toBe(false);
  });

  it('si el servidor la rechaza muestra su mensaje y conserva la foto', () => {
    servicio.subirDeUsuario.mockReturnValue(throwError(() => falloHttp(400, { status: 400, error: 'Imagen inválida' })));

    modal.guardar('x');

    expect(modal.errorMensaje).toBe('Imagen inválida');
    expect(modal.fotoActual).toBe('/api/fotos/vieja');
    expect(actualizadas).toBe(0);
  });

  it('sin fila no hace nada', () => {
    modal.fila = null;
    modal.guardar('x');
    expect(servicio.subirDeUsuario).not.toHaveBeenCalled();
  });

  it('mientras sube no se puede cerrar con Escape; después sí', () => {
    modal.enviando = true;
    modal.alPresionarEscape();
    expect(cierres).toBe(0);

    modal.enviando = false;
    modal.alPresionarEscape();
    expect(cierres).toBe(1);
  });

  it('Escape sin fila abierta no hace nada', () => {
    modal.fila = null;
    modal.alPresionarEscape();
    expect(cierres).toBe(0);
  });

  it('al destruirse cancela la subida en curso', () => {
    const pendiente = new Subject<{ fotoUrl: string }>();
    servicio.subirDeUsuario.mockReturnValue(pendiente);
    modal.guardar('x');
    expect(pendiente.observed).toBe(true);

    modal.ngOnDestroy();

    expect(pendiente.observed).toBe(false);
  });
});

describe('AsignarEspecialidadesModalComponent', () => {
  let servicio: { asignarEspecialidades: ReturnType<typeof vi.fn> };
  let modal: AsignarEspecialidadesModalComponent;
  let actualizados: number;
  let cierres: number;

  beforeEach(() => {
    servicio = { asignarEspecialidades: vi.fn().mockReturnValue(of({})) };
    modal = new AsignarEspecialidadesModalComponent(servicio as unknown as TecnicoService, cdr);
    actualizados = 0;
    cierres = 0;
    modal.actualizado.subscribe(() => actualizados++);
    modal.cerrar.subscribe(() => cierres++);
    modal.tecnico = TECNICO;
    modal.ngOnChanges(cambio('tecnico', TECNICO));
  });

  it('parte de las especialidades que el técnico ya tiene', () => {
    expect(modal.estaSeleccionada(1)).toBe(true);
    expect(modal.estaSeleccionada(2)).toBe(false);
  });

  it('sin técnico no cambia la selección', () => {
    modal.tecnico = null;
    modal.ngOnChanges(cambio('tecnico', null));
    expect(modal.estaSeleccionada(1)).toBe(true);
  });

  it('alternar marca y desmarca una especialidad', () => {
    modal.alternar(2);
    expect(modal.estaSeleccionada(2)).toBe(true);
    modal.alternar(2);
    expect(modal.estaSeleccionada(2)).toBe(false);
  });

  it('guarda los ids elegidos del técnico correcto y avisa', () => {
    modal.alternar(2);
    modal.onGuardar();

    expect(servicio.asignarEspecialidades).toHaveBeenCalledWith(4, { especialidadIds: [1, 2] });
    expect(actualizados).toBe(1);
    expect(modal.cargando).toBe(false);
  });

  it('se pueden dejar sin ninguna especialidad', () => {
    modal.alternar(1);
    modal.onGuardar();
    expect(servicio.asignarEspecialidades).toHaveBeenCalledWith(4, { especialidadIds: [] });
  });

  it('sin técnico no guarda', () => {
    modal.tecnico = null;
    modal.onGuardar();
    expect(servicio.asignarEspecialidades).not.toHaveBeenCalled();
  });

  it('si falla muestra un mensaje en español', () => {
    servicio.asignarEspecialidades.mockReturnValue(throwError(() => falloHttp(500)));
    modal.onGuardar();
    expect(modal.errorMensaje).toBe('No fue posible guardar las especialidades. Intenta de nuevo.');
    expect(actualizados).toBe(0);
  });

  it('Escape y Cancelar cierran, salvo mientras se guarda', () => {
    modal.onEscape();
    modal.onCancelar();
    expect(cierres).toBe(2);

    modal.cargando = true;
    modal.onEscape();
    expect(cierres).toBe(2);
  });
});

describe('ClienteModalComponent', () => {
  let servicio: { actualizar: ReturnType<typeof vi.fn> };
  let modal: ClienteModalComponent;
  let guardados: ClienteResponse[];

  beforeEach(() => {
    servicio = { actualizar: vi.fn().mockReturnValue(of(CLIENTE)) };
    modal = new ClienteModalComponent(new FormBuilder(), servicio as unknown as ClienteAdminService, cdr);
    guardados = [];
    modal.guardado.subscribe((c) => guardados.push(c));
    modal.cliente = CLIENTE;
    modal.abierto = true;
    modal.ngOnChanges(cambio('abierto'));
  });

  it('al abrirse carga los datos del cliente', () => {
    expect(modal.form.get('nombre')?.value).toBe('Ana');
    expect(modal.form.get('direccion')?.value).toBe('Carrera 7');
    expect(modal.form.get('latitud')?.value).toBe(4.7);
  });

  it('sin cliente o cerrado no hace nada al cambiar', () => {
    modal.form.patchValue({ nombre: 'Cambiado' });
    modal.abierto = false;
    modal.ngOnChanges(cambio('abierto', false));
    modal.ngOnChanges(cambio('otra'));
    expect(modal.form.get('nombre')?.value).toBe('Cambiado');
  });

  it('guarda los cambios del cliente correcto y avisa con la respuesta', () => {
    modal.form.patchValue({ nombre: 'Ana María' });
    modal.onSubmit();

    expect(servicio.actualizar).toHaveBeenCalledWith(2, expect.objectContaining({ nombre: 'Ana María', apellido: 'Pérez' }));
    expect(guardados).toEqual([CLIENTE]);
  });

  it('inválido: avisa y no llama al backend', () => {
    modal.form.patchValue({ nombre: '', correo: 'no-es-correo' });
    modal.onSubmit();

    expect(servicio.actualizar).not.toHaveBeenCalled();
    expect(modal.errorMensaje).toBe('Revisa los campos marcados en rojo para continuar.');
  });

  it('sin cliente no hace nada', () => {
    modal.cliente = null;
    modal.onSubmit();
    expect(servicio.actualizar).not.toHaveBeenCalled();
  });

  it('409: ya existe un usuario con ese correo o documento', () => {
    servicio.actualizar.mockReturnValue(throwError(() => falloHttp(409)));
    modal.onSubmit();
    expect(modal.errorMensaje).toBe('Ya existe un usuario con ese correo o documento.');
    expect(modal.cargando).toBe(false);
  });

  it('400: la ubicación no es válida', () => {
    servicio.actualizar.mockReturnValue(throwError(() => falloHttp(400)));
    modal.onSubmit();
    expect(modal.errorMensaje).toBe('La ubicación no es válida. Elige una dirección en Colombia.');
  });
});

describe('TecnicoModalComponent', () => {
  let tecnicos: { obtenerEspecialidades: ReturnType<typeof vi.fn> };
  let admin: { crear: ReturnType<typeof vi.fn>; actualizar: ReturnType<typeof vi.fn> };
  let modal: TecnicoModalComponent;
  let guardados: { tecnico: TecnicoResponse; creado: boolean }[];

  const abrir = (tecnico: TecnicoResponse | null): void => {
    modal.tecnico = tecnico;
    modal.abierto = true;
    modal.ngOnChanges(cambio('abierto'));
  };

  const llenarNuevo = (): void =>
    modal.form.patchValue({
      nombre: 'Luis',
      apellido: 'Gómez',
      correo: 'luis@correo.co',
      tipoDocumento: 'CC',
      contrasena: 'secreta123',
      direccionBase: 'Calle 6',
    });

  beforeEach(() => {
    tecnicos = { obtenerEspecialidades: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Lavadoras', descripcion: '' }])) };
    admin = { crear: vi.fn().mockReturnValue(of(TECNICO)), actualizar: vi.fn().mockReturnValue(of(TECNICO)) };
    modal = new TecnicoModalComponent(new FormBuilder(), tecnicos as unknown as TecnicoService, admin as unknown as TecnicoAdminService, cdr);
    guardados = [];
    modal.guardado.subscribe((g) => guardados.push(g));
  });

  afterEach(() => modal.ngOnDestroy());

  describe('al abrirse', () => {
    it('crear: formulario vacío y catálogo cargado', () => {
      abrir(null);

      expect(modal.esEdicion).toBe(false);
      expect(modal.form.get('nombre')?.value).toBe('');
      expect(modal.catalogo).toHaveLength(1);
      expect(modal.cargandoCatalogo).toBe(false);
      expect(modal.controlEspecialidades.value).toEqual([]);
    });

    it('editar: carga los datos del técnico y sus especialidades', () => {
      abrir(TECNICO);

      expect(modal.esEdicion).toBe(true);
      expect(modal.form.get('nombre')?.value).toBe('Luis');
      expect(modal.controlEspecialidades.value).toEqual([1]);
      expect(modal.form.contains('contrasena')).toBe(false);
    });

    it('cerrado o con otros cambios, no hace nada', () => {
      modal.ngOnChanges(cambio('otra'));
      modal.abierto = false;
      modal.ngOnChanges(cambio('abierto', false));
      expect(tecnicos.obtenerEspecialidades).not.toHaveBeenCalled();
    });

    it('si falla el catálogo muestra el motivo y se puede reintentar', () => {
      tecnicos.obtenerEspecialidades.mockReturnValue(throwError(() => falloHttp(500, { status: 500, error: 'Catálogo no disponible' })));
      abrir(null);
      expect(modal.errorCatalogo).toBe('Catálogo no disponible');

      tecnicos.obtenerEspecialidades.mockReturnValue(of([]));
      modal.cargarCatalogo();
      expect(modal.errorCatalogo).toBeNull();
    });

    it('un catálogo que no es lista queda vacío', () => {
      tecnicos.obtenerEspecialidades.mockReturnValue(of(null));
      abrir(null);
      expect(modal.catalogo).toEqual([]);
    });

    it('recargar el catálogo cancela la carga anterior', () => {
      const lenta = new Subject<unknown[]>();
      tecnicos.obtenerEspecialidades.mockReturnValue(lenta);
      abrir(null);
      expect(lenta.observed).toBe(true);

      tecnicos.obtenerEspecialidades.mockReturnValue(of([]));
      modal.cargarCatalogo();
      expect(lenta.observed).toBe(false);
    });
  });

  describe('guardar', () => {
    it('inválido: avisa y no llama al backend', () => {
      abrir(null);
      modal.onSubmit();

      expect(admin.crear).not.toHaveBeenCalled();
      expect(modal.errorMensaje).toBe('Revisa los campos marcados en rojo para continuar.');
    });

    it('crear: llama a crear y avisa que fue creado', () => {
      abrir(null);
      llenarNuevo();

      modal.onSubmit();

      expect(admin.crear).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Luis', direccionBase: 'Calle 6', contrasena: 'secreta123' }));
      expect(guardados).toEqual([{ tecnico: TECNICO, creado: true }]);
      expect(modal.cargando).toBe(false);
    });

    it('editar: llama a actualizar con el id y avisa que no es nuevo', () => {
      abrir(TECNICO);
      modal.onSubmit();

      expect(admin.actualizar).toHaveBeenCalledWith(4, expect.objectContaining({ nombre: 'Luis' }));
      expect(admin.crear).not.toHaveBeenCalled();
      expect(guardados).toEqual([{ tecnico: TECNICO, creado: false }]);
    });

    it('409 al crear: ya existe un usuario con ese correo o documento', () => {
      admin.crear.mockReturnValue(throwError(() => falloHttp(409)));
      abrir(null);
      llenarNuevo();
      modal.onSubmit();
      expect(modal.errorMensaje).toBe('Ya existe un usuario con ese correo o documento.');
    });

    it('400 al crear: revisa la ubicación y las especialidades', () => {
      admin.crear.mockReturnValue(throwError(() => falloHttp(400)));
      abrir(null);
      llenarNuevo();
      modal.onSubmit();
      expect(modal.errorMensaje).toBe('Algún dato no es válido. Revisa la ubicación y las especialidades.');
    });

    it('un error al editar habla de "guardar los cambios"', () => {
      admin.actualizar.mockReturnValue(throwError(() => falloHttp(500)));
      abrir(TECNICO);
      modal.onSubmit();
      expect(modal.errorMensaje).toBe('No fue posible guardar los cambios. Intenta de nuevo.');
    });

    it('un error al crear habla de "crear el técnico"', () => {
      admin.crear.mockReturnValue(throwError(() => falloHttp(500)));
      abrir(null);
      llenarNuevo();
      modal.onSubmit();
      expect(modal.errorMensaje).toBe('No fue posible crear el técnico. Intenta de nuevo.');
    });
  });

  it('Cancelar cierra', () => {
    let cierres = 0;
    modal.cerrar.subscribe(() => cierres++);
    modal.onCancelar();
    expect(cierres).toBe(1);
  });
});

describe('CrearAdministradorModalComponent', () => {
  let servicio: { crearAdministrador: ReturnType<typeof vi.fn> };
  let modal: CrearAdministradorModalComponent;
  let creados: number;
  let cierres: number;

  const llenar = (): void =>
    modal.form.patchValue({ nombre: 'Sara', apellido: 'Ruiz', correo: 'sara@correo.co', contrasena: 'secreta123', tipoDocumento: 'CC' });

  beforeEach(() => {
    servicio = { crearAdministrador: vi.fn().mockReturnValue(of({})) };
    modal = new CrearAdministradorModalComponent(new FormBuilder(), servicio as unknown as AdminService, cdr);
    creados = 0;
    cierres = 0;
    modal.creado.subscribe(() => creados++);
    modal.cerrar.subscribe(() => cierres++);
  });

  it('exige nombre, apellido, correo válido, contraseña de 8 caracteres y tipo de documento', () => {
    expect(modal.form.valid).toBe(false);
    modal.form.patchValue({ nombre: 'Sara', apellido: 'Ruiz', correo: 'mal', contrasena: 'corta' });
    expect(modal.correo?.hasError('email')).toBe(true);
    expect(modal.contrasena?.hasError('minlength')).toBe(true);
    expect(modal.tipoDocumento?.hasError('required')).toBe(true);
    expect(modal.nombre?.valid).toBe(true);
    expect(modal.apellido?.valid).toBe(true);

    llenar();
    expect(modal.form.valid).toBe(true);
  });

  it('al abrirse reinicia todo, incluida la visibilidad de la contraseña', () => {
    llenar();
    modal.mostrarContrasena = true;
    modal.errorMensaje = 'viejo';

    modal.abierto = true;
    modal.ngOnChanges(cambio('abierto'));

    expect(modal.nombre?.value).toBe('');
    expect(modal.mostrarContrasena).toBe(false);
    expect(modal.errorMensaje).toBeNull();
  });

  it('otros cambios de entrada no reinician nada', () => {
    llenar();
    modal.ngOnChanges(cambio('otra'));
    expect(modal.nombre?.value).toBe('Sara');
  });

  it('alterna la visibilidad de la contraseña', () => {
    modal.alternarContrasena();
    expect(modal.mostrarContrasena).toBe(true);
    modal.alternarContrasena();
    expect(modal.mostrarContrasena).toBe(false);
  });

  it('inválido: marca los campos y no llama al backend', () => {
    modal.onSubmit();
    expect(servicio.crearAdministrador).not.toHaveBeenCalled();
    expect(modal.nombre?.touched).toBe(true);
  });

  it('crea el administrador con los datos del formulario y avisa', () => {
    llenar();
    modal.onSubmit();

    expect(servicio.crearAdministrador).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Sara', correo: 'sara@correo.co', tipoDocumento: 'CC' }));
    expect(creados).toBe(1);
    expect(modal.cargando).toBe(false);
  });

  it('409: ya existe un usuario con ese correo', () => {
    servicio.crearAdministrador.mockReturnValue(throwError(() => falloHttp(409)));
    llenar();
    modal.onSubmit();
    expect(modal.errorMensaje).toBe('Ya existe un usuario registrado con ese correo.');
    expect(creados).toBe(0);
  });

  it('cualquier otro error: mensaje genérico', () => {
    servicio.crearAdministrador.mockReturnValue(throwError(() => falloHttp(500)));
    llenar();
    modal.onSubmit();
    expect(modal.errorMensaje).toBe('No fue posible crear el administrador. Intenta de nuevo.');
  });

  it('Escape y Cancelar cierran, salvo cerrado o guardando', () => {
    modal.onEscape();
    expect(cierres).toBe(0);

    modal.abierto = true;
    modal.onEscape();
    modal.onCancelar();
    expect(cierres).toBe(2);

    modal.cargando = true;
    modal.onEscape();
    expect(cierres).toBe(2);
  });
});
