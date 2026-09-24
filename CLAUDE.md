# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` / `ng serve` — dev server at `http://localhost:4200/`, auto-reloads.
- `ng build` — production build to `dist/` (dev build: `ng build --configuration development`, or `npm run watch` to rebuild on change).
- `ng test` — runs unit tests via the Vitest-based `@angular/build:unit-test` builder (not Karma).
  - Single file: `ng test -- src/app/features/auth/login/login.component.spec.ts` (or any Vitest CLI filter flag after `--`).
- `ng generate component path/to/name` — scaffold a component (add `--module` to register it in a specific NgModule, since this app uses NgModule declarations, not standalone components — see below).
- No lint script is configured in `package.json`. Prettier is configured (`.prettierrc`: single quotes, 100 print width, Angular parser for `.html`) but there is no `format` npm script — run `npx prettier --write .` directly if needed.

## Architecture

This is an Angular 21 app **using classic NgModules**, not the standalone-component API that's now the Angular default — every `@Component` explicitly sets `standalone: false`, and every module wires declarations via `@NgModule`. When adding a component/service, follow this module pattern rather than the standalone bootstrap style shown in newer Angular docs/scaffolds.

- **Bootstrap**: `src/main.ts` → `platformBrowser().bootstrapModule(AppModule)` (not `bootstrapApplication`). `AppModule` (`src/app/app.module.ts`) imports `AppRoutingModule` and `HttpClientModule`.
- **Routing & lazy loading**: `src/app/app-routing.module.ts` defines top-level routes and lazy-loads feature modules via `loadChildren: () => import(...).then(m => m.XModule)`. Each feature under `src/app/features/<name>/` owns its own `<name>.module.ts` + `<name>-routing.module.ts` (see `features/auth/`). New features should follow this same lazy-loaded-module structure rather than being declared in `AppModule`.
- **Layered structure**:
  - `src/app/core/` — app-wide singletons with no UI: `core/services/` (e.g. `AuthService`, `providedIn: 'root'`) and `core/config/` (e.g. `api.config.ts` exporting `API_BASE_URL`).
  - `src/app/shared/` — reusable presentational components, aggregated through `SharedModule` (declares + exports them). Import `SharedModule` into a feature module to use its components; don't declare shared components directly in feature modules.
  - `src/app/features/<name>/` — routed, feature-specific modules/components.
- **Auth**: `AuthService` (`core/services/auth.service.ts`) stores a raw JWT in `localStorage` under `appointech_token` and decodes it client-side (base64 payload split) to check expiry/role — there's no HTTP interceptor yet attaching the token to outgoing requests. Backend API calls are built off `API_BASE_URL` (`http://localhost:8080/api`, hardcoded — no environment files exist yet).
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss` (`.postcssrc.json`), imported once with `@import "tailwindcss";` in `src/styles.css`. Component templates use Tailwind utility classes directly (see `login.component.html`); there's no separate design-system/component-library layer. `tailwind.config.js` content globs `src/**/*.{html,ts}`.
- **`GradientWavesComponent`** (`shared/gradient-waves/`) renders a WebGL2 raymarched shader background using `ogl`, driven entirely by `@Input()` uniforms; it manages its own render loop (`requestAnimationFrame`), pausing via `IntersectionObserver`/`visibilitychange`/`NgZone.runOutsideAngular` to avoid change-detection overhead. Follow this pattern (outside-Angular RAF loop + observers for pause/resume + `ngOnDestroy` cleanup of RAF/observers/GL context) for any other canvas/WebGL components.
- **Domain language**: form fields, service methods, and user-facing strings are in Spanish (e.g. `correo`, `contrasena`, `estaAutenticado()`, error messages) — match this convention in auth/domain-related code rather than switching to English.
