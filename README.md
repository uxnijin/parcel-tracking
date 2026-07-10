# ShipFlow

Enterprise shipment management UI. Static HTML/CSS/JS — no build step, no
dependencies to install. Open any page directly in a browser, or serve the
folder with any static file server.

## Run it

```
python3 -m http.server 8000
```
Then open `http://localhost:8000`. Opening `index.html` directly by
double-clicking also works, since nothing here requires a build step —
a local server just gives slightly more realistic relative paths and avoids
`file://` restrictions some browsers apply.

## Pages

```
index.html               Dashboard — shipment list, metrics, filters, bulk actions, undo
shipment-detail.html      Single shipment — timeline, notes, attachments, activity
exceptions.html           Exception queue — severity, assignment, resolution
notifications.html        Notification center — read/unread, filters
import.html                CSV import — drag/drop, progress, partial-success reporting
reports.html                Trends — on-time %, transit time, carrier performance (canvas charts)
settings.html               Profile, notification prefs, team, connected carriers
login.html                   Sign-in / first-time experience (SSO + email, error state)
style-guide.html             Living component reference: states, motion, shortcuts
403.html / 404.html          Dead-end states: permission denied, not found

css/tokens.css             Design tokens: color, type, spacing, radius, motion, z-index
css/styles.css              Component library: nav, table, badges, cards, tabs, command
                             palette, dropdown menu, drag-drop zone, progress, charts, etc.

js/data.js                  Mock data + a delay() helper that simulates network latency
js/app.js                    Shared behavior: toasts (with undo), drawers, offline/sync
                              banner, keyboard row navigation, nav highlighting
js/command-palette.js         Global Cmd/Ctrl+K — jumps to pages or shipments, arrow-key
                                navigable, available on every app page
js/pages/*.js                  Page-specific logic
```

## What's covered beyond the happy path

- **Loading** — skeleton rows on every table/list, not spinners
- **Empty** — distinct empty states for no-results-from-filter vs. nothing-yet
- **Error** — inline field errors (settings, login), import row-level errors
- **Partial success** — import flow reports imported/duplicate/invalid rows separately
- **Offline / reconnecting** — a banner appears via the real `online`/`offline` browser
  events; wire your own sync-queue signal into `initConnectivity()` in `js/app.js`
- **Permission denied / not found** — `403.html`, `404.html` as calm dead ends with a
  next action, not blank pages
- **Undo** — archiving shipments shows a toast with a real Undo action, not just a
  confirmation dialog
- **Keyboard** — every table row is reachable with Tab/Arrow keys and openable with
  Enter; Cmd/Ctrl+K opens the command palette from anywhere; Esc closes any
  drawer, palette, or dialog
- **RTL** — `css/styles.css` includes `[dir="rtl"]` overrides for the sidebar and
  timeline; add `dir="rtl"` to `<html>` to test
- **Dark mode** — follows `prefers-color-scheme` automatically; force it with
  `data-theme="dark"` on `<html>`

## Design system

- Color is functional only: gray/black for structure and chrome, green/amber/red
  for status meaning (success/warning/danger). No decorative color, no gradients,
  no shadows beyond one subtle elevation level for floating surfaces (menus,
  the command palette, toasts).
- Motion is 150–250ms, ease-out, small translations only — see `style-guide.html`
  for the token demo. Nothing animates for decoration.
- All tokens are CSS custom properties in `css/tokens.css`.

## Wiring up a real backend

Replace `js/data.js` with real fetch calls that return the same shapes
(`ALL_SHIPMENTS`, `ALL_EXCEPTIONS`, `ALL_NOTIFICATIONS`). Page scripts already
treat data as async via `delay()`, so swapping in real `fetch()` calls
shouldn't require touching the render logic. The offline banner in `js/app.js`
listens to real browser connectivity events already — connect it to your
actual sync/retry queue instead of the placeholder timing.

## Extending

- New pages: copy the `<aside class="sidebar">` / `<header class="topbar">`
  markup from any existing page to keep navigation consistent, set
  `data-page` on `<body>` to match a nav item's `data-page`, and add the page
  to the `PAGES` array in `js/command-palette.js` so it's reachable by search.
- New components: add to `css/styles.css` under the relevant section, then add
  a specimen to `style-guide.html` so the state coverage stays documented next
  to the code.
# parcel-tracking
