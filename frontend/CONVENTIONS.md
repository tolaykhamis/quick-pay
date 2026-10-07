# QuickPay frontend conventions (Angular)

Three conventions for `frontend/`: how we write components, how we style them, and where files go.
For each one: the options we compared, the option we chose, and why. The short rule lists that Claude follows
automatically are in `.claude/skills/angular-components`, `angular-styles` and `angular-structure`. This file holds
the reasoning, so the skills stay short.

## What the choices are based on

| Fact | Where it comes from |
|---|---|
| Angular 22.2, standalone only (no NgModules in the repo), zoneless, strict TypeScript | `package.json`, `main.ts`, `app.config.ts` |
| Plain CSS. `src/styles.css` is empty, no `schematics` overrides, no UI library installed | `angular.json`, `package.json` |
| Vitest for tests, Prettier (`printWidth` 100, single quotes) | `package.json`, `.prettierrc` |
| 2025 file naming: `login.ts` holds class `Login`, no `.component.ts` suffix | existing files |
| `core/` (auth, interceptor, guard) and `features/` (`login`, `home`) already exist | `src/app/` |
| Small components keep template and styles inline in one file | `login.ts`, `home.ts` |
| The owner is new to Angular and must explain every line to a mentor | `CLAUDE.md` |

The last row matters most. When two options are close, we take the one with fewer concepts, fewer files and less
syntax to explain.

---

## 1. Component convention

### Option A: standalone or NgModule-based

| Option | For | Against |
|---|---|---|
| NgModules | Older tutorials and code use them | Extra file and extra concept per feature; legacy style; nothing in the repo uses them |
| Standalone components | The default since Angular 17 and the only style the Angular 22 guide recommends; each component lists what it uses in its own `imports`, so a file explains itself; fewer files | None that matter here |

**Chosen: standalone.** Already true of every file in the repo. We do not write `standalone: true` (it is the default).

### Option B: how to split responsibilities between components

| Option | Idea | For | Against |
|---|---|---|---|
| No separation | One component per screen does everything | Fewest files | Big templates and no reuse once a table, a form and a filter all live in one file |
| Smart/container vs dumb/presentational | Container fetches data and passes it down; dumb component only displays | Clear rule, easy to test the dumb part | A third layer for every screen is ceremony in an app with a handful of screens |
| Page/feature components vs reusable components | A routed *page* per route; small reusable pieces under it | Matches how routes work, and matches how `Login` and `Home` are already built | Needs a rule for when to extract a piece |

**Chosen: page components plus presentational components, extracted only when needed.**

- A **page component** is the one a route points to (`Login`, `Home`, later `PaymentList`). It owns the screen's state:
  it injects services, holds signals and handles events. Java comparison: a controller and its view together.
- A **presentational component** only receives data through `input()` and reports through `output()`. It injects no HTTP
  service and no router. Java comparison: a view fragment such as a Thymeleaf fragment.
- Extract a presentational component only when the same markup appears in two places, or a page template passes about
  60 lines, or a piece is self-contained (a status badge, a table row). Until then, keep it in the page.
- There is no separate "container" tier. A page is already the container.
- Components never call `HttpClient` directly. They go through a service, so the HTTP details live in one place.

### Option C: naming

| Option | Example | For | Against |
|---|---|---|---|
| Suffix style | `payment-list.component.ts`, class `PaymentListComponent` | Kind of file is visible in the name | The old style; longer names; not what `ng generate` produces in Angular 20 and later |
| 2025 style, no suffix | `payment-list.ts`, class `PaymentList` | Matches the CLI default and every file already in the repo; shorter | File name alone does not say it is a component, so folder and class name must carry the meaning |

**Chosen: 2025 style, no suffix.**

| Kind | File | Class or symbol | Selector |
|---|---|---|---|
| Page or presentational component | `payment-list.ts` | `PaymentList` | `app-payment-list` |
| Service | `payment-api.ts` | `PaymentApi` | not applicable |
| Functional guard, interceptor | `auth-guard.ts`, `auth-interceptor.ts` | `authGuard`, `authInterceptor` | not applicable |
| Test | `payment-list.spec.ts` | `describe('PaymentList', ...)` | not applicable |

The selector prefix is `app` (from `angular.json`). Name pages after the screen (`PaymentList`, `PaymentForm`) and
presentational components after the thing they show (`PaymentRow`, `StatusBadge`).

### Rules that follow (also in the `angular-components` skill)

- Create files with `ng generate` (preview with `--dry-run` first).
- Do not set `changeDetection`: `OnPush` is the default in Angular 22. Do not write `standalone: true`.
- State lives in signals (`signal`, `computed`). The app is zoneless, so a plain field would not update the screen.
- Use `inject()` instead of constructor parameters, and `input()` / `output()` instead of decorators.
- Use `@if`, `@for` (always with `track`) and `@switch`. Use the `host` object, not `@HostBinding` or `@HostListener`.
- `private readonly` for injected dependencies, `protected` for members the template reads.
- Inline `template` and `styles` when a component is small (template about 30 lines or fewer, styles about 15 or
  fewer). Otherwise give it `.html` and `.css` files beside the `.ts` file, with the same base name.
- No `any`.
- Every input has a `<label>`, buttons have an explicit `type`, and error messages use `role="alert"`.

---

## 2. Style convention

### Options

| Option | For | Against |
|---|---|---|
| Plain CSS | Already configured (`styles.css`, `*.css`); no extra syntax; modern CSS has custom properties (variables) and native nesting, which cover what a small app needs from Sass | No mixins or functions (rarely needed here) |
| SCSS | Variables, nesting, mixins | One more language to explain; switching means changing `angular.json` and regenerating components; custom properties already give us variables |
| UI library (Angular Material, PrimeNG, Bootstrap, Tailwind) | Ready-made accessible tables, dialogs, date pickers; faster screens | A large API surface the owner would have to learn and explain; theming rules of its own; a new dependency; Tailwind puts long class lists in every template |

**Chosen: plain CSS, scoped to each component, with design tokens as CSS custom properties. No UI library for now.**

Why: it is already set up, it has the fewest concepts, and the app's screens (a login form, then lists and forms) are
simple. Adding a UI library is a decision for the owner and is not done unprompted. The point to revisit it is the
payments list: if building an accessible data table or date-range picker by hand takes more effort than learning
Angular Material, raise it then.

### Rules that follow (also in the `angular-styles` skill)

- Component styles live with the component and are scoped by default (Angular's emulated encapsulation). Do not turn
  encapsulation off, and avoid `::ng-deep`.
- `src/styles.css` holds global things: custom properties on `:root` (colors, spacing, font sizes), a minimal reset
  and base typography, and the shared opt-in classes several pages reuse (`.btn`, `.table`, `.panel`, `.message`,
  `.badge`, `.form-row`, `.input`, `.page`, `.page-head`). They are class-only, so nothing restyles an element that
  did not ask for it. Page-specific styles stay in the component's own `.css` file.
- Colors and spacing come from those custom properties. Do not hard-code a hex color in a component. (The login page's
  `#b00020` predates this rule. Move it into a token when that file is next touched.)
- Class names are short kebab-case words describing the role (`.error`, `.form-row`). Scoping means no BEM is needed.
- Toggle classes and styles with bindings (`[class.error]="..."`, `[style.width.%]="..."`), not `ngClass` or `ngStyle`.
- Lay out with flexbox or grid and `rem` units. Fixed pixel widths only for `max-width`.
- Accessibility: text contrast at least 4.5:1 (WCAG AA), a visible focus outline (never remove it without a
  replacement), and never use color alone to carry meaning (the error text is also a `role="alert"` message).
- Format with Prettier (`.prettierrc`).

---

## 3. Directory convention

### Options

| Option | Layout | For | Against |
|---|---|---|---|
| Type-based | `components/`, `services/`, `models/` at the top level | Easy at first | Files that change together are far apart; every folder grows without limit |
| Feature-based | One folder per feature with everything it needs | A feature is one place; deleting or moving one is simple | Needs a rule for code that two features share |
| Feature-based plus `core/` and `shared/` | Features, plus one folder for app-wide singletons and one for shared UI | The Angular style guide's recommendation; the repo already has `core/` and `features/` | Needs the import rules below |

**Chosen: feature-based, plus `core/` and `shared/`.**

Java comparison: the backend is organized by layer (`controller`, `service`, `repository`). The frontend deliberately
is not. A UI feature's page, service and models change together, and a feature has only a few files of each kind.

```
src/app/
  core/                      app-wide singletons with no screen: auth, interceptor, guard, API error mapping
  shared/                    reusable pieces used by two or more features
    components/  pipes/  models/
  features/
    login/                   a single-screen feature: named after the screen
      login.ts
    payments/                a feature: named after the thing, plural
      payment-list.ts        pages (what a route points to) sit directly in the feature folder
      payment-form.ts
      payment-api.ts         the service that calls /api/payments
      models.ts              the interfaces for this feature's DTOs
      payments.routes.ts     only when the feature has more than one page
      components/            presentational components used only by this feature
        payment-row.ts
  app.ts  app.config.ts  app.routes.ts
```

### Where things go

| Question | Answer |
|---|---|
| A new screen or feature | `features/<name>/`. A single screen is `features/<screen>/<screen>.ts`. A CRUD feature is the plural noun (`payments`, `templates`). |
| A service for that feature | In the feature folder next to the pages that use it, named `<noun>-api.ts` for HTTP wrappers (class `<Noun>Api`). `core/auth.ts` keeps its name because it is not tied to one API noun. |
| Models (interfaces for DTOs) | One `models.ts` in the feature folder. An interface used by only one file stays in that file (as `TokenResponse` does in `core/auth.ts`). Move one into `shared/models/` only when a second feature needs it (for example the paged-list shape). |
| A reusable component | `shared/components/` once two features need it. Before that, `components/` inside the one feature, or inside the page file. |
| Something app-wide with no screen (auth, interceptors, guards, error handling) | `core/` |
| Routes | One page: `loadComponent` in `app.routes.ts`, as login and home do. More than one page: `<name>.routes.ts` in the feature folder, loaded with `loadChildren`. |
| Tests | A `.spec.ts` file next to the file it tests. |

### Rules that follow (also in the `angular-structure` skill)

- Nothing goes in `shared/` until a second feature needs it. Do not share speculatively.
- Import direction: features may import `core/` and `shared/`; `shared/` may import `core/`; `core/` imports neither;
  **a feature never imports another feature.** If two features need the same thing, it moves to `shared/` or `core/`.
- No barrel files (`index.ts`). Explicit imports are easier to trace and explain.
- Folder and file names are kebab-case.
- Always lazy-load feature routes.

---

## Relationship to the existing `angular-conventions` skill

`angular-conventions` was written before these three and overlapped with them. It has been aligned with this document:
change detection (not set, `OnPush` is the default in Angular 22), services (`@Service()`), DTO interfaces (a
`models.ts` per feature, single-use interfaces stay in their file) and the folder layout.

It still holds what this document does not cover: the teaching rules (including commenting the non-obvious "why"),
typed reactive forms, tests with Vitest, and checking the Angular CLI MCP when unsure. If the two ever disagree again,
this document wins and the skill should be corrected.
