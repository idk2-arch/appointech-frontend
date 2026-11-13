// Acciones de interfaz reutilizables por los flujos.
import { expect, type Page } from '@playwright/test';

/** Inicia sesion por el formulario real y espera a salir de /login. */
export async function iniciarSesionPorUi(page: Page, correo: string, contrasena: string): Promise<void> {
  await page.goto('/login');
  await page.locator('#correo').fill(correo);
  await page.locator('#contrasena').fill(contrasena);
  await page.locator('form button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login$/);
}

/**
 * Escribe en el buscador de direcciones y elige la sugerencia (la respuesta de Geoapify esta simulada).
 * La lista de sugerencias solo se pinta tras el siguiente evento del usuario (el componente no avisa del cambio al
 * terminar la consulta), por eso se pulsa una tecla de navegacion antes de elegir.
 */
export async function elegirDireccion(page: Page, texto = 'Carrera 12 # 7-18'): Promise<void> {
  const campo = page.getByRole('combobox', { name: 'Dirección' });
  const consulta = page.waitForResponse((r) => r.url().includes('geoapify'));
  await campo.fill(texto);
  await consulta;
  await campo.press('ArrowDown');
  await page.getByRole('option', { name: /Fusagasugá/ }).first().click();
}

/** Recorre los pasos 1 y 2 del asistente de solicitud hasta quedar en "Elige fecha y horario". */
export async function avanzarHastaFranjas(page: Page, especialidad: RegExp = /Lavadoras/): Promise<void> {
  await page.goto('/cliente/solicitar');
  await page.getByRole('button', { name: especialidad }).click();
  await expect(page.getByRole('heading', { name: 'Describe el problema' })).toBeVisible();
  await page.locator('#solicitud-descripcion').fill('La lavadora no centrifuga y hace ruido al girar');
  await page.locator('#solicitud-marca').fill('Whirlpool');
  await page.locator('#solicitud-modelo').fill('WWI12');
  await elegirDireccion(page);
  await page.getByRole('button', { name: /Continuar|Siguiente|Ver horarios/ }).click();
  await expect(page.getByRole('heading', { name: 'Elige fecha y horario' })).toBeVisible();
}

/** Deja el asistente de "Franjas de tecnicos" en el formulario de nueva franja, con las horas ya escritas. */
export async function abrirFormularioDeFranja(
  page: Page, nombreTecnico: string, fecha: string, horaInicio: string, horaFin: string,
): Promise<void> {
  await page.goto('/admin/franjas-tecnicos');
  await page.getByPlaceholder('Buscar técnico o especialidad').fill(nombreTecnico);
  await page.getByRole('button', { name: new RegExp(nombreTecnico) }).first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();

  // Calendario del mes: si el dia es del mes siguiente, se avanza
  const dia = page.locator(`button[data-fecha="${fecha}"]`);
  if ((await dia.count()) === 0) {
    await page.getByRole('button', { name: 'Mes siguiente' }).click();
  }
  await dia.click();
  await page.getByRole('button', { name: 'Nueva franja' }).click();

  await page.locator('#franja-inicio').fill(horaInicio);
  await page.locator('#franja-fin').fill(horaFin);
}
