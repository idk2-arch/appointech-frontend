import { describe, expect, it } from 'vitest';

import { metricasDe, metricasVacias } from '../../../core/models/metricas.mock';
import { CIRCUNFERENCIA_ANILLO, construirVista, rellenoDeEstrellas } from './vista-metricas';

describe('rellenoDeEstrellas', () => {
  it('llena las estrellas enteras y deja una parcial', () => {
    expect(rellenoDeEstrellas(5)).toEqual([1, 1, 1, 1, 1]);
    expect(rellenoDeEstrellas(3.5)).toEqual([1, 1, 1, 0.5, 0]);
    expect(rellenoDeEstrellas(0)).toEqual([0, 0, 0, 0, 0]);
  });

  it('sin promedio todas quedan vacías, y los valores fuera de rango se limitan', () => {
    expect(rellenoDeEstrellas(null)).toEqual([0, 0, 0, 0, 0]);
    expect(rellenoDeEstrellas(9)).toEqual([1, 1, 1, 1, 1]);
    expect(rellenoDeEstrellas(-2)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('construirVista', () => {
  const vista = construirVista(metricasDe());

  it('escribe el rango que devolvió el servidor', () => {
    expect(vista.rangoTexto).toBe('Del 8 oct 2026 al 6 nov 2026');
    expect(vista.dias).toBe(30);
    expect(vista.sinActividad).toBe(false);
  });

  it('las citas llevan sus seis estados, en orden, con barras proporcionales a la mayor', () => {
    expect(vista.citas.total).toBe(20);
    expect(vista.citas.barras.map((b) => [b.etiqueta, b.cantidad, b.ancho])).toEqual([
      ['Pendiente', 7, 100],
      ['Confirmada', 5, 71.4],
      ['En camino', 0, 0],
      ['En proceso', 0, 0],
      ['Finalizada', 7, 100],
      ['Cancelada', 1, 14.3],
    ]);
    expect(new Set(vista.citas.barras.map((b) => b.clase)).size).toBe(6);
  });

  it('sin citas las barras quedan en cero (no se divide entre cero)', () => {
    expect(construirVista(metricasVacias()).citas.barras.every((b) => b.ancho === 0 && b.cantidad === 0)).toBe(true);
  });

  it('la tasa de cancelación sale con un decimal y un trazo proporcional del anillo', () => {
    expect(vista.tasa.texto).toBe('5,0 %');
    expect(vista.tasa.porcentaje).toBe(5);
    const [trazo, resto] = vista.tasa.trazo.split(' ').map(Number);
    expect(trazo).toBeCloseTo(CIRCUNFERENCIA_ANILLO * 0.05, 1);
    expect(trazo + resto).toBeCloseTo(CIRCUNFERENCIA_ANILLO, 1);
  });

  it('la tasa se limita a 0–100 en el anillo', () => {
    const pasada = construirVista(metricasDe({ citas: { ...metricasDe().citas, tasaCancelacion: 140 } }));
    expect(pasada.tasa.porcentaje).toBe(100);
    expect(pasada.tasa.trazo.split(' ').map(Number)[1]).toBeCloseTo(0, 1);
    expect(construirVista(metricasVacias()).tasa).toMatchObject({ texto: '0,0 %', porcentaje: 0 });
  });

  it('los ingresos van en pesos colombianos sin decimales, con cada método', () => {
    const texto = (valor: string): string => valor.replace(/\s/g, ' ');
    expect(texto(vista.ingresos.total)).toBe('$ 585.000');
    expect(vista.ingresos.cantidadPagos).toBe(4);
    expect(vista.ingresos.metodos.map((m) => [m.etiqueta, texto(m.monto), m.cantidad])).toEqual([
      ['Efectivo', '$ 395.000', 2],
      ['En línea', '$ 190.000', 2],
    ]);
    expect(texto(vista.porCobrar.monto)).toBe('$ 300.000');
    expect(vista.porCobrar.cantidad).toBe(1);
  });

  it('los montos con decimales se redondean solo al mostrarlos', () => {
    const conDecimales = construirVista(metricasDe({ ingresos: { ...metricasDe().ingresos, total: 95000.6 } }));
    expect(conDecimales.ingresos.total.replace(/\s/g, ' ')).toBe('$ 95.001');
  });

  it('las calificaciones traen el promedio, las estrellas y el ranking', () => {
    expect(vista.calificaciones).toEqual({
      promedio: 5,
      total: 1,
      estrellas: [1, 1, 1, 1, 1],
      ranking: [{ nombre: 'Freddy Monroy', promedio: 5, cantidad: 1 }],
      masTecnicos: 0,
    });
  });

  it('el ranking muestra solo los cinco primeros, por promedio y luego por cantidad, y cuenta los demás', () => {
    const tecnico = (id: number, promedio: number, cantidad: number) => ({ tecnicoId: id, nombre: `T${id}`, promedio, cantidad });
    const m = metricasDe({
      calificaciones: { promedio: 4, total: 10, porTecnico: [tecnico(1, 3, 5), tecnico(2, 5, 1), tecnico(3, 4, 2), tecnico(4, 5, 4), tecnico(5, 4.5, 9), tecnico(6, 2, 3), tecnico(7, 1, 1)] },
    });
    const { ranking, masTecnicos } = construirVista(m).calificaciones;
    expect(ranking.map((t) => t.nombre)).toEqual(['T4', 'T2', 'T5', 'T3', 'T1']);
    expect(masTecnicos).toBe(2);
  });

  it('sin calificaciones: sin promedio, estrellas vacías y ranking vacío', () => {
    expect(construirVista(metricasVacias()).calificaciones).toEqual({ promedio: null, total: 0, estrellas: [0, 0, 0, 0, 0], ranking: [], masTecnicos: 0 });
  });

  it('las especialidades en cero se conservan, atenuadas', () => {
    const m = metricasDe({
      especialidades: [
        { especialidadId: 1, nombre: 'Lavadoras', totalCitas: 10, finalizadas: 4 },
        { especialidadId: 2, nombre: 'Neveras', totalCitas: 0, finalizadas: 0 },
      ],
    });
    expect(construirVista(m).especialidades).toEqual([
      { nombre: 'Lavadoras', totalCitas: 10, finalizadas: 4, anchoTotal: 100, anchoFinalizadas: 40, atenuada: false },
      { nombre: 'Neveras', totalCitas: 0, finalizadas: 0, anchoTotal: 0, anchoFinalizadas: 0, atenuada: true },
    ]);
  });

  it('las solicitudes especiales y los usuarios traen todas sus filas', () => {
    expect(vista.solicitudes).toEqual({
      total: 0,
      filas: [
        { etiqueta: 'Fuera de cobertura', cantidad: 0 },
        { etiqueta: 'Sin técnicos para la especialidad', cantidad: 0 },
      ],
    });
    expect(vista.usuarios).toEqual({
      total: 4,
      filas: [
        { etiqueta: 'Clientes', cantidad: 2 },
        { etiqueta: 'Técnicos', cantidad: 1 },
        { etiqueta: 'Administradores', cantidad: 1 },
      ],
    });
  });

  it('un mapa al que le falte una clave cuenta cero, sin romper', () => {
    const incompleta = metricasDe({
      citas: { total: 3, porEstado: { PENDIENTE: 3 } as never, tasaCancelacion: null as never },
      ingresos: { ...metricasDe().ingresos, porMetodo: {} as never },
      solicitudesEspeciales: { total: 0, porMotivo: {} as never },
      usuariosActivos: { total: 0, porRol: {} as never },
    });
    const v = construirVista(incompleta);
    expect(v.citas.barras.map((b) => b.cantidad)).toEqual([3, 0, 0, 0, 0, 0]);
    expect(v.tasa.porcentaje).toBe(0);
    expect(v.ingresos.metodos.map((m) => m.cantidad)).toEqual([0, 0]);
    expect(v.solicitudes.filas.map((f) => f.cantidad)).toEqual([0, 0]);
    expect(v.usuarios.filas.map((f) => f.cantidad)).toEqual([0, 0, 0]);
  });

  it('sin actividad en el rango lo marca (los ceros no son un error)', () => {
    expect(construirVista(metricasVacias()).sinActividad).toBe(true);
  });

  it('basta una cita, un pago, una calificación o una cita por especialidad para que haya actividad', () => {
    const vacia = metricasVacias();
    expect(construirVista({ ...vacia, citas: { ...vacia.citas, total: 1 } }).sinActividad).toBe(false);
    expect(construirVista({ ...vacia, ingresos: { ...vacia.ingresos, cantidadPagos: 1 } }).sinActividad).toBe(false);
    expect(construirVista({ ...vacia, calificaciones: { promedio: 4, total: 1, porTecnico: [] } }).sinActividad).toBe(false);
    expect(construirVista({ ...vacia, especialidades: [{ especialidadId: 1, nombre: 'X', totalCitas: 2, finalizadas: 0 }] }).sinActividad).toBe(false);
  });
});
