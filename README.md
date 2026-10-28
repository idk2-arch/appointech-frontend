# AppoinTech Frontend

Interfaz web de AppoinTech — sistema de gestión de citas y servicios técnicos a domicilio para reparación de electrodomésticos.

Generado con [Angular CLI](https://github.com/angular/angular-cli) versión 21.2.24.

## Configuración de Geoapify

La búsqueda de direcciones usa Geoapify. La llave **no** está en el repositorio: `src/app/core/config/geoapify.config.ts` está en `.gitignore`.

**Localmente**

1. Copia la plantilla: `cp src/app/core/config/geoapify.config.example.ts src/app/core/config/geoapify.config.ts`.
2. Reemplaza `REEMPLAZAR_CON_TU_LLAVE` por tu llave de Geoapify. No subas ese archivo.

**En CI (GitHub Actions)**

El workflow genera `geoapify.config.ts` antes de compilar. Para usar tu llave real, crea el secreto `GEOAPIFY_API_KEY` en *Settings → Secrets and variables → Actions*. Es opcional: sin él se usa el valor de relleno `ci-placeholder` y el build y las pruebas pasan igual.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Docker

La imagen es multi-stage: `node:20-alpine` compila la app y `nginx:1.27-alpine` sirve solo el resultado (`dist/appointech-frontend/browser`), con `try_files` para que funcionen las rutas de Angular al recargar.

Construir la imagen:

```bash
docker build -t appointech-frontend .
```

Se levanta junto al backend con el `docker compose` de la carpeta del backend (servicio `frontend`, contexto en esta carpeta, puerto interno 80):

```bash
docker compose up --build
```

La aplicación queda en http://localhost:4200. El navegador llama al backend por el balanceador publicado en http://localhost:8080 (`API_BASE_URL` en `src/app/core/config/api.config.ts`).
