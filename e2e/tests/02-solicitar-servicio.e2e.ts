import { expect, test } from '@playwright/test';
import { crearCliente, crearFranja, fechaEnDias, notificacionesDe } from '../support/api';
import { simularGeocodificacion } from '../support/geoapify';
import { elegirDireccion, iniciarSesionPorUi } from '../support/ui';

// Dia (hoy + N) reservado para este flujo: cada flujo usa el suyo para no pisarse con los demas
const DIA = 3;

test.describe('Solicitar un servicio con el asistente completo', () => {
  test('el cliente recorre los pasos, confirma la cita y recibe la notificacion', async ({ page }) => {
    const cliente = await crearCliente('solicitud');
    await crearFranja(fechaEnDias(DIA), '08:00', '11:00');
    await simularGeocodificacion(page);

    await iniciarSesionPorUi(page, cliente.correo, cliente.contrasena);
    await page.goto('/cliente/solicitar');
    await expect(page.getByRole('heading', { name: 'Solicitar servicio técnico' })).toBeVisible();

    // Paso 1: especialidad
    await expect(page.getByRole('heading', { name: '¿Qué necesitas reparar?' })).toBeVisible();
    await page.getByRole('button', { name: /Lavadoras/ }).click();

    // Paso 2: descripcion y direccion
    await expect(page.getByRole('heading', { name: 'Describe el problema' })).toBeVisible();
    await page.locator('#solicitud-descripcion').fill('La lavadora no centrifuga y hace ruido al girar');
    await page.locator('#solicitud-marca').fill('Whirlpool');
    await page.locator('#solicitud-modelo').fill('WWI12');
    await elegirDireccion(page);
    await page.getByRole('button', { name: /Continuar|Siguiente|Ver horarios/ }).click();

    // Paso 3: fecha y horario
    await expect(page.getByRole('heading', { name: 'Elige fecha y horario' })).toBeVisible();
    await page.getByRole('radio').nth(DIA).click();
    await page.getByRole('button', { name: /08:00|8:00/ }).first().click();

    // Paso 4: revision y confirmacion
    await expect(page.getByRole('heading', { name: 'Revisa y confirma tu cita' })).toBeVisible();
    const confirmacion = page.waitForResponse((r) => r.url().endsWith('/citas/confirmar'));
    await page.getByRole('button', { name: 'Confirmar cita' }).click();
    expect((await confirmacion).status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Tu cita está confirmada' })).toBeVisible();

    // La notificacion interna existe en el backend...
    await expect
      .poll(async () => (await notificacionesDe(cliente.token)).some((n) => n.tipo === 'CITA_CONFIRMADA'), { timeout: 15_000 })
      .toBe(true);

    // ...y se muestra en la pantalla de notificaciones del cliente
    await page.goto('/cliente/notificaciones');
    await expect(page.getByText(/confirmad/i).first()).toBeVisible();
  });
});
