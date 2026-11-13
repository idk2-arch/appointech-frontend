// Cliente de la API del backend para preparar y verificar datos (la UI se prueba aparte). No imita al navegador:
// solo crea lo que un flujo necesita de antemano (clientes, franjas, citas) y lo limpia al final.
import { request, type APIRequestContext } from '@playwright/test';
import { entorno } from './entorno';

export const DOMINIO_E2E = '@e2e.test';

export interface Franja { id: number; fecha: string; horaInicio: string; horaFin: string; bloques: number; bloquesOcupados: number }
export interface FranjaDisponible { tecnicoId: number; inicio: string; fin: string }
export interface Cita { id: number; estado: string; tecnicoId: number | null; fechaHoraInicio: string | null }

export async function contextoApi(token?: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: `${entorno.apiUrl}/`,
    extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function iniciarSesion(correo: string, contrasena: string): Promise<string> {
  const api = await contextoApi();
  const respuesta = await api.post('auth/login', { data: { correo, contrasena } });
  if (!respuesta.ok()) {
    throw new Error(`Login de ${correo} fallo con ${respuesta.status()}`);
  }
  const token = (await respuesta.json()).datos.token as string;
  await api.dispose();
  return token;
}

export const tokenAdmin = (): Promise<string> => iniciarSesion(entorno.adminCorreo, entorno.adminContrasena);
export const tokenTecnico = (): Promise<string> => iniciarSesion(entorno.tecnicoCorreo, entorno.tecnicoContrasena);

let contador = 0;

/** Correo y datos unicos de un cliente de prueba (siempre @e2e.test para poder limpiarlos). */
export function datosClienteNuevo(etiqueta: string): { nombre: string; apellido: string; correo: string; telefono: string; documento: string } {
  contador += 1;
  const sufijo = `${Date.now().toString(36)}${contador}`;
  const numero = `${Date.now()}`.slice(-9) + contador;
  return {
    nombre: 'Prueba',
    apellido: `E2E ${etiqueta}`,
    correo: `e2e-${etiqueta}-${sufijo}${DOMINIO_E2E}`,
    telefono: `31${numero.slice(-8)}`,
    documento: `9${numero}`.slice(0, 12),
  };
}

/** Crea un cliente por API y devuelve sus credenciales. */
export async function crearCliente(etiqueta: string): Promise<{ correo: string; contrasena: string; token: string }> {
  const datos = datosClienteNuevo(etiqueta);
  const api = await contextoApi();
  const respuesta = await api.post('auth/registro/cliente', {
    data: {
      nombre: datos.nombre, apellido: datos.apellido, correo: datos.correo, contrasena: entorno.contrasenaCliente,
      telefono: datos.telefono, tipoDocumento: 'CC', numeroDocumento: datos.documento, direccion: 'Carrera 12 # 7-18, Fusagasuga',
    },
  });
  if (respuesta.status() !== 201) {
    throw new Error(`No se pudo crear el cliente de prueba: ${respuesta.status()} ${await respuesta.text()}`);
  }
  await api.dispose();
  return { correo: datos.correo, contrasena: entorno.contrasenaCliente, token: await iniciarSesion(datos.correo, entorno.contrasenaCliente) };
}

/** Fecha yyyy-MM-dd de "hoy + dias" en hora de Colombia. */
export function fechaEnDias(dias: number): string {
  return new Date(Date.now() - 5 * 3600 * 1000 + dias * 86_400_000).toISOString().slice(0, 10);
}

export async function crearFranja(fecha: string, horaInicio: string, horaFin: string): Promise<Franja> {
  const api = await contextoApi(await tokenAdmin());
  const respuesta = await api.post(`admin/tecnicos/${entorno.tecnicoId}/franjas`, { data: { fecha, horaInicio, horaFin } });
  if (!respuesta.ok()) {
    throw new Error(`No se pudo crear la franja ${fecha} ${horaInicio}-${horaFin}: ${respuesta.status()} ${await respuesta.text()}`);
  }
  const franja = (await respuesta.json()) as Franja;
  await api.dispose();
  return franja;
}

export async function franjasDelTecnico(): Promise<Franja[]> {
  const api = await contextoApi(await tokenAdmin());
  const respuesta = await api.get(`admin/tecnicos/${entorno.tecnicoId}/franjas`);
  const franjas = (await respuesta.json()) as Franja[];
  await api.dispose();
  return franjas;
}

export async function franjasDisponibles(token: string, fecha: string, especialidadId: number): Promise<FranjaDisponible[]> {
  const api = await contextoApi(token);
  const respuesta = await api.get(
    `disponibilidad/franjas-con-motivo?especialidadId=${especialidadId}&fecha=${fecha}&latitud=4.3432&longitud=-74.3657`,
  );
  const cuerpo = await respuesta.json();
  await api.dispose();
  return cuerpo.franjas as FranjaDisponible[];
}

export async function notificacionesDe(token: string): Promise<{ tipo: string; titulo: string; mensaje: string; leida: boolean }[]> {
  const api = await contextoApi(token);
  const respuesta = await api.get('notificaciones?page=0&size=50');
  const lista = await respuesta.json();
  await api.dispose();
  return lista;
}

export async function citasDelCliente(token: string): Promise<Cita[]> {
  const api = await contextoApi(token);
  const respuesta = await api.get('cliente/citas');
  const lista = await respuesta.json();
  await api.dispose();
  return Array.isArray(lista) ? lista : lista.contenido ?? [];
}

/** Solicitud + confirmacion de cita por API (para los flujos que parten de una cita ya agendada). */
export async function agendarCitaPorApi(token: string, franja: FranjaDisponible, especialidadId: number): Promise<number> {
  const api = await contextoApi(token);
  const solicitud = await api.post('solicitudes', {
    data: {
      especialidadId, descripcionProblema: 'Prueba E2E: la lavadora no centrifuga', direccionServicio: 'Carrera 12 # 7-18, Fusagasuga',
      latitud: 4.3432, longitud: -74.3657,
    },
  });
  if (solicitud.status() !== 201) {
    throw new Error(`No se pudo crear la solicitud: ${solicitud.status()} ${await solicitud.text()}`);
  }
  const { id } = await solicitud.json();
  const confirmacion = await api.post('citas/confirmar', {
    data: { solicitudId: id, tecnicoId: franja.tecnicoId, inicio: franja.inicio, fin: franja.fin },
  });
  if (!confirmacion.ok()) {
    throw new Error(`No se pudo confirmar la cita: ${confirmacion.status()} ${await confirmacion.text()}`);
  }
  await api.dispose();
  return id as number;
}

/** El tecnico lleva la cita hasta FINALIZADA (CONFIRMADA -> EN_CAMINO -> EN_PROCESO -> FINALIZADA). */
export async function finalizarCitaComoTecnico(citaId: number): Promise<void> {
  const api = await contextoApi(await tokenTecnico());
  for (const estado of ['EN_CAMINO', 'EN_PROCESO', 'FINALIZADA']) {
    const respuesta = await api.patch(`tecnico/citas/${citaId}/estado`, { data: { estado } });
    if (!respuesta.ok()) {
      throw new Error(`No se pudo pasar la cita ${citaId} a ${estado}: ${respuesta.status()} ${await respuesta.text()}`);
    }
  }
  await api.dispose();
}

export async function borrarFranja(id: number): Promise<void> {
  const api = await contextoApi(await tokenAdmin());
  await api.delete(`admin/tecnicos/${entorno.tecnicoId}/franjas/${id}`);
  await api.dispose();
}

function sumarMinutos(hora: string, minutos: number): string {
  const total = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5)) + minutos;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Abre una franja de 90 minutos en una hora al azar del dia que NO choque con otras franjas ni con citas que hayan
 * quedado de corridas anteriores (las citas FINALIZADAS no se pueden borrar y siguen ocupando su horario).
 */
export async function abrirBloqueLibre(token: string, fecha: string, especialidadId: number): Promise<FranjaDisponible> {
  const inicios: string[] = [];
  for (let minutos = 8 * 60; minutos <= 16 * 60 + 30; minutos += 15) {
    inicios.push(sumarMinutos('00:00', minutos));
  }
  inicios.sort(() => Math.random() - 0.5);
  for (const inicio of inicios) {
    let franja: Franja;
    try {
      franja = await crearFranja(fecha, inicio, sumarMinutos(inicio, 90));
    } catch {
      continue; // se cruza con otra franja del dia
    }
    const propio = (await franjasDisponibles(token, fecha, especialidadId))
      .find((b) => b.inicio.slice(11, 16) === inicio && b.tecnicoId === entorno.tecnicoId);
    if (propio) {
      return propio;
    }
    await borrarFranja(franja.id);
  }
  throw new Error(`No se encontro un horario libre el ${fecha} para el tecnico de pruebas`);
}

/** Como abrirBloqueLibre, probando varios dias (hoy + N) en orden hasta encontrar horario. */
export async function abrirBloqueLibreEnAlgunDia(token: string, dias: number[], especialidadId: number): Promise<FranjaDisponible> {
  for (const dia of dias) {
    try {
      return await abrirBloqueLibre(token, fechaEnDias(dia), especialidadId);
    } catch {
      // sin hueco ese dia: se prueba el siguiente
    }
  }
  throw new Error(`No hay horario libre para el tecnico de pruebas en los dias +${dias.join(', +')}`);
}
