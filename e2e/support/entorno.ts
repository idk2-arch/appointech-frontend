// Configuracion por variables de entorno (ninguna clave se escribe en el repositorio).
function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Ver e2e/README.md`);
  }
  return valor;
}

export const entorno = {
  baseUrl: process.env.E2E_BASE_URL ?? 'http://localhost:4200',
  apiUrl: process.env.E2E_API_URL ?? 'http://localhost:8080/api',
  adminCorreo: process.env.E2E_ADMIN_CORREO ?? 'admin@appointech.com',
  get adminContrasena(): string {
    return requerida('E2E_ADMIN_CONTRASENA');
  },
  // Tecnico de pruebas (Freddy en el entorno de desarrollo)
  tecnicoCorreo: process.env.E2E_TECNICO_CORREO ?? 'Freddy@gmail.com',
  get tecnicoContrasena(): string {
    return requerida('E2E_TECNICO_CONTRASENA');
  },
  tecnicoId: Number(process.env.E2E_TECNICO_ID ?? 1),
  // Contrasena de los clientes que crean las pruebas (propios, con correo @e2e.test)
  contrasenaCliente: process.env.E2E_CLIENTE_CONTRASENA ?? 'E2e-Prueba-2026',
};
