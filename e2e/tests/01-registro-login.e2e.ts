import { expect, test } from '@playwright/test';
import { simularGeocodificacion } from '../support/geoapify';
import { datosClienteNuevo } from '../support/api';
import { entorno } from '../support/entorno';
import { elegirDireccion, iniciarSesionPorUi } from '../support/ui';

test.describe('Registro y login de cliente con correo (sin Google)', () => {
  test.beforeEach(async ({ page }) => {
    await simularGeocodificacion(page);
  });

  test('un cliente nuevo se registra, cierra sesion y vuelve a entrar con su correo', async ({ page }) => {
    const cliente = datosClienteNuevo('registro');

    await page.goto('/registro');
    await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible();

    await page.getByLabel('Nombre', { exact: true }).fill(cliente.nombre);
    await page.getByLabel('Apellido', { exact: true }).fill(cliente.apellido);
    await page.getByLabel('Correo electrónico').fill(cliente.correo);
    await page.getByLabel('Contraseña', { exact: true }).fill(entorno.contrasenaCliente);
    await page.getByLabel('Repite la contraseña').fill(entorno.contrasenaCliente);
    await page.getByRole('combobox', { name: /Tipo de documento/ }).click();
    await page.getByRole('option', { name: 'Cédula de ciudadanía' }).click();
    await elegirDireccion(page);
    await page.getByLabel(/Número de documento/).fill(cliente.documento);
    await page.getByLabel(/Teléfono/).fill(cliente.telefono);

    const registro = page.waitForResponse((r) => r.url().endsWith('/auth/registro/cliente'));
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    expect((await registro).status()).toBe(201);

    // Tras registrarse, la sesion queda abierta: el cliente sale de /registro
    await expect(page).not.toHaveURL(/\/registro$/);

    // Cerrar sesion limpiando el almacenamiento del navegador y entrar de nuevo por el formulario de login
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await iniciarSesionPorUi(page, cliente.correo, entorno.contrasenaCliente);
    await expect(page).toHaveURL(/\/(cliente|completar-perfil)/);
  });

  test('un correo ya registrado muestra el aviso y no crea otra cuenta', async ({ page }) => {
    const cliente = datosClienteNuevo('duplicado');
    for (const intento of [1, 2]) {
      await page.goto('/registro');
      await page.getByLabel('Nombre', { exact: true }).fill(cliente.nombre);
      await page.getByLabel('Apellido', { exact: true }).fill(cliente.apellido);
      await page.getByLabel('Correo electrónico').fill(cliente.correo);
      await page.getByLabel('Contraseña', { exact: true }).fill(entorno.contrasenaCliente);
      await page.getByLabel('Repite la contraseña').fill(entorno.contrasenaCliente);
      await page.getByRole('combobox', { name: /Tipo de documento/ }).click();
      await page.getByRole('option', { name: 'Cédula de ciudadanía' }).click();
      await elegirDireccion(page);
      await page.getByRole('button', { name: 'Crear cuenta' }).click();
      if (intento === 1) {
        await expect(page).not.toHaveURL(/\/registro$/);
        await page.evaluate(() => localStorage.clear());
      }
    }
    await expect(page.getByRole('alert').filter({ hasText: 'Ya existe una cuenta con ese correo' })).toBeVisible();
  });

  test('credenciales incorrectas no inician sesion', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#correo').fill('no-existe@e2e.test');
    await page.locator('#contrasena').fill('incorrecta-123');
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
