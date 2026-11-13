import { expect, test } from '@playwright/test';
import {
  abrirBloqueLibreEnAlgunDia, agendarCitaPorApi, contextoApi, crearCliente, finalizarCitaComoTecnico,
} from '../support/api';
import { iniciarSesionPorUi } from '../support/ui';

// Las citas FINALIZADAS no se pueden borrar y siguen ocupando su horario: este flujo busca hueco en estos dias (hoy + N),
// que no usan los flujos con horas fijas (+3 y +4).
const DIAS = [5, 6];

test.describe('El cliente califica una cita finalizada', () => {
  test('puntua con 5 estrellas desde el historial y la calificacion queda guardada', async ({ page }) => {
    const cliente = await crearCliente('calificar');
    const bloque = await abrirBloqueLibreEnAlgunDia(cliente.token, DIAS, 1);
    const citaId = await agendarCitaPorApi(cliente.token, bloque, 1);
    await finalizarCitaComoTecnico(citaId);

    await iniciarSesionPorUi(page, cliente.correo, cliente.contrasena);
    await page.goto('/cliente/historial');
    // dispatchEvent: con click() Playwright detecta que el host de la pagina intercepta el puntero, aunque el boton esta
    // arriba segun elementFromPoint; se dispara el clic directamente sobre el boton
    await page.getByRole('button', { name: 'Calificar' }).first().dispatchEvent('click');

    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByText('Calificar servicio')).toBeVisible();
    await dialogo.getByRole('radio', { name: /^5 de 5/ }).click();
    const envio = page.waitForResponse((r) => r.url().endsWith(`/cliente/citas/${citaId}/calificacion`) && r.request().method() === 'POST');
    await dialogo.getByRole('button', { name: 'Enviar calificación' }).click();
    expect((await envio).status()).toBe(201);
    await expect(page.getByText('¡Gracias por tu calificación!')).toBeVisible();

    const api = await contextoApi(cliente.token);
    const guardada = await (await api.get(`cliente/citas/${citaId}/calificacion`)).json();
    expect(guardada.puntuacion).toBe(5);
    await api.dispose();
  });
});
