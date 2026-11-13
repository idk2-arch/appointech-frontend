# Pruebas E2E con Playwright

Flujos reales en el navegador (Chromium) contra `http://localhost:4200` (frontend) y `http://localhost:8080/api` (backend), con el `docker-compose` del backend levantado.

> **Ojo:** corren contra el entorno de desarrollo. Crean datos propios (clientes `e2e-…@e2e.test`, franjas del técnico de pruebas, citas) y los limpian al final **por la API** (ver "Limpieza"). Si prefieres no tocar esa base, no las ejecutes.

## Requisitos

- Node 20+ (`node -v`), Docker Desktop con el stack de desarrollo arriba (`docker compose up -d` en la carpeta del backend; frontend en :4200, API en :8080).
- El técnico de pruebas (Freddy) y el administrador existentes en esa base.

## Instalación (una vez)

```powershell
cd ..\appointech-frontend\e2e        # esta carpeta
npm install
npx playwright install chromium
```

## Ejecución

Las claves van por variables de entorno (no están en el repositorio):

```powershell
$env:E2E_ADMIN_CONTRASENA   = '<clave del administrador>'
$env:E2E_TECNICO_CONTRASENA = '<clave del técnico de pruebas>'
npx playwright test                          # todos los flujos (≈2 min)
npx playwright test tests/05-cancelar-cita.e2e.ts
npx playwright test --headed                 # viendo el navegador
npx playwright show-report reporte-html      # abre el reporte HTML
```

Opcionales: `E2E_BASE_URL` (4200), `E2E_API_URL` (8080/api), `E2E_ADMIN_CORREO`, `E2E_TECNICO_CORREO` (`Freddy@gmail.com`), `E2E_TECNICO_ID` (1), `E2E_CLIENTE_CONTRASENA`.

El reporte queda en `e2e/reporte-html/index.html`; además `resultados/resultados.json` y, si algo falla, captura, video y *trace* en `resultados/artefactos/` (`npx playwright show-trace <trace.zip>`).

## Qué cubren

| Archivo | Flujo |
| --- | --- |
| `01-registro-login` | Registro de cliente con correo (formulario real, sin Google) → cierre de sesión → login; correo duplicado; credenciales incorrectas |
| `02-solicitar-servicio` | Asistente completo (especialidad → detalle y dirección → horario → confirmar) y verificación de la notificación (API y pantalla) |
| `03-franja-admin` | El administrador crea una franja para el técnico por la interfaz y el cliente la ve disponible (API y asistente) |
| `04-choque-franjas` | Franja que se cruza: respuesta 409, mensaje visible y formulario sin perder fecha/horas |
| `05-cancelar-cita` | El cliente cancela desde el detalle; estado `CANCELADA` y horario liberado |
| `06-calificar-cita` | Cita finalizada (el técnico la avanza por API) → calificación de 5 estrellas desde el historial |
| `07-control-por-rol` | Un cliente que abre rutas `/admin/*` vuelve al login; la API de admin responde 403; sin sesión se va al login |

Para no depender de servicios externos, la búsqueda de direcciones (Geoapify) se sustituye en el navegador por una respuesta fija dentro del radio del técnico (`support/geoapify.ts`). Google no interviene.

## Datos de prueba y limpieza

- Cada flujo crea su(s) cliente(s) por API con correo `e2e-<flujo>-<id>@e2e.test` (contraseña `E2E_CLIENTE_CONTRASENA`).
- `support/preparacion-global.ts` guarda qué franjas tenía el técnico antes; `support/limpieza-global.ts` (al terminar, aunque fallen pruebas) **cancela** las citas abiertas de los clientes `@e2e.test`, **borra** solo las franjas nuevas y **desactiva** esos clientes.
- Las citas **FINALIZADAS** (flujo 06) no se pueden cancelar ni borrar por API: quedan en el historial de un cliente `@e2e.test` desactivado y ocupan su horario (el flujo busca otro hueco la siguiente vez). Si quieres borrarlas, revisa y ejecuta tú `limpiar-datos-e2e.sql` (viene con `ROLLBACK`; cámbialo a `COMMIT`).
- Los flujos usan días fijos (hoy+3 … hoy+6, dentro de los 7 días rápidos del asistente) y se ejecutan de a uno (`workers: 1`) porque comparten al técnico.

## Cómo interpretar los resultados

- Verde = el flujo completo funcionó. Rojo = mira primero la captura/video del reporte y el *trace* (paso exacto, red, consola).
- Un fallo con "No hay horario libre…" no es del producto: se acumularon citas finalizadas de pruebas anteriores en los días reservados (usa el SQL de limpieza o espera al día siguiente).

## Observaciones del frontend descubiertas al automatizar

- La lista de sugerencias de direcciones no se pinta al llegar la respuesta, sino en el siguiente evento del usuario (el componente no avisa del cambio): el helper pulsa una tecla para forzarlo.
- En `/cliente/historial`, Playwright detecta que el host `app-historial-cliente` "intercepta el puntero" sobre el botón *Calificar*, aunque `elementFromPoint` lo da arriba; la prueba dispara el clic directamente sobre el botón.
