import { expect, test } from '@playwright/test';
import { crearCliente, fechaEnDias, franjasDisponibles } from '../support/api';
import { entorno } from '../support/entorno';
import { simularGeocodificacion } from '../support/geoapify';
import { abrirFormularioDeFranja, avanzarHastaFranjas, iniciarSesionPorUi } from '../support/ui';

const DIA = 4;
const ESPECIALIDAD_LAVADORAS = 1;

test.describe('El administrador abre una franja para el tecnico y el cliente la ve disponible', () => {
  test('franja creada en la interfaz de administracion aparece en los horarios del cliente', async ({ browser }) => {
    const fecha = fechaEnDias(DIA);
    const cliente = await crearCliente('franja');

    // --- Administrador: crea la franja 08:00-11:00 (dos bloques de 90 min) para el tecnico por la interfaz ---
    const contextoAdmin = await browser.newContext();
    const admin = await contextoAdmin.newPage();
    await iniciarSesionPorUi(admin, entorno.adminCorreo, entorno.adminContrasena);
    await abrirFormularioDeFranja(admin, 'Freddy', fecha, '08:00', '11:00');
    const creacion = admin.waitForResponse((r) => r.url().includes('/franjas') && r.request().method() === 'POST');
    await admin.getByRole('button', { name: 'Crear franja' }).click();
    expect((await creacion).status()).toBe(201);
    await expect(admin.getByRole('heading', { name: 'Franjas creadas' })).toBeVisible();
    await contextoAdmin.close();

    // --- API: el cliente recibe los dos bloques del tecnico ---
    const bloques = await franjasDisponibles(cliente.token, fecha, ESPECIALIDAD_LAVADORAS);
    expect(bloques.filter((b) => b.tecnicoId === entorno.tecnicoId).map((b) => b.inicio.slice(11, 16))).toEqual(['08:00', '09:30']);

    // --- Cliente: ve el horario en el asistente ---
    const contextoCliente = await browser.newContext();
    const paginaCliente = await contextoCliente.newPage();
    await simularGeocodificacion(paginaCliente);
    await iniciarSesionPorUi(paginaCliente, cliente.correo, cliente.contrasena);
    await avanzarHastaFranjas(paginaCliente);
    await paginaCliente.getByRole('radio').nth(DIA).click();
    await expect(paginaCliente.getByRole('button', { name: /8:00 a. m./ }).first()).toBeVisible();
    await expect(paginaCliente.getByRole('button', { name: /9:30 a. m./ }).first()).toBeVisible();
    await contextoCliente.close();
  });
});
