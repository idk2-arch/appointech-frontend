---
target: login
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\Juan David\\Downloads\\appointech-frontend\\src\\app\\features\\auth\\login\\login.component.html"
target_fingerprint: "sha256:17c328cc2701a6e293310feccb96a5583d7d62c2934513b4ccd15950d1a5ae24"
target_path: "C:\\Users\\Juan David\\Downloads\\appointech-frontend\\src\\app\\features\\auth\\login\\login.component.html"
timestamp: 2026-09-20T18-50-30Z
slug: src-app-features-auth-login-login-component-html
closed: true
---
Method: dual-agent (A: a5179802fa3627ea7 · B: a578cdda065077e39)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good spinner + "Ingresando…" state; focus feedback is only a subtle border-color shift, easy to lose on the animated background |
| 2 | Match Between System and Real World | 3 | Spanish domain terms are correct, but nothing visually or verbally ties the screen to appliance repair specifically |
| 3 | User Control and Freedom | 2 | "¿Olvidaste tu contraseña?" and "Regístrate" are both dead `href="#"` links — no real exit |
| 4 | Consistency and Standards | 3 | Floating-label pattern and button styling are internally consistent |
| 5 | Error Prevention | 3 | Validators exist, but the 6-character password minimum isn't disclosed until after a failed attempt |
| 6 | Recognition Rather Than Recall | 3 | Labels stay visible; the password-toggle icon has no accessible name |
| 7 | Flexibility and Efficiency of Use | 2 | `autocomplete` attributes help; no other accelerators (remember-me, etc.) |
| 8 | Aesthetic and Minimalist Design | 3 | Clean and uncluttered, but generically clean rather than purposefully minimal |
| 9 | Help Users Recognize, Diagnose, Recover from Errors | 3 | Plain-language, field-level errors that don't wipe the form; not wired to `aria-live`/`aria-describedby` |
| 10 | Help and Documentation | 1 | No help/support affordance anywhere; the only "help" link (forgot password) is a dead `#` |
| **Total** | | **26/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: This reads as a category-interchangeable dark SaaS login screen — the glassmorphic inputs, floating labels, and WebGL-gradient background are the exact template you'd find fronting any dev-tool or B2B product. Nothing in the copy, iconography, or color signals "home appliance repair." The one line of domain copy ("gestionar tus citas y servicios técnicos") is rendered at `text-sm text-white/60` — low-emphasis, easy to skip — and the 24×24 logo mark is an abstract wrench/bolt squiggle, ambiguous at best. Strip the "AppoinTech" wordmark and this could front any product. Per PRODUCT.md, this project is judged on coherent, demonstrable craft for a home-appliance-repair scheduling business; the opportunity to visually assert that identity is left on the table.

**Deterministic scan**: The bundled detector (`impeccable detect --json`) returned **zero findings** on `login.component.html` — clean across the default run, `--no-config`, directory-target, and text-mode reruns. No config-level rule suppression is hiding anything (`.impeccable/config.local.json` only holds hook consent). This is a case where the automated scan is clean but the substantive design issues (generic identity, dead links, missing accessible names) are exactly the kind of judgment-level findings a rule-based detector isn't built to catch — the two assessments disagree in a meaningful way, not a contradictory one.

**Visual overlays**: Not available this run — no browser automation tool is exposed in this session, so no live-page injection or `[Human]`-tab overlay was possible. Both assessments worked from source/markup only; treat the visual read as inferred from Tailwind classes and DOM structure, not a rendered screenshot.

## Overall Impression

The craft fundamentals are genuinely good — the floating-label pattern is implemented correctly and accessibly, validation copy is specific and non-technical, and submit state is handled honestly. But the screen doesn't yet know what product it belongs to, and two of its exit paths are dead links. The biggest opportunity: turn this from "a nice generic auth screen" into something that unmistakably reads as AppoinTech's repair-scheduling product, while closing the trust gaps (dead links, unlabeled controls) that hit hardest on a first-touch screen with no built-up trust yet.

## What's Working

- **Floating-label inputs** use the `peer`/`peer-placeholder-shown`/`peer-focus` Tailwind chain correctly, with real `<label for>` elements rather than decorative placeholders — accessible by construction, not just by appearance.
- **Field-specific, plain-language validation** ("Ingresa tu correo.", "Debe tener al menos 6 caracteres.") avoids generic "Invalid input" messages — a real win for error recovery.
- **Honest submit-state handling** — the `cargando` flag disables the button and shows a spinner + "Ingresando…", preventing double-submits and confirming what's happening.

## Priority Issues

**[P1] Dead placeholder links on the two most likely exit paths**
- **Why it matters**: "¿Olvidaste tu contraseña?" and "Regístrate" both point to `href="#"` with no route or handler. A user who clicks either gets silent failure — exactly the two actions a stuck or new user reaches for first, and exactly the wrong moment for the product to feel unfinished.
- **Fix**: Wire real routes/handlers, or — if not built yet — mark them "próximamente" the same honest way the Microsoft button already is, so the gap reads as intentional rather than broken.
- **Suggested command**: `/impeccable harden`

**[P1] Icon-only controls and errors with no accessible name**
- **Why it matters**: The password-toggle button (`alternarContrasena`) has no `aria-label`/`aria-pressed`, so a screen-reader user can't tell what the eye icon does. The error `<p>` elements aren't wired via `aria-describedby`, and the error banner has no `aria-live`, so state changes go unannounced.
- **Fix**: Add `aria-label="Mostrar contraseña"` / `aria-pressed` to the toggle button; link each input to its error text with `aria-describedby`; add `aria-live="polite"` to the error banner.
- **Suggested command**: `/impeccable harden`

**[P2] Unthrottled ambient motion with no reduced-motion guard**
- **Why it matters**: `GradientWavesComponent` runs a continuous RAF loop with mouse-tracked parallax and film grain, with no `prefers-reduced-motion` check in `gradient-waves.component.ts`. On a screen whose entire job is "log in," constant motion competes with the task and costs vestibular-sensitive users and older/low-power devices unnecessarily.
- **Fix**: Check `matchMedia('(prefers-reduced-motion: reduce)')` and disable parallax/pause the loop (or fall back to a static gradient) when it matches.
- **Suggested command**: `/impeccable polish`

**[P2] Generic visual identity with no tie to appliance repair**
- **Why it matters**: Nothing about color, iconography, or copy signals this is a home-appliance-repair scheduling product rather than a generic SaaS tool — a missed opportunity specifically because this project is evaluated on demonstrable, coherent craft for that exact business.
- **Fix**: Give the brand mark or accent color a domain-specific tie (an appliance/technician motif, a warmer secondary color against the cool navy), and let the subtitle copy lead with the service rather than a generic "welcome back" greeting.
- **Suggested command**: `/impeccable shape`

**[P3] Password rule undisclosed until failure**
- **Why it matters**: The 6-character minimum only surfaces after a failed attempt, forcing an avoidable error cycle.
- **Fix**: Add a static hint under the password field stating the minimum up front.
- **Suggested command**: `/impeccable clarify`

## Persona Red Flags

**Jordan (Confused First-Timer)**: Clicks "¿Olvidaste tu contraseña?" expecting help — nothing happens, no page change, no error. She can't tell if the app is broken. If login fails for a non-401 reason, the generic message ("No fue posible iniciar sesión…") gives her no next action either.

**Sam (Accessibility-Dependent User)**: The eye-icon password toggle announces only as an unlabeled "button" to a screen reader. The focus indicator is a faint border-color shift on a moving dark background, easy to lose while tabbing. Several text layers sit at `white/30`–`white/40` opacity, risking a WCAG AA contrast failure.

**Doña Marta (project-specific — LatAm homeowner, low tech literacy)**: The always-on WebGL shader is compute/battery-heavy on a budget phone, and first paint gives her only a low-contrast subtitle line to confirm she's in the right place to fix her washing machine. The disabled Microsoft button's hover-only tooltip is invisible on a touchscreen, so tapping it explains nothing.

## Minor Observations

- `title="Disponible próximamente"` on the Microsoft button is a hover-only tooltip, redundant with the already-visible `(próximamente)` text and useless on touch devices.
- The "o" divider text at `text-white/30` is close to illegible — worth confirming that's intentional for a pure visual divider rather than meaningful content.
- No email trimming/whitespace guard before submission.

## Questions to Consider

- If you swapped the "AppoinTech" wordmark for any other SaaS name, would anything else on this screen need to change? What's the smallest change that makes it unmistakably a repair-scheduling product?
- Is the always-on parallax/grain shader earning its battery and attention cost on a screen whose only job is getting the user logged in fast?
- Were the two `href="#"` links a placeholder oversight, or should they be marked "próximamente" like the Microsoft button so users don't lose trust clicking a dead link?
