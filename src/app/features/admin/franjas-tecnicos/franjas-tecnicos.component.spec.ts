import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminModule } from '../admin.module';
import { FranjasTecnicosComponent } from './franjas-tecnicos.component';
import {
  FranjasTecnicoService,
  FranjaTecnico,
} from '../../../core/services/franjas-tecnico.service';
import { TecnicoResponse, TecnicoService } from '../../../core/services/tecnico.service';
import { ReglasFranjasService } from '../../../core/services/reglas-franjas.service';
import { ToastService } from '../../../shared/toast/toast.service';

const tecnico = {
  id: 1,
  nombre: 'Freddy',
  apellido: 'Pérez',
  radioCoberturaKm: 10,
  especialidades: [{ id: 1, nombre: 'Lavadoras' }],
  fotoUrl: '/api/fotos/abc',
} as TecnicoResponse;
const franja: FranjaTecnico = {
  id: 5,
  tecnicoId: 1,
  fecha: '2026-11-10',
  horaInicio: '08:00:00',
  horaFin: '12:00:00',
  bloques: 2,
  bloquesOcupados: 0,
  creadaEn: '',
};
const fallo = (status: number, detail: string) =>
  throwError(() => new HttpErrorResponse({ status, error: { detail } }));
describe('FranjasTecnicosComponent', () => {
  let fixture: ComponentFixture<FranjasTecnicosComponent>;
  let c: FranjasTecnicosComponent;
  const servicio = {
    listar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    borrar: vi.fn(),
    guardarRadio: vi.fn(),
  };
  const tecnicos = { obtenerTecnicos: vi.fn() };
  const reglas = { obtener: vi.fn() };
  const refrescar = () => {
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };
  const raiz = (): HTMLElement => fixture.nativeElement;
  beforeEach(async () => {
    vi.useFakeTimers({ now: new Date(2026, 10, 9, 12), toFake: ['Date'] });
    vi.resetAllMocks();
    TestBed.resetTestingModule();
    servicio.listar.mockReturnValue(of([franja]));
    servicio.crear.mockReturnValue(of(franja));
    servicio.actualizar.mockReturnValue(of(franja));
    servicio.borrar.mockReturnValue(of(null));
    servicio.guardarRadio.mockReturnValue(of({ tecnicoId: 1, radioMaximoKm: 25 }));
    tecnicos.obtenerTecnicos.mockReturnValue(of([{ ...tecnico }]));
    reglas.obtener.mockReturnValue(of({ duracionBloqueMinutos: 90 }));
    await TestBed.configureTestingModule({
      imports: [AdminModule, RouterModule.forRoot([])],
      providers: [
        { provide: FranjasTecnicoService, useValue: servicio },
        { provide: TecnicoService, useValue: tecnicos },
        { provide: ReglasFranjasService, useValue: reglas },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FranjasTecnicosComponent);
    c = fixture.componentInstance;
    refrescar();
  });
  afterEach(() => vi.useRealTimers());
  function elegir(): void {
    c.seleccionar(c.tecnicos[0]);
    c.irPaso(2);
    c.elegirDia('2026-11-10');
    refrescar();
  }
  function abrir(): void {
    elegir();
    c.abrir('2026-11-10');
    refrescar();
  }
  it('filtra por nombre y especialidad, muestra foto y selecciona el técnico con su radio', () => {
    c.busqueda = 'lavadoras';
    expect(c.filtrados).toHaveLength(1);
    c.busqueda = 'freddy';
    expect(c.filtrados).toHaveLength(1);
    expect(raiz().querySelector('img')?.getAttribute('src')).toBe('http://localhost:8080/api/fotos/abc');
    elegir();
    expect(c.radio).toBe(10);
    expect(servicio.listar).toHaveBeenCalledWith(1, '2026-11-01', '2026-11-30');
    c.irPaso(1);
    c.busqueda = 'otro';
    refrescar();
    expect(raiz().textContent).toContain('No se encontraron');
  });
  it.each(['lista', 'tarjeta', 'agenda'])('resuelve la foto en %s y reemplaza errores por iniciales sin reintentos', async (vista) => {
    if (vista !== 'lista') elegir();
    if (vista === 'agenda') c.abrirAgenda();
    await detectar();
    const fotos = raiz().querySelectorAll<HTMLImageElement>('.avatar img');
    expect(fotos.length).toBeGreaterThan(0);
    fotos.forEach((foto) => {
      expect(foto.getAttribute('src')).toBe('http://localhost:8080/api/fotos/abc');
      foto.dispatchEvent(new Event('load'));
    });
    await detectar();
    expect(raiz().querySelectorAll('.avatar img')).toHaveLength(fotos.length);
    fotos[0].dispatchEvent(new Event('error'));
    await detectar();
    expect(raiz().querySelector('.avatar img')).toBeNull();
    raiz().querySelectorAll('.avatar').forEach((avatar) => {
      expect(avatar.textContent?.trim()).toBe('FP');
    });
    await detectar();
    expect(raiz().querySelector('.avatar img')).toBeNull();
  });
  it.each([null, undefined, ''])('sin foto (%s) muestra iniciales en lista, tarjeta y agenda', async (fotoUrl) => {
    c.tecnicos = [{ ...tecnico, fotoUrl }];
    for (const vista of ['lista', 'tarjeta', 'agenda']) {
      if (vista === 'tarjeta') elegir();
      if (vista === 'agenda') c.abrirAgenda();
      await detectar();
      const avatares = raiz().querySelectorAll('.avatar');
      expect(avatares.length).toBeGreaterThan(0);
      expect(raiz().querySelector('.avatar img')).toBeNull();
      avatares.forEach((avatar) => expect(avatar.textContent?.trim()).toBe('FP'));
    }
  });
  it('conserva URLs absolutas y permite cargar una foto nueva después de un fallo', async () => {
    raiz().querySelector('img')!.dispatchEvent(new Event('error'));
    await detectar();
    c.tecnicos = [{ ...tecnico, fotoUrl: 'https://cdn.ejemplo.com/tecnico.jpg' }];
    await detectar();
    expect(raiz().querySelector('img')?.getAttribute('src')).toBe('https://cdn.ejemplo.com/tecnico.jpg');
  });
  it('navega por meses y representa la ocupación del día elegido', () => {
    elegir();
    expect(raiz().textContent).toContain('0/2 citas ocupadas');
    c.navegar(1);
    expect(servicio.listar).toHaveBeenLastCalledWith(1, '2026-12-01', '2026-12-31');
  });
  it('crea varias franjas del mismo día con el formulario y calcula citas', () => {
    abrir();
    expect(c.citas).toBe(2);
    c.guardar();
    expect(c.guardado).toBe(true);
    expect(servicio.crear).toHaveBeenCalledWith(1, {
      fecha: '2026-11-10',
      horaInicio: '08:00',
      horaFin: '12:00',
    });
    c.abrir('2026-11-10');
    c.horaInicio = '14:00';
    c.horaFin = '18:00';
    c.guardar();
    expect(servicio.crear).toHaveBeenCalledTimes(2);
  });
  it.each([
    [409, 'Choca con franja 08:00–12:00'],
    [409, 'Choca con No disponibilidad 2026-11-10 09:00–10:00'],
    [400, 'La fecha es inválida'],
  ])('muestra %i sin cerrar ni perder horas: %s', (status, mensaje) => {
    abrir();
    servicio.crear.mockReturnValue(fallo(status, mensaje));
    c.guardar();
    refrescar();
    expect(c.paso).toBe(3);
    expect(c.guardado).toBe(false);
    expect(c.horaInicio).toBe('08:00');
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain(mensaje);
  });
  it('edita y conserva el formulario si el backend rechaza un acortamiento con citas', () => {
    elegir();
    c.abrir(franja.fecha, franja);
    c.horaFin = '11:00';
    c.guardar();
    expect(servicio.actualizar).toHaveBeenCalledWith(1, 5, {
      fecha: franja.fecha,
      horaInicio: '08:00',
      horaFin: '11:00',
    });
    c.abrir(franja.fecha, franja);
    servicio.actualizar.mockReturnValue(fallo(409, 'Tiene 2 citas'));
    c.guardar();
    expect(c.paso).toBe(3);
    expect(c.guardado).toBe(false);
    expect(c.errorFormulario).toContain('Tiene 2 citas');
  });
  it('borra tras confirmar y maneja 409 sin cerrar', () => {
    elegir();
    c.pedirBorrado(franja);
    c.borrar();
    expect(c.eliminando).toBeNull();
    expect(servicio.borrar).toHaveBeenCalledWith(1, 5);
    c.pedirBorrado(franja);
    servicio.borrar.mockReturnValue(fallo(409, 'Tiene 1 cita'));
    c.borrar();
    refrescar();
    expect(c.eliminando).toBe(franja);
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Tiene 1 cita');
  });
  it('deshabilita borrar con citas y explica por qué', () => {
    servicio.listar.mockReturnValue(of([{ ...franja, bloquesOcupados: 1 }]));
    elegir();
    const borrar = Array.from(raiz().querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Borrar',
    )!;
    expect(borrar.disabled).toBe(true);
    expect(borrar.title).toContain('tiene citas');
  });
  it('copia a varias fechas, evita duplicadas y permite quitar fechas', () => {
    abrir();
    c.fechaCopia = '2026-11-11';
    c.agregarCopia();
    c.fechaCopia = '2026-11-11';
    c.agregarCopia();
    expect(c.copias).toEqual(['2026-11-11']);
    c.fechaCopia = '2026-11-12';
    c.agregarCopia();
    c.quitarCopia('2026-11-12');
    c.guardar();
    expect(servicio.crear).toHaveBeenCalledTimes(2);
    expect(c.guardado).toBe(true);
  });
  it('reporta éxitos y fallos parciales y reintenta solo fallidas', () => {
    abrir();
    c.copias = ['2026-11-11', '2026-11-12'];
    servicio.crear
      .mockReturnValueOnce(of(franja))
      .mockReturnValueOnce(fallo(409, 'No disponibilidad'))
      .mockReturnValueOnce(of(franja));
    c.guardar();
    refrescar();
    expect(c.resultados.map((r) => r.error)).toEqual([null, 'No disponibilidad', null]);
    expect(c.fecha).toBe('2026-11-11');
    expect(c.copias).toEqual([]);
    expect(raiz().textContent).toContain('Creada correctamente');
    c.guardar();
    expect(servicio.crear).toHaveBeenCalledTimes(4);
  });
  it('valida fechas y horas sin enviar y reporta copias pasadas sin abortar las válidas', () => {
    abrir();
    c.horaInicio = '12:00';
    expect(c.validar(c.fecha)).toContain('anterior');
    c.guardar();
    expect(servicio.crear).not.toHaveBeenCalled();
    c.horaInicio = '';
    expect(c.citas).toBe(0);
    expect(c.validar(c.fecha)).toContain('Completa');
    c.horaInicio = '11:30';
    expect(c.validar(c.fecha)).toContain('al menos');
    c.horaInicio = '08:00';
    expect(c.validar('2000-01-01')).toContain('pasada');
    expect(c.validar('2026-02-30')).toContain('válida');
    c.horaInicio = '00:00';
    expect(c.validar(c.hoy)).toContain('ya pasó');
    c.horaInicio = '08:00';
    c.copias = ['2000-01-01'];
    c.guardar();
    expect(servicio.crear).toHaveBeenCalledOnce();
    expect(c.resultados[1].error).toContain('pasada');
  });
  it('guarda radio, valida el rango y muestra el detalle de error', () => {
    elegir();
    c.radio = 25;
    c.guardarRadio();
    expect(servicio.guardarRadio).toHaveBeenCalledWith(1, 25);
    expect(c.tecnico?.radioCoberturaKm).toBe(25);
    c.radio = 101;
    c.guardarRadio();
    expect(c.errorRadio).toContain('entre 1 y 100');
    c.radio = 10;
    c.editarRadio = true;
    servicio.guardarRadio.mockReturnValue(fallo(400, 'Radio inválido'));
    c.guardarRadio();
    refrescar();
    expect(raiz().textContent).toContain('Radio inválido');
  });
  it('cancela consultas al cambiar técnico, no duplica guardados y limpia en destroy', () => {
    const consulta = new Subject<FranjaTecnico[]>();
    servicio.listar.mockReturnValue(consulta);
    elegir();
    expect(c.cargando).toBe(true);
    const crear = new Subject<FranjaTecnico>();
    servicio.crear.mockReturnValue(crear);
    c.abrir('2026-11-10');
    c.guardar();
    c.guardar();
    expect(servicio.crear).toHaveBeenCalledOnce();
    fixture.destroy();
    expect(consulta.observed).toBe(false);
    expect(crear.observed).toBe(false);
  });
  it('muestra errores de carga y evita cálculos cuando falta duración', () => {
    servicio.listar.mockReturnValue(fallo(500, 'Error de consulta'));
    elegir();
    expect(raiz().textContent).toContain('Error de consulta');
    c.duracion = null;
    expect(c.citas).toBe(0);
    expect(c.validar('2026-11-10')).toContain('al menos');
    expect(TestBed.inject(ToastService).visibles()).toHaveLength(0);
  });
  const boton = (texto: string): HTMLButtonElement =>
    Array.from(raiz().querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === texto,
    )!;
  const detectar = async (): Promise<void> => {
    refrescar();
    await fixture.whenStable();
    refrescar();
  };

  it('empieza por Técnico, muestra guía y buscador, y no permite avanzar sin técnico', async () => {
    expect(c.paso).toBe(1);
    expect(raiz().querySelector('app-stepper')).not.toBeNull();
    expect(raiz().textContent).toContain('Elige un técnico para ver o crear sus franjas');
    expect(raiz().querySelector('input[type="search"]')?.getAttribute('placeholder')).toBe(
      'Buscar técnico o especialidad',
    );
    expect(boton('Siguiente').disabled).toBe(true);
    c.irPaso(2);
    c.irPaso(3);
    expect(c.paso).toBe(1);
    expect(raiz().querySelector('.calendario')).toBeNull();
    expect(raiz().querySelector('#radio-tecnico')).toBeNull();
    c.seleccionar(c.tecnicos[0]);
    await detectar();
    expect(c.paso).toBe(1);
    boton('Siguiente').click();
    await detectar();
    expect(c.paso).toBe(2);
    expect(boton('Nueva franja').disabled).toBe(true);
    expect(boton('Siguiente')).toBeUndefined();
    c.nuevaFranja();
    expect(c.fecha).toBe('');
    c.irPaso(3);
    expect(c.paso).toBe(2);
  });
  it.each([{ franjas: [] }, { franjas: [franja] }])('Fecha ofrece un único avance inferior, con y sin franjas: %j', async ({ franjas }) => {
    servicio.listar.mockReturnValue(of(franjas));
    c.seleccionar(c.tecnicos[0]);
    c.irPaso(2);
    await detectar();
    const avances = () => Array.from(raiz().querySelectorAll<HTMLButtonElement>('button'))
      .filter((b) => b.textContent?.trim() === 'Nueva franja');
    expect(avances()).toHaveLength(1);
    expect(avances()[0].closest('.pie-paso')).not.toBeNull();
    expect(avances()[0].disabled).toBe(true);
    expect(boton('Atrás')).toBeDefined();
    expect(boton('Siguiente')).toBeUndefined();
    raiz().querySelector<HTMLButtonElement>('[data-fecha="2026-11-10"]')!.click();
    await detectar();
    expect(avances()).toHaveLength(1);
    expect(avances()[0].disabled).toBe(false);
    if (franjas.length) {
      expect(boton('Editar')).toBeDefined();
      expect(boton('Borrar')).toBeDefined();
    } else {
      expect(raiz().querySelector('#dia-elegido')?.parentElement?.parentElement?.textContent)
        .toContain('Este día aún no tiene franjas');
    }
    avances()[0].click();
    await detectar();
    expect(c.paso).toBe(3);
    expect(c.fecha).toBe('2026-11-10');
  });
  it('el título del día capitaliza solo la primera letra del día de la semana', async () => {
    elegir();
    c.elegirDia('2026-11-12');
    await detectar();
    const titulo = raiz().querySelector('#dia-elegido')!;
    expect(titulo.textContent?.trim()).toBe('Jueves, 12 de noviembre de 2026');
    expect(titulo.classList.contains('capitalize')).toBe(false);
  });
  it('avanza con día válido, permite volver desde indicadores y mantiene el técnico', async () => {
    elegir();
    await detectar();
    boton('Nueva franja').click();
    await detectar();
    expect(c.paso).toBe(3);
    expect(boton('Crear franja')).toBeDefined();
    expect(boton('Siguiente')).toBeUndefined();
    raiz().querySelector<HTMLButtonElement>('[aria-label="Paso 2: Fecha"]')!.click();
    await detectar();
    expect(c.paso).toBe(2);
    raiz().querySelector<HTMLButtonElement>('[aria-label="Paso 1: Técnico"]')!.click();
    await detectar();
    expect(c.paso).toBe(1);
    expect(c.tecnico?.id).toBe(1);
  });
  it('Cambiar vuelve a Técnico y elegir otro reinicia fecha, mes, copias y edición', async () => {
    abrir();
    c.horaInicio = '09:00';
    c.copias = ['2026-11-12'];
    c.editando = franja;
    await detectar();
    boton('Cambiar').click();
    await detectar();
    expect(c.paso).toBe(1);
    expect(c.tecnico?.id).toBe(1);
    c.seleccionar({ ...tecnico, id: 2, nombre: 'Ana' });
    await detectar();
    expect(c.fecha).toBe('');
    expect(c.editando).toBeNull();
    expect(c.copias).toEqual([]);
    expect(c.horaInicio).toBe('08:00');
    expect(c.desde).toBe('2026-11-01');
    expect(c.paso).toBe(1);
    c.irPaso(3);
    expect(c.paso).toBe(1);
  });
  it('calendario mensual indica franjas, resalta hoy y deshabilita días pasados', async () => {
    elegir();
    await detectar();
    const hoy = raiz().querySelector<HTMLButtonElement>('[data-fecha="2026-11-09"]')!;
    expect(hoy.getAttribute('aria-current')).toBe('date');
    expect(hoy.classList.contains('hoy')).toBe(true);
    expect(raiz().querySelector<HTMLButtonElement>('[data-fecha="2026-11-08"]')!.disabled).toBe(
      true,
    );
    const dia = raiz().querySelector<HTMLButtonElement>('[data-fecha="2026-11-10"]')!;
    expect(dia.querySelector('.punto')).not.toBeNull();
    expect(dia.getAttribute('aria-label')).toContain('1 franjas');
    expect(raiz().querySelectorAll('.calendario-dia')).toHaveLength(30);
    c.elegirDia('2026-11-08');
    expect(c.fecha).toBe('2026-11-10');
    c.elegirDia('incorrecta');
    expect(c.fecha).toBe('2026-11-10');
  });
  it('seleccionar un día lista solo sus franjas y Nueva franja fija la fecha', async () => {
    elegir();
    await detectar();
    expect(raiz().querySelectorAll('.bloque-franja')).toHaveLength(1);
    raiz().querySelector<HTMLButtonElement>('[data-fecha="2026-11-11"]')!.click();
    await detectar();
    expect(c.fecha).toBe('2026-11-11');
    expect(raiz().querySelectorAll('.bloque-franja')).toHaveLength(0);
    expect(raiz().textContent).toContain('Este día aún no tiene franjas');
    boton('Nueva franja').click();
    await detectar();
    expect(c.paso).toBe(3);
    expect(raiz().querySelector<HTMLInputElement>('#franja-fecha')!.value).toBe('2026-11-11');
  });
  it('calendario responde a flechas y Enter, incluso al cambiar de mes', async () => {
    elegir();
    await detectar();
    const dia = raiz().querySelector<HTMLButtonElement>('[data-fecha="2026-11-10"]')!;
    dia.focus();
    dia.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );
    await detectar();
    expect(c.fechaFoco).toBe('2026-11-11');
    expect(document.activeElement?.getAttribute('data-fecha')).toBe('2026-11-11');
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    await detectar();
    expect(c.fecha).toBe('2026-11-11');
    c.moverDia(new KeyboardEvent('keydown', { key: 'ArrowLeft' }), '2026-12-01');
    await detectar();
    expect(c.desde).toBe('2026-11-01');
    c.moverDia(new KeyboardEvent('keydown', { key: 'ArrowRight' }), '2026-11-30');
    await detectar();
    expect(c.desde).toBe('2026-12-01');
    expect(c.fechaFoco).toBe('2026-12-01');
    c.moverDia(new KeyboardEvent('keydown', { key: 'ArrowUp' }), '2026-11-09');
    expect(c.fechaFoco).toBe(c.hoy);
  });
  it('crear muestra éxito y Agregar otra conserva técnico y mes; Terminar vuelve al primero sin perderlo', async () => {
    abrir();
    const t = c.tecnico;
    c.desde = '2026-12-01';
    c.fecha = '2026-12-10';
    c.guardar();
    await detectar();
    expect(c.guardado).toBe(true);
    expect(raiz().textContent).toContain('Franjas creadas');
    boton('Agregar otra franja').click();
    await detectar();
    expect(c.paso).toBe(2);
    expect(c.tecnico).toBe(t);
    expect(c.desde).toBe('2026-12-01');
    expect(c.fecha).toBe('');
    c.abrir('2026-12-11');
    c.guardar();
    await detectar();
    boton('Terminar').click();
    await detectar();
    expect(c.paso).toBe(1);
    expect(c.tecnico).toBe(t);
  });
  it('un mes vacío ofrece crear la primera franja y los meses pasados no dejan crear', async () => {
    servicio.listar.mockReturnValue(of([]));
    c.seleccionar(c.tecnicos[0]);
    c.irPaso(2);
    await detectar();
    expect(raiz().textContent).toContain('aún no tiene franjas');
    expect(boton('Nueva franja').disabled).toBe(true);
    raiz().querySelector<HTMLButtonElement>('[data-fecha="2026-11-09"]')!.click();
    await detectar();
    boton('Nueva franja').click();
    await detectar();
    expect(c.paso).toBe(3);
    expect(c.fecha).toBe('2026-11-09');
    c.irPaso(2);
    c.navegar(-1);
    await detectar();
    expect(boton('Nueva franja').disabled).toBe(true);
  });
  it('abre agenda semanal, consulta siete días y alterna al mes con su rango exacto', async () => {
    elegir();
    await detectar();
    boton('Ver agenda completa').click();
    await detectar();
    expect(c.verAgenda).toBe(true);
    expect(raiz().querySelector('app-stepper')).toBeNull();
    expect(servicio.listar).toHaveBeenLastCalledWith(1, '2026-11-09', '2026-11-15');
    expect(raiz().querySelectorAll('.dia-agenda')).toHaveLength(7);
    const vista = raiz().querySelector<HTMLSelectElement>('#vista-agenda')!;
    vista.value = 'mes';
    vista.dispatchEvent(new Event('change'));
    await detectar();
    expect(servicio.listar).toHaveBeenLastCalledWith(1, '2026-11-01', '2026-11-30');
    expect(raiz().querySelectorAll('.dia-agenda')).toHaveLength(30);
    c.navegarAgenda(1);
    expect(servicio.listar).toHaveBeenLastCalledWith(1, '2026-12-01', '2026-12-31');
    c.cambiarVistaAgenda('semana');
    c.navegarAgenda(1);
    expect(c.diasAgenda).toHaveLength(7);
    boton('Volver al asistente').click();
    await detectar();
    expect(c.verAgenda).toBe(false);
    expect(c.paso).toBe(2);
    expect(c.desde).toBe('2026-11-01');
  });
  it('Editar desde agenda lleva al paso 3 con la franja cargada y Borrar refresca ambas vistas', async () => {
    elegir();
    c.abrirAgenda();
    await detectar();
    boton('Editar').click();
    await detectar();
    expect(c.verAgenda).toBe(false);
    expect(c.paso).toBe(3);
    expect(c.editando).toBe(franja);
    expect(boton('Guardar cambios')).toBeDefined();
    c.abrirAgenda();
    await detectar();
    boton('Borrar').click();
    await detectar();
    expect(c.eliminando).toBe(franja);
    c.borrar();
    await detectar();
    expect(c.eliminando).toBeNull();
    expect(servicio.listar).toHaveBeenLastCalledWith(1, '2026-11-09', '2026-11-15');
  });
  it('agenda tiene estados de carga, error con reintento y vacío', async () => {
    elegir();
    const pendiente = new Subject<FranjaTecnico[]>();
    servicio.listar.mockReturnValue(pendiente);
    c.abrirAgenda();
    await detectar();
    expect(raiz().textContent).toContain('Cargando agenda');
    pendiente.error(
      new HttpErrorResponse({ status: 500, error: { detail: 'Agenda no disponible' } }),
    );
    await detectar();
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Agenda no disponible');
    servicio.listar.mockReturnValue(of([]));
    boton('Reintentar').click();
    await detectar();
    expect(raiz().textContent).toContain('No hay franjas en este período');
    expect(raiz().textContent).toContain('Este día aún no tiene franjas');
  });
  it('el resumen persiste y la edición de radio ocupa un panel pequeño que se puede cerrar', async () => {
    elegir();
    await detectar();
    expect(raiz().querySelector('#radio-tecnico')).toBeNull();
    boton('Editar radio').click();
    await detectar();
    const radio = raiz().querySelector<HTMLInputElement>('#radio-tecnico')!;
    radio.value = '25';
    radio.dispatchEvent(new Event('input'));
    await detectar();
    boton('Guardar radio').click();
    await detectar();
    expect(servicio.guardarRadio).toHaveBeenCalledWith(1, 25);
    expect(raiz().querySelector('[aria-label="Técnico elegido"]')?.textContent).toContain('25 km');
    boton('Editar radio').click();
    await detectar();
    expect(raiz().querySelector('#radio-tecnico')).toBeNull();
  });
  it('las iniciales reemplazan la foto y las consultas de agenda se cancelan al destruir', async () => {
    c.tecnicos = [{ ...tecnico, fotoUrl: null }];
    await detectar();
    expect(raiz().querySelector('.avatar')?.textContent).toContain('FP');
    elegir();
    const pendiente = new Subject<FranjaTecnico[]>();
    servicio.listar.mockReturnValue(pendiente);
    c.abrirAgenda();
    expect(pendiente.observed).toBe(true);
    fixture.destroy();
    expect(pendiente.observed).toBe(false);
  });
  it('envía las horas editadas desde el formulario visible y mantiene el resultado en el tercer paso', async () => {
    abrir();
    await detectar();
    const inicio = raiz().querySelector<HTMLInputElement>('#franja-inicio')!;
    const fin = raiz().querySelector<HTMLInputElement>('#franja-fin')!;
    inicio.value = '14:00';
    inicio.dispatchEvent(new Event('input'));
    fin.value = '18:00';
    fin.dispatchEvent(new Event('input'));
    await detectar();
    boton('Crear franja').click();
    await detectar();
    expect(servicio.crear).toHaveBeenCalledWith(1, {
      fecha: '2026-11-10',
      horaInicio: '14:00',
      horaFin: '18:00',
    });
    expect(c.guardado).toBe(true);
    expect(c.paso).toBe(3);
    expect(boton('Agregar otra franja')).toBeDefined();
  });
  it('editar otra fecha desde agenda sincroniza el mes para volver al calendario', async () => {
    elegir();
    c.abrirAgenda();
    const otraFranja = { ...franja, fecha: '2026-12-15' };
    c.abrir(otraFranja.fecha, otraFranja);
    await detectar();
    expect(c.desde).toBe('2026-12-01');
    expect(c.fechaFoco).toBe('2026-12-15');
    expect(servicio.listar).toHaveBeenLastCalledWith(1, '2026-12-01', '2026-12-31');
    boton('Atrás').click();
    await detectar();
    expect(c.paso).toBe(2);
    expect(raiz().textContent).toContain('diciembre');
  });
});
