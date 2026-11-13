import { expect, test } from '@playwright/test';
import { crearCliente } from '../support/api';
import { entorno } from '../support/entorno';
import { iniciarSesionPorUi } from '../support/ui';

const RUTAS_ADMIN = ['/admin/usuarios', '/admin/franjas-tecnicos', '/admin/dashboard'];

test.describe('Control de acceso por rol', () => {
  test('un cliente que intenta abrir rutas de administrador es bloqueado y no ve su contenido', async ({ page }) => {
    const cliente = await crearCliente('rol');
    await iniciarSesionPorUi(page, cliente.correo, cliente.contrasena);

    for (const ruta of RUTAS_ADMIN) {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test('un cliente no puede usar la API de administracion aunque tenga un token valido', async ({ request }) => {
    const cliente = await crearCliente('rol-api');
    const respuesta = await request.get(`${entorno.apiUrl}/admin/usuarios`, {
      headers: { Authorization: `Bearer ${cliente.token}` },
    });
    expect(respuesta.status()).toBe(403);
  });

  test('sin sesion, las rutas protegidas llevan al login', async ({ page }) => {
    await page.goto('/cliente/citas');
    await expect(page).toHaveURL(/\/login$/);
  });
});
