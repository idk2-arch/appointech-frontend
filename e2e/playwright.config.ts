import { defineConfig, devices } from '@playwright/test';
import { entorno } from './support/entorno';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.ts',
  // Los flujos comparten al tecnico Freddy: se ejecutan de a uno y en orden para no pisarse
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: 'resultados/artefactos',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reporte-html', open: 'never' }],
    ['json', { outputFile: 'resultados/resultados.json' }],
  ],
  globalSetup: './support/preparacion-global.ts',
  globalTeardown: './support/limpieza-global.ts',
  use: {
    baseURL: entorno.baseUrl,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
