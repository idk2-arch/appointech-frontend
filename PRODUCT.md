# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three roles share one Angular frontend, distinguished by the `rol` claim already modeled in the backend JWT:

- **Clientes** — homeowners who need appliance repair; they request/book appointments.
- **Técnicos** — repair providers with specialties; they view and manage the jobs assigned to them.
- **Administradores/staff** — manage users, scheduling, and technician specialties/assignment.

## Product Purpose

AppoinTech coordinates home-appliance repair appointments end-to-end: clients request service, technicians (matched by specialty) are assigned to jobs, and admin staff oversee scheduling and technician assignment. It is a university capstone project ("proyecto integrador"), modeling a real home-appliance-repair business and evaluated by a professor and academic committee. Success today means a coherent, working three-role scheduling system — not real-world adoption yet.

## Positioning

Not a generic appointment-booking widget: bookings are tied to technician specialties (matching the client's repair need to the right technician) and mediated by an admin layer that governs assignment. The differentiator is the specialty-matching + three-role operational model, not consumer self-scheduling alone.

## Operating Context

- Backend is real and working: Spring Boot + PostgreSQL, currently reached at a hardcoded `http://localhost:8080/api` (no environment files yet).
- Auth is JWT-based; the token is decoded client-side for role/expiry; there is no HTTP interceptor attaching it to outgoing requests yet.
- Domain language is Spanish throughout (`correo`, `contrasena`, citas, técnicos), matching the Spanish-speaking home-repair business this models.
- Evaluated by a professor/academic committee, not live customers — there is no production deployment yet.

## Capabilities and Constraints

- Confirmed and built: client login screen, wired to the real backend `/auth/login` endpoint.
- Confirmed but not yet built: appointment booking flow (client), job/schedule view (técnico), user/scheduling/specialty management (admin), registration, password recovery.
- The login screen shows a disabled "Continuar con Microsoft" button labeled "próximamente" — Microsoft SSO is a stated future intent, not a current capability.
- Constraint: keep Spanish domain language and the NgModule (non-standalone) architecture in new work.

## Brand Commitments

- Name: "AppoinTech" (confirmed, used in the login UI).
- No other binding brand commitments confirmed yet — visual identity, palette, and typography are DESIGN.md decisions, not recorded here.

## Evidence on Hand

- A real backend (Spring Boot + PostgreSQL) exists and is under active development alongside this frontend.
- No real end users, testimonials, case studies, or production data exist yet. This is pre-launch: future work must not fabricate customer evidence, reviews, or usage numbers.

## Product Principles

1. Model the three real operational roles (cliente, técnico, admin) faithfully — don't collapse them into one generic user flow.
2. Preserve Spanish domain language across new features, matching the code and the target users.
3. Treat the backend contract (Spring Boot/PostgreSQL, JWT roles) as a real constraint to build against, not a mock to redesign around.
4. This is an academic capstone judged for completeness and craft, not a growth-stage product — prioritize a coherent, demonstrable end-to-end flow over marketing/growth features unless explicitly requested.
