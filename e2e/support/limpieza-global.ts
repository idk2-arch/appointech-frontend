// Limpieza al terminar (globalTeardown). Trabaja SOLO con lo que crearon las pruebas:
//  - clientes @e2e.test: cancela sus citas abiertas y desactiva la cuenta (la API no ofrece borrar usuarios);
//  - franjas del tecnico que no existian antes de la corrida (comparadas con la foto de globalSetup).
// Las citas FINALIZADAS no se pueden cancelar ni borrar por API: quedan en el historial de los clientes @e2e.test
// (e2e/limpiar-datos-e2e.sql las elimina si decides hacerlo directamente en la base).
import { existsSync, readFileSync } from 'node:fs';
import { contextoApi, DOMINIO_E2E, franjasDelTecnico, iniciarSesion, tokenAdmin } from './api';
import { entorno } from './entorno';

interface UsuarioListado { id: number; correo: string; activo: boolean }

export default async function limpiar(): Promise<void> {
  const admin = await contextoApi(await tokenAdmin());
  const usuarios = (await (await admin.get('admin/usuarios')).json()) as UsuarioListado[];
  const clientes = usuarios.filter((u) => u.correo.endsWith(DOMINIO_E2E));

  let citasCanceladas = 0;
  for (const cliente of clientes) {
    try {
      const token = await iniciarSesion(cliente.correo, entorno.contrasenaCliente);
      const api = await contextoApi(token);
      const citas = (await (await api.get('cliente/citas')).json()) as { id: number; estado: string }[];
      for (const cita of citas.filter((c) => c.estado === 'PENDIENTE' || c.estado === 'CONFIRMADA')) {
        const respuesta = await api.post(`cliente/citas/${cita.id}/cancelar`, { data: { motivo: 'Limpieza de pruebas E2E' } });
        if (respuesta.ok()) citasCanceladas += 1;
      }
      await api.dispose();
    } catch (error) {
      // Cuentas ya desactivadas de corridas anteriores: no pueden iniciar sesion y no tienen nada que cancelar
      if (cliente.activo) console.warn(`[limpieza] no se pudieron cancelar las citas de ${cliente.correo}: ${(error as Error).message}`);
    }
  }

  let franjasBorradas = 0;
  const archivo = 'resultados/franjas-previas.json';
  if (existsSync(archivo)) {
    const previas = new Set<number>(JSON.parse(readFileSync(archivo, 'utf8')));
    for (const franja of await franjasDelTecnico()) {
      if (!previas.has(franja.id)) {
        const respuesta = await admin.delete(`admin/tecnicos/${entorno.tecnicoId}/franjas/${franja.id}`);
        if (respuesta.ok()) franjasBorradas += 1;
        else console.warn(`[limpieza] franja ${franja.id} no se pudo borrar (${respuesta.status()})`);
      }
    }
  }

  let desactivados = 0;
  for (const cliente of clientes.filter((c) => c.activo)) {
    const respuesta = await admin.patch(`admin/usuarios/${cliente.id}/estado`, { data: { activo: false } });
    if (respuesta.ok()) desactivados += 1;
  }
  await admin.dispose();
  console.log(`[limpieza] citas canceladas: ${citasCanceladas}; franjas borradas: ${franjasBorradas}; clientes @e2e.test desactivados: ${desactivados} de ${clientes.length}`);
}
