import { expect, test } from '@playwright/test';
import { crearFranja, fechaEnDias } from '../support/api';
import { entorno } from '../support/entorno';
import { abrirFormularioDeFranja, iniciarSesionPorUi } from '../support/ui';

const DIA = 5;

test.describe('Choque de franjas', () => {
  test('una franja que se cruza con otra muestra el 409 y no pierde lo que el administrador escribio', async ({ page }) => {
    const fecha = fechaEnDias(DIA);
    await crearFranja(fecha, '08:00', '11:00');

    await iniciarSesionPorUi(page, entorno.adminCorreo, entorno.adminContrasena);
    await abrirFormularioDeFranja(page, 'Freddy', fecha, '09:00', '12:00');

    const intento = page.waitForResponse((r) => r.url().includes('/franjas') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Crear franja' }).click();
    expect((await intento).status()).toBe(409);

    // El error se muestra y el formulario conserva fecha y horas
    await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Franjas creadas' })).toHaveCount(0);
    await expect(page.locator('#franja-fecha')).toHaveValue(fecha);
    await expect(page.locator('#franja-inicio')).toHaveValue('09:00');
    await expect(page.locator('#franja-fin')).toHaveValue('12:00');
    await expect(page.getByRole('button', { name: 'Crear franja' })).toBeEnabled();
  });
});
