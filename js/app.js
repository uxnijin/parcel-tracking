/* ==========================================================================
   Shared app behaviors used across every page.
   ========================================================================== */

// Theme Management
(function() {
  const savedTheme = localStorage.getItem("sf_theme") || "system";
  applyTheme(savedTheme);
})();

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
  } else if (theme === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
}
window.applyTheme = applyTheme;


/** Shows a transient toast. Pass opts.action = { label, onClick } for undo-style actions. */
function toast(message, opts = {}) {
  let region = document.querySelector(".toast-region");
  if (!region) {
    region = document.createElement("div");
    region.className = "toast-region";
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    document.body.appendChild(region);
  }
  const el = document.createElement("div");
  el.className = "toast";
  const duration = opts.duration || (opts.action ? 5000 : 2600);
  el.innerHTML = `<i class="ti ${opts.icon || "ti-check"}" aria-hidden="true"></i><span>${message}</span>`;
  if (opts.action) {
    const btn = document.createElement("button");
    btn.className = "toast-action";
    btn.textContent = opts.action.label;
    btn.addEventListener("click", () => { opts.action.onClick(); dismiss(); });
    el.appendChild(btn);
  }
  region.appendChild(el);
  function dismiss() {
    el.style.transition = "opacity 200ms ease";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 200);
  }
  const timer = setTimeout(dismiss, duration);
  el.addEventListener("mouseenter", () => clearTimeout(timer));
}

/** Opens a drawer/scrim by id, closes on scrim click or Escape. */
/** Opens a drawer/scrim by id, closes on scrim click or Escape. */
function openDrawer(id) {
  let scrim = document.getElementById(id);
  if (!scrim && id === 'new-shipment-drawer') {
    scrim = document.createElement('div');
    scrim.className = 'drawer-scrim';
    scrim.id = 'new-shipment-drawer';
    scrim.innerHTML = `
      <aside class="drawer" role="dialog" aria-label="Create new shipment" style="width: 400px; max-width: 90vw;">
        <div class="flex justify-between items-center mb-4">
          <h2 style="font-size:16px">New Shipment</h2>
          <button class="icon-btn" aria-label="Close" onclick="closeDrawer('new-shipment-drawer')"><i class="ti ti-x" aria-hidden="true"></i></button>
        </div>
        <form id="new-shipment-form" onsubmit="event.preventDefault(); createNewShipment();">
          <div class="field mt-3">
            <label for="ns-customer">Customer Name</label>
            <input type="text" id="ns-customer" required placeholder="e.g. Sarah Jenkins" />
          </div>
          <div class="field mt-3">
            <label for="ns-carrier">Carrier</label>
            <select id="ns-carrier" required>
              <option>UPS</option>
              <option>FedEx</option>
              <option>DHL</option>
              <option>USPS</option>
            </select>
          </div>
          <div class="field mt-3">
            <label for="ns-destination">Destination City/State</label>
            <input type="text" id="ns-destination" required placeholder="e.g. Miami, FL" />
          </div>
          <div class="field mt-3">
            <label for="ns-weight">Weight (kg)</label>
            <input type="number" step="0.1" id="ns-weight" required placeholder="e.g. 4.5" />
          </div>
          <div class="field mt-3">
            <label for="ns-value">Declared Value ($)</label>
            <input type="number" id="ns-value" required placeholder="e.g. 150" />
          </div>
          <div class="field mt-3">
            <label for="ns-status">Initial Status</label>
            <select id="ns-status" required>
              <option>Pending pickup</option>
              <option>In transit</option>
              <option>Delayed</option>
              <option>Exception</option>
            </select>
          </div>
          <button class="btn-primary mt-4 w-full" type="submit" style="width:100%">Create Shipment</button>
        </form>
      </aside>`;
    document.body.appendChild(scrim);
  }
  if (!scrim) return;
  scrim.classList.add("open");
  const onKey = (e) => { if (e.key === "Escape") closeDrawer(id); };
  scrim.addEventListener("click", (e) => { if (e.target === scrim) closeDrawer(id); });
  document.addEventListener("keydown", onKey, { once: true });
}
function closeDrawer(id) {
  const scrim = document.getElementById(id);
  if (scrim) scrim.classList.remove("open");
}

function createNewShipment() {
  const customer = document.getElementById("ns-customer").value.trim();
  const carrier = document.getElementById("ns-carrier").value;
  const destination = document.getElementById("ns-destination").value.trim();
  const weight = parseFloat(document.getElementById("ns-weight").value).toFixed(1) + " kg";
  const value = "$" + parseInt(document.getElementById("ns-value").value, 10);
  const status = document.getElementById("ns-status").value;

  const prefix = { UPS: "1Z88A", FedEx: "FX229", DHL: "DHL771", USPS: "9400 1" }[carrier];
  const nextNum = (typeof ALL_SHIPMENTS !== "undefined" ? ALL_SHIPMENTS.length : 100) + 10000;
  const idVal = `SHP-${nextNum}`;
  const tracking = `${prefix}${String(100000 + nextNum).slice(-6)}`;
  const orderId = `#${48000 + nextNum}`;
  const email = customer.toLowerCase().replace(" ", ".") + "@acme.com";
  const phone = `+1 (512) 555-${String(1000 + nextNum).slice(-4)}`;

  const newShip = {
    id: idVal,
    tracking,
    customer,
    email,
    phone,
    carrier,
    status,
    destination,
    origin: "Origin Facility",
    serviceLevel: "Standard Ground",
    eta: status === (typeof STATUS !== "undefined" ? STATUS.DELIVERED : "Delivered") ? "Delivered" : `Jul ${14 + Math.floor(Math.random() * 5)}`,
    weight,
    value,
    updated: "Just now",
    orderId,
    notes: [],
  };

  if (status === (typeof STATUS !== "undefined" ? STATUS.EXCEPTION : "Exception") || status === (typeof STATUS !== "undefined" ? STATUS.DELAYED : "Delayed")) {
    const excLength = typeof ALL_EXCEPTIONS !== "undefined" ? ALL_EXCEPTIONS.length : 0;
    newShip.exceptionId = `EXC-${5000 + excLength}`;
    newShip.title = status === (typeof STATUS !== "undefined" ? STATUS.EXCEPTION : "Exception") ? "Delivery attempt failed" : "Weather delay";
    newShip.detail = status === (typeof STATUS !== "undefined" ? STATUS.EXCEPTION : "Exception") ? "No one available to receive the package." : "Regional weather slowing down routing.";
    newShip.severity = status === (typeof STATUS !== "undefined" ? STATUS.EXCEPTION : "Exception") ? "high" : "low";
    newShip.age = "0d";
    newShip.assignedTo = "Unassigned";
  }

  if (typeof addShipment !== "undefined") {
    addShipment(newShip);
  }

  if (typeof addNotification !== "undefined") {
    addNotification({
      icon: "ti-plus",
      kind: "neutral",
      title: "New shipment created",
      body: `${idVal} was created for customer ${customer} going to ${destination}.`,
      time: "Just now",
      read: false
    });
  }

  document.getElementById("new-shipment-form").reset();
  closeDrawer("new-shipment-drawer");
  toast(`Shipment ${idVal} created successfully!`);
}
window.createNewShipment = createNewShipment;


/** Marks the sidebar nav item matching data-page as active. */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.page === page);
  });
});

/** Debounce helper for search inputs. */
function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/* ---------- Connectivity: offline banner ---------- */
function initConnectivity() {
  const banner = document.createElement("div");
  banner.className = "status-banner";
  banner.id = "status-banner";
  banner.style.display = "none";
  document.querySelector(".main")?.prepend(banner);

  function setOffline() {
    banner.className = "status-banner danger";
    banner.style.display = "flex";
    banner.innerHTML = `<i class="ti ti-plug-connected-x" aria-hidden="true"></i><span>You're offline. Changes are saved locally and will sync when you reconnect.</span><span class="spacer"></span>`;
  }
  function setReconnecting() {
    banner.className = "status-banner warning";
    banner.style.display = "flex";
    banner.innerHTML = `<i class="ti ti-refresh" aria-hidden="true"></i><span>Reconnecting…</span><span class="spacer"></span>`;
  }
  function setOnline() {
    banner.style.display = "none";
  }
  window.addEventListener("offline", setOffline);
  window.addEventListener("online", () => { setReconnecting(); setTimeout(setOnline, 900); });
  if (!navigator.onLine) setOffline();
}

/** Generic Up/Down/Enter navigation for a set of focusable table rows. */
function enableRowKeyboardNav(tbodySelector, onOpen) {
  const tbody = document.querySelector(tbodySelector);
  if (!tbody) return;
  tbody.addEventListener("keydown", (e) => {
    const rows = Array.from(tbody.querySelectorAll("tr[tabindex]"));
    const current = document.activeElement;
    const idx = rows.indexOf(current);
    if (e.key === "ArrowDown") { e.preventDefault(); (rows[idx + 1] || rows[0])?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); (rows[idx - 1] || rows[rows.length - 1])?.focus(); }
    if (e.key === "Enter" && idx > -1) { e.preventDefault(); onOpen(rows[idx].dataset.id); }
  });
}

function updateSidebarCounts() {
  const shipmentsItem = document.querySelector('.nav-item[data-page="shipments"] .count');
  const exceptionsItem = document.querySelector('.nav-item[data-page="exceptions"] .count');
  const notificationsItem = document.querySelector('.nav-item[data-page="notifications"] .count');
  const inboxItem = document.querySelector('.nav-item[data-page="inbox"] .count');

  if (typeof ALL_SHIPMENTS !== "undefined") {
    const activeShipmentsCount = ALL_SHIPMENTS.length;
    if (shipmentsItem) shipmentsItem.textContent = activeShipmentsCount.toLocaleString();
  }
  if (typeof ALL_EXCEPTIONS !== "undefined") {
    const exceptionsCount = ALL_EXCEPTIONS.length;
    if (exceptionsItem) exceptionsItem.textContent = exceptionsCount.toLocaleString();
  }
  if (typeof ALL_NOTIFICATIONS !== "undefined") {
    const unreadNotificationsCount = ALL_NOTIFICATIONS.filter(n => !n.read).length;
    if (notificationsItem) {
      notificationsItem.textContent = unreadNotificationsCount;
      notificationsItem.style.display = unreadNotificationsCount > 0 ? "inline-block" : "none";
    }
  }
  if (inboxItem) {
    const connected = typeof isGmailConnected !== "undefined" && isGmailConnected();
    if (connected) {
      const emails = JSON.parse(localStorage.getItem("sf_scanned_emails"));
      const count = emails ? emails.length : 3;
      inboxItem.textContent = count;
      inboxItem.style.display = count > 0 ? "inline-block" : "none";
    } else {
      inboxItem.style.display = "none";
    }
  }
}

function runSimulationTick() {
  if (Math.random() < 0.4) return;
  if (typeof ALL_SHIPMENTS === "undefined" || !ALL_SHIPMENTS.length) return;

  const eligibleShipments = ALL_SHIPMENTS.filter(s => s.status !== STATUS.DELIVERED);
  if (eligibleShipments.length === 0) return;

  const shipment = eligibleShipments[Math.floor(Math.random() * eligibleShipments.length)];
  const prevStatus = shipment.status;
  let newStatus = prevStatus;
  let eventTitle = "";
  let eventBody = "";
  let eventIcon = "";
  let eventKind = "";

  if (prevStatus === STATUS.PENDING) {
    newStatus = STATUS.IN_TRANSIT;
    eventTitle = "Shipment in transit";
    eventBody = `${shipment.id} has been picked up by the carrier and is in transit.`;
    eventIcon = "ti-truck";
    eventKind = "neutral";
  } else if (prevStatus === STATUS.IN_TRANSIT) {
    const roll = Math.random();
    if (roll < 0.7) {
      newStatus = STATUS.DELIVERED;
      eventTitle = "Shipment delivered";
      eventBody = `${shipment.id} was successfully delivered to ${shipment.destination}.`;
      eventIcon = "ti-truck-delivery";
      eventKind = "success";
    } else if (roll < 0.85) {
      newStatus = STATUS.DELAYED;
      eventTitle = "Shipment delayed";
      eventBody = `${shipment.id} encountered a delay. Revised ETA: Jul ${12 + Math.floor(Math.random() * 5)}`;
      eventIcon = "ti-clock";
      eventKind = "warning";
    } else {
      newStatus = STATUS.EXCEPTION;
      eventTitle = "Exception raised";
      eventBody = `${shipment.id} needs review — Address validation failed or delivery attempt failed.`;
      eventIcon = "ti-alert-triangle";
      eventKind = "danger";
    }
  } else if (prevStatus === STATUS.DELAYED || prevStatus === STATUS.EXCEPTION) {
    const roll = Math.random();
    if (roll < 0.5) {
      newStatus = STATUS.IN_TRANSIT;
      eventTitle = "Exception resolved";
      eventBody = `${shipment.id} is back in transit after resolving the issue.`;
      eventIcon = "ti-refresh";
      eventKind = "neutral";
    } else {
      newStatus = STATUS.DELIVERED;
      eventTitle = "Delivered (Issue resolved)";
      eventBody = `${shipment.id} was delivered following resolution of exception.`;
      eventIcon = "ti-truck-delivery";
      eventKind = "success";
    }
  }

  if (newStatus !== prevStatus) {
    setTimeout(() => {
      const updates = { status: newStatus, updated: "Just now" };
      if (newStatus === STATUS.DELIVERED) {
        updates.eta = "Delivered";
        updates.exceptionId = undefined;
        updates.title = undefined;
        updates.detail = undefined;
        updates.severity = undefined;
        updates.age = undefined;
        updates.assignedTo = undefined;
      } else if (newStatus === STATUS.EXCEPTION || newStatus === STATUS.DELAYED) {
        const reasons = [
          { title: "Delivery attempt failed", detail: "No one available to receive the package.", severity: "high" },
          { title: "Address undeliverable", detail: "Carrier could not validate the destination address.", severity: "high" },
          { title: "Customs hold", detail: "Shipment held for customs documentation review.", severity: "medium" },
          { title: "Damaged in transit", detail: "Package reported damaged at a carrier facility.", severity: "high" },
          { title: "Lost tracking signal", detail: "No scan events received in the last 48 hours.", severity: "medium" },
          { title: "Weather delay", detail: "Regional weather is delaying carrier routes.", severity: "low" },
        ];
        const r = reasons[Math.floor(Math.random() * reasons.length)];
        updates.exceptionId = shipment.exceptionId || `EXC-${5000 + Math.floor(Math.random() * 1000)}`;
        updates.title = r.title;
        updates.detail = r.detail;
        updates.severity = r.severity;
        updates.age = "0d";
        updates.assignedTo = "Unassigned";
      }

      if (typeof updateShipment !== "undefined") {
        updateShipment(shipment.id, updates);
      }

      if (typeof addNotification !== "undefined") {
        addNotification({
          icon: eventIcon,
          kind: eventKind,
          title: eventTitle,
          body: eventBody,
          time: "Just now",
          read: false
        });
      }

      toast(`${shipment.id}: ${eventTitle}`, {
        icon: eventIcon,
        duration: 4000
      });
    }, 1000);
  }
}

function startSimulation() {
  if (window.sfSimulationInterval) return;
  window.sfSimulationInterval = setInterval(runSimulationTick, 18000);
}

document.addEventListener("DOMContentLoaded", () => {
  initConnectivity();
  updateSidebarCounts();
  startSimulation();
});

window.addEventListener("sf-data-updated", () => {
  updateSidebarCounts();
});

function initGmailBanner() {
  const card = document.getElementById("dashboard-gmail-card");
  if (!card) return;
  
  const connected = typeof isGmailConnected !== "undefined" && isGmailConnected();
  if (connected) {
    card.style.display = "none";
  } else {
    card.style.display = "flex";
  }
}

function connectGmailFromBanner(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-banner-connect-gmail");
  if (!btn) return;

  btn.disabled = true;
  btn.innerHTML = `<i class="ti ti-loader-2 sf-spin" aria-hidden="true" style="margin-right:6px"></i>Connecting…`;

  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = "Connect Gmail";
    if (typeof setGmailConnected !== "undefined") {
      setGmailConnected(true);
    }
    toast("Successfully connected to Gmail!");
  }, 1200);
}

// Add init to DOM load list
document.addEventListener("DOMContentLoaded", () => {
  initGmailBanner();
});

window.addEventListener("sf-data-updated", (e) => {
  if (e.detail && e.detail.type === "gmail") {
    initGmailBanner();
  }
});

window.connectGmailFromBanner = connectGmailFromBanner;
window.initGmailBanner = initGmailBanner;

/** Formats an ISO-ish relative label — placeholder for a real date lib. */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/* ---------- Topbar tracking search: full-field lookup + live suggestions ----------
   Searches across the whole shipment record (tracking number, customer, destination,
   order id, carrier, status, origin, email, exception id/reason) and shows a
   suggestions dropdown as you type. Keyboard: ↑/↓ to move, Enter to open, Esc to close. */

/** Wraps the first case-insensitive occurrence of `query` in `text` with <mark>, escaping the rest. */
function highlightMatch(text, query) {
  const str = String(text == null ? "" : text);
  if (!query) return escapeHtml(str);
  const idx = str.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return escapeHtml(str);
  return escapeHtml(str.slice(0, idx))
    + "<mark>" + escapeHtml(str.slice(idx, idx + query.length)) + "</mark>"
    + escapeHtml(str.slice(idx + query.length));
}

/** Returns up to 8 shipments matching `rawQuery` across all fields, best matches first. */
function searchShipments(rawQuery) {
  if (typeof ALL_SHIPMENTS === "undefined") return [];
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];
  const qns = q.replace(/\s+/g, "");
  const lower = (v) => String(v == null ? "" : v).toLowerCase();

  const scored = [];
  for (const s of ALL_SHIPMENTS) {
    const trackNs = lower(s.tracking).replace(/\s+/g, "");
    let score = -1;
    if (trackNs === qns) score = 0;
    else if (trackNs.startsWith(qns)) score = 1;
    else if (trackNs.includes(qns)) score = 2;
    else {
      const fields = [s.customer, s.orderId, s.destination, s.origin, s.carrier,
        s.status, s.email, s.id, s.serviceLevel, s.exceptionId, s.title];
      if (fields.some((f) => f && lower(f).includes(q))) score = 3;
    }
    if (score !== -1) scored.push({ s, score });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, 8).map((x) => x.s);
}

function initTrackingSearch() {
  const input = document.getElementById("tracking-search");
  if (!input || typeof ALL_SHIPMENTS === "undefined") return;
  const wrap = input.closest(".topbar-track");
  if (!wrap) return;

  const panel = document.createElement("div");
  panel.className = "track-suggest";
  panel.setAttribute("role", "listbox");
  wrap.appendChild(panel);

  let results = [];
  let activeIdx = -1;

  function itemHtml(s, q, i) {
    const badgeCls = typeof statusBadgeClass !== "undefined" ? statusBadgeClass(s.status) : "badge-neutral";
    const sub = [s.customer, s.destination, s.carrier, s.orderId]
      .map((x) => highlightMatch(x, q)).join(" · ");
    return `<div class="track-suggest-item" role="option" data-idx="${i}">
        <div class="tsi-main">
          <span class="tsi-tracking mono">${highlightMatch(s.tracking, q)}</span>
          <span class="badge ${badgeCls}"><span class="sw"></span>${escapeHtml(s.status)}</span>
        </div>
        <div class="tsi-sub">${sub}</div>
      </div>`;
  }

  function render(q) {
    results = searchShipments(q);
    activeIdx = -1;
    if (!q) { close(); return; }
    if (!results.length) {
      panel.innerHTML = `<div class="track-suggest-empty">No shipments match &ldquo;${escapeHtml(q)}&rdquo;</div>`;
      panel.classList.add("open");
      return;
    }
    panel.innerHTML = `<div class="track-suggest-hint">${results.length} match${results.length > 1 ? "es" : ""}</div>`
      + results.map((s, i) => itemHtml(s, q, i)).join("");
    panel.classList.add("open");
    panel.querySelectorAll(".track-suggest-item").forEach((el) => {
      const idx = Number(el.dataset.idx);
      // mousedown (not click) so it fires before the input's blur closes the panel
      el.addEventListener("mousedown", (e) => { e.preventDefault(); go(idx); });
      el.addEventListener("mousemove", () => { activeIdx = idx; paintActive(); });
    });
  }

  function paintActive() {
    panel.querySelectorAll(".track-suggest-item").forEach((el, i) => {
      const on = i === activeIdx;
      el.classList.toggle("active", on);
      if (on) el.scrollIntoView({ block: "nearest" });
    });
  }

  function go(i) {
    const s = results[i];
    if (!s) return;
    input.value = "";
    close();
    location.href = `shipment-detail.html?id=${s.id}`;
  }

  function close() {
    panel.classList.remove("open");
    panel.innerHTML = "";
    activeIdx = -1;
  }

  input.addEventListener("input", () => render(input.value));
  input.addEventListener("focus", () => { if (input.value.trim()) render(input.value); });
  input.addEventListener("blur", () => setTimeout(close, 120));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!panel.classList.contains("open")) render(input.value);
      if (results.length) { activeIdx = Math.min(activeIdx + 1, results.length - 1); paintActive(); }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length) { activeIdx = Math.max(activeIdx - 1, 0); paintActive(); }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results.length) go(activeIdx >= 0 ? activeIdx : 0);
      else if (input.value.trim()) toast(`No shipment found for “${input.value.trim()}”`, { icon: "ti-alert-circle" });
    } else if (e.key === "Escape") {
      close();
      input.blur();
    }
  });
}

document.addEventListener("DOMContentLoaded", initTrackingSearch);

/* ---------- Notification Popover ---------- */
function initNotificationPopover() {
  const notifBtns = document.querySelectorAll('button[aria-label="Notifications"]');
  notifBtns.forEach(btn => {
    btn.removeAttribute('onclick');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleNotificationPopover(btn);
    });
  });
}

function toggleNotificationPopover(btn) {
  let popover = document.getElementById('global-notification-popover');
  if (popover) {
    const isVisible = popover.style.display !== 'none';
    popover.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
      renderPopoverNotifications(popover);
      positionPopover(popover, btn);
    }
    return;
  }

  popover = document.createElement('div');
  popover.className = 'notification-popover';
  popover.id = 'global-notification-popover';
  popover.style.display = 'flex';
  document.body.appendChild(popover);

  renderPopoverNotifications(popover);
  positionPopover(popover, btn);

  // Close on click outside
  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && !btn.contains(e.target)) {
      popover.style.display = 'none';
    }
  });
}

function positionPopover(popover, btn) {
  const rect = btn.getBoundingClientRect();
  const top = rect.bottom + window.scrollY + 8;
  const right = window.innerWidth - (rect.right + window.scrollX);
  popover.style.top = `${top}px`;
  popover.style.right = `${right}px`;
}

function renderPopoverNotifications(popover) {
  const notifications = (typeof ALL_NOTIFICATIONS !== 'undefined') ? ALL_NOTIFICATIONS : [];
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Show top 5 notifications
  const recent = notifications.slice(0, 5);

  let itemsHtml = '';
  if (recent.length === 0) {
    itemsHtml = '<div style="padding: var(--sp-4); text-align: center; color: var(--text-muted); font-size: 13px;">No notifications</div>';
  } else {
    itemsHtml = recent.map(n => {
      const iconClass = n.icon || 'ti-bell';
      return `
        <div class="notification-popover-item" onclick="event.stopPropagation(); window.location.href='notifications.html';">
          <i class="ti ${iconClass}" aria-hidden="true"></i>
          <div class="notification-popover-item-content">
            <span class="notification-popover-item-title">${escapeHtml(n.title)}</span>
            <span class="notification-popover-item-body">${escapeHtml(n.body)}</span>
            <span class="notification-popover-item-time">${escapeHtml(n.time)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  popover.innerHTML = `
    <div class="notification-popover-header">
      <span>Notifications</span>
      ${unreadCount > 0 ? `<span class="badge" style="background: var(--text-danger); color: white; padding: 2px 6px; font-size: 10px; border-radius: 10px;">${unreadCount} new</span>` : ''}
    </div>
    <div class="notification-popover-list">
      ${itemsHtml}
    </div>
    <div class="notification-popover-footer">
      <a href="notifications.html">View all notifications</a>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", initNotificationPopover);
window.addEventListener("sf-data-updated", () => {
  const popover = document.getElementById('global-notification-popover');
  if (popover && popover.style.display !== 'none') {
    renderPopoverNotifications(popover);
  }
});

