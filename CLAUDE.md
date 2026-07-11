# ShipFlow — Project Context for Claude

Read this file first in any new session on this repo — it should be enough to get full context without re-exploring the codebase.

## What this is

ShipFlow is a **static HTML/CSS/JS mockup** of an enterprise shipment-management dashboard (courier/logistics ops tool — think "track and manage customer shipments across carriers"). It's a design/UX prototype, not a production app: **no build step, no framework, no package.json, no dependencies to install.** Every page is a standalone `.html` file with its own inline `<style>` block for page-specific CSS, plus two shared stylesheets and a handful of shared JS files.

Persona baked into the UI: logged-in user is "Jordan Diaz", Operations manager, workspace "acme.com".

## Run it

```
python3 serve.py 9000
```
Open `http://localhost:9000`. `serve.py` is a tiny custom static server that sends `Cache-Control: no-store` so edits always show up on reload (plain `python3 -m http.server` lets browsers cache and hides changes). Double-clicking `index.html` also works since there's no build step, but a local server gives more realistic relative paths.

There is no test suite, no linter, no build/compile step. "Done" = verified visually in the browser (light + dark, desktop + narrow viewport, no console errors, no horizontal overflow).

## File map

```
index.html              Dashboard — shipment list, metric cards, filters, bulk actions, undo
shipment-detail.html    Single shipment — timeline, notes, attachments, activity
exceptions.html         Exception queue — severity, assignment, resolution
calendar.html           Delivery calendar view + metric cards
notifications.html      Notification center — read/unread, filters, full-width list
import.html             CSV import — drag/drop, progress, partial-success reporting, full-width
reports.html             Trends — on-time %, transit time, carrier performance (canvas charts)
settings.html             Profile / notifications / team / integrations, full-width
login.html                 Sign-in (SSO + email, error state)
style-guide.html            Living component reference — check here before inventing new patterns
403.html / 404.html           Dead-end states
inbox.html                     Inbox scan page

css/tokens.css            Design tokens: color, type, spacing, radius, motion, z-index
css/styles.css              Shared component library: nav, table, badges, metric cards, tabs,
                             command palette, dropdown menu, drag-drop zone, progress, charts

js/data.js                 Mock data (ALL_SHIPMENTS, ALL_EXCEPTIONS, ALL_NOTIFICATIONS) +
                             delay() helper simulating network latency. Swap this for real
                             fetch() calls to wire up a backend — page scripts already treat
                             data as async so render logic shouldn't need to change.
js/app.js                   Shared behavior: toast()/undo, drawers (openDrawer/closeDrawer),
                             offline/reconnecting banner (initConnectivity, real online/offline
                             events), sidebar active-nav highlighting, debounce()
js/command-palette.js       Global Cmd/Ctrl+K, jumps to pages or shipments, arrow-key nav.
                             New pages must be added to its PAGES array to be searchable.
js/pages/*.js                Page-specific logic (one file per page, matches page name)

assets/gmail.png, outlook.png, shopify.png   Brand icons for Settings → Integrations
serve.py                    No-cache static dev server (see Run it)
```

## Design system (css/tokens.css)

Neutral gray/black system — **color is reserved for status meaning only** (no decorative color, no gradients, no shadows beyond one subtle elevation level for floating surfaces like menus/palette/toasts).

- Surfaces: `--surface-0` (page canvas) / `--surface-1` (cards) / `--surface-2` (hover/subtle fill) / `--surface-3` (pressed)
- Text: `--text-primary` / `--text-secondary` / `--text-muted` / `--text-disabled`
- Status roles (each has `--bg-*` / `--text-*` / `--border-*`): `success`, `warning`, `danger`, `neutral`, `info`
- Primary action is monochrome black/white (`--fill-primary`), not blue
- Spacing scale (4px base): `--sp-1` (4px) through `--sp-10` (40px)
- Radius: `--radius-sm` 4px, `--radius` 6px, `--radius-lg` 10px
- Motion: 150–250ms, `ease-out` only, small translations — never decorative
- Dark mode: follows `prefers-color-scheme` automatically; force with `data-theme="dark"` on `<html>`
- RTL: `css/styles.css` has `[dir="rtl"]` overrides for sidebar/timeline; test with `dir="rtl"` on `<html>`

## Page template (every dashboard page follows this shape)

```html
<div class="app-shell">
  <aside class="sidebar">...nav with data-page attrs matching <body data-page="...">...</aside>
  <div class="main">
    <header class="topbar">...back button, title, search, notifications, avatar...</header>
    <main class="content">...page content...</main>
  </div>
</div>
<script src="js/data.js"></script>
<script src="js/app.js"></script>
<script src="js/command-palette.js"></script>
<script src="js/pages/<page>.js"></script>
```
New pages: copy this shell from an existing page, set `data-page` on `<body>` to match a sidebar nav item, and add the page to `PAGES` in `js/command-palette.js`.

## Metric card component (`.metric-card`, in css/styles.css)

Used on Dashboard, Exceptions, Calendar, Reports as `.metric-grid` / `.metric-grid-4` containers of `.metric-card` tiles. Current (final) shape — rounded corners, bordered, padded:

```html
<div class="metric-card [accent-warning|accent-danger]">
  <div class="mc-top">
    <div class="label">Metric name</div>
    <span class="mc-icon"><i class="ti ti-..." aria-hidden="true"></i></span>
  </div>
  <div class="value" id="metric-...">0</div>
  <div class="delta"><span class="trend up|down"><i class="ti ti-arrow-up-right"></i>3.1%</span>vs yesterday</div>
</div>
```
- `.accent-warning` / `.accent-danger` tint the whole card and recolor label/value/icon/trend to match (icon chip becomes transparent+outlined, `border: 0.5px solid currentColor`) — keeps color strictly meaning-bearing.
- `.trend up` / `.trend down` control arrow direction; color is contextual, not automatic — e.g. Reports' "Exception rate" trend is `up` (bad) but rendered with an inline `color: var(--text-danger)` override since an *increase* in exceptions is bad, not good. When adding new trend chips, decide "is this direction good or bad" explicitly rather than assuming up=green.
- JS-populated value IDs currently in use (fed by mock data, need real API values eventually): `metric-in-transit`, `metric-delivered`, `metric-delayed`, `metric-exceptions`, `metric-pending` (Dashboard); `count-high`, `count-medium`, `count-unassigned` (Exceptions); `metric-month-count`, `metric-today-count`, `metric-delivered-count`, `metric-attention-count` (Calendar).

## Full-width pages

`settings.html`, `notifications.html`, and `import.html` deliberately have **no `max-width` cap** on their content wrapper (`.settings-grid`, `.notif-list`, `.import-wrap` all set `max-width: none`) and **no left/right page padding beyond the shared `.content` default** — they fill the canvas like the Dashboard does, rather than sitting in a narrow centered column. If you touch these pages, preserve full-width; don't reintroduce a `max-width` cap without checking with the user first (this was an explicit, deliberate revert from an earlier narrower design — see Decisions/history below).

## Integrations pattern (settings.html → Integrations panel)

Generic connect/disconnect buttons carry `data-integration` (`outlook`/`slack`/`shopify`), `data-label`, and optional `data-config` (id of a config panel to reveal on connect), handled by `toggleIntegrationConnection()` in `js/pages/settings.js`. Gmail uses its own `toggleGmailConnection()` handler (separate because its config panel — `#gmail-config` — has different fields). State persists to `localStorage`: `sf_integration_<name>` for the generic ones, `sf_gmail_connected` for Gmail. Row status text reverts via each row's `.integration-status[data-default]` attribute. All of this is mocked — no real OAuth — swap in real auth when wiring a backend.

## What's covered beyond the happy path (already built, don't rebuild)

- Loading: skeleton rows on tables/lists, not spinners
- Empty states: distinct "no results from filter" vs "nothing yet"
- Error: inline field errors (settings, login), import row-level errors
- Partial success: import flow reports imported/duplicate/invalid counts separately
- Offline/reconnecting: real `online`/`offline` browser events drive a banner via `initConnectivity()` in `js/app.js` — wire your own sync-queue signal in there
- 403/404 as calm dead ends with a next action
- Undo: archiving shipments shows a toast with a real Undo action (see `toast()` in `js/app.js`)
- Keyboard: every table row reachable via Tab/Arrow + Enter; Cmd/Ctrl+K opens command palette anywhere; Esc closes drawers/palette/dialogs

## Wiring up a real backend (when that day comes)

Replace `js/data.js` with real `fetch()` calls returning the same shapes (`ALL_SHIPMENTS`, `ALL_EXCEPTIONS`, `ALL_NOTIFICATIONS`). Page scripts already treat data as async via `delay()`, so render logic shouldn't need to change. Connect `initConnectivity()`'s offline banner to a real sync/retry queue instead of the placeholder timing. Metric card values and Reports trend chips are currently hardcoded/mock-computed — see IDs listed above.

## Decisions & history worth knowing

- **Metric cards were redesigned** (rounded cards, `.mc-top` header row with icon chip, larger value, `.trend`/`.delta` footer) and applied consistently across Dashboard, Exceptions, Calendar, Reports.
- **A "dense mode" experiment was tried and fully reverted.** At one point square corners + zero page padding + zero grid gaps were applied globally to make things "flush," which broke Calendar/Reports layout (horizontal overflow from a border-collapse negative-margin hack) and made Settings/Notifications/Import feel cramped. The user's explicit final call: **"old rounded cards are better, revert it. and full width is good."** So: rounded cards + normal gaps everywhere, but the full-width improvement to Settings/Notifications/Import was kept. If you see any square-corner / zero-padding pattern reappear, it's regressing toward the reverted design — don't reintroduce it without asking.
- Settings/Notifications/Import were briefly given padding-free flush layouts scoped via `body[data-page="..."]`, which the user did *not* want — they wanted genuine full-width layouts, not just padding removal. Prefer "use the width well" (grids, wider lists) over "just strip padding" when touching these pages.
- Settings → Integrations panel previously showed a redundant "OAuth 2.0 secured connection" line under every row and Gmail's connected state showed "Connected · last scanned 2m ago" — both were removed for consistency (all providers now just show "Connected").
- `assets/*.png` (Gmail/Outlook/Shopify icons), `serve.py`, and `.claude/launch.json` are already committed; not experimental.
- Latest commit at time of writing: `0d0ffd6 "changes"`. Working tree was clean as of 2026-07-11.

## Working conventions in this repo

- No comments unless explaining a non-obvious *why* (see the trend-direction note above for an example of the kind of thing worth a comment).
- Match existing inline `<style>` block conventions per page rather than centralizing everything into `css/styles.css` — page-specific CSS lives in that page's `<style>` block; only truly shared components go in `css/styles.css`.
- Icons are Tabler Icons webfont (`<i class="ti ti-name" aria-hidden="true"></i>`) — check `style-guide.html` or existing pages for the icon name before guessing.
- Always verify changes in-browser (light + dark via `prefers-color-scheme` or `data-theme="dark"`, normal + narrow viewport) and check for console errors / horizontal scroll (`document.scrollingElement.scrollWidth - clientWidth`) before calling a UI change done.
- Page-level inline `<style>` blocks can silently override shared `css/styles.css` rules by cascade order — if a shared-component change isn't showing up on one page, check for a same-selector override in that page's own `<style>` block.
