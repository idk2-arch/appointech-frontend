import { expect, test } from '@playwright/test';
import { abrirBloqueLibreEnAlgunDia, agendarCitaPorApi, citasDelCliente, crearCliente, franjasDisponibles } from '../support/api';
import { iniciarSesionPorUi } from '../support/ui';

// Dias (hoy + N) donde buscar un horario libre; los +3 y +4 los usan flujos con horas fijas
const DIAS = [6, 5];

test.describe('El cliente cancela una cita', () => {
  test('cancelar desde el detalle deja la cita CANCELADA y libera el horario', async ({ page }) => {
    const cliente = await crearCliente('cancelar');
    const bloque = await abrirBloqueLibreEnAlgunDia(cliente.token, DIAS, 1);
    const fecha = bloque.inicio.slice(0, 10);
    const citaId = await agendarCitaPorApi(cliente.token, bloque, 1);
    const inicios = async () => (await franjasDisponibles(cliente.token, fecha, 1)).map((b) => b.inicio);
    expect(await inicios()).not.toContain(bloque.inicio);

    await iniciarSesionPorUi(page, cliente.correo, cliente.contrasena);
    await page.goto(`/cliente/citas/${citaId}`);
    await expect(page.getByRole('heading', { name: 'Detalle de la cita' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar cita' }).first().click();

    await page.locator('#dialogo-motivo-texto').fill('Ya no necesito el servicio');
    const cancelacion = page.waitForResponse((r) => r.url().endsWith(`/cliente/citas/${citaId}/cancelar`));
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar cita' }).click();
    expect((await cancelacion).status()).toBe(200);

    // La interfaz refleja el nuevo estado, el backend tambien y el horario queda libre otra vez
    await expect(page.getByText('Cancelada').first()).toBeVisible();
    const citas = await citasDelCliente(cliente.token);
    expect(citas.find((c) => c.id === citaId)?.estado).toBe('CANCELADA');
    expect(await inicios()).toContain(bloque.inicio);
  });
});
