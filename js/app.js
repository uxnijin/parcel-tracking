/* ==========================================================================
   Shared app behaviors used across every page.
   ========================================================================== */

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
function openDrawer(id) {
  const scrim = document.getElementById(id);
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

/* ---------- Connectivity: offline banner + sync pill ----------
   Real usage: replace the simulateFlakyConnection() call with your actual
   sync-queue signal (e.g. a websocket status or failed-request counter). */
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

/** Renders a small sync-status pill for the topbar. state: "synced" | "syncing" | "offline" */
function renderSyncPill(state = "synced") {
  const labels = { synced: "Synced", syncing: "Syncing…", offline: "Offline" };
  return `<span class="sync-pill ${state === "offline" ? "offline" : state === "syncing" ? "syncing" : ""}"><span class="dot"></span>${labels[state]}</span>`;
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
    const syncPill = document.querySelector(".sync-pill");
    if (syncPill) {
      syncPill.className = "sync-pill syncing";
      syncPill.innerHTML = '<span class="dot"></span>Syncing…';
    }

    setTimeout(() => {
      if (syncPill) {
        syncPill.className = "sync-pill";
        syncPill.innerHTML = '<span class="dot"></span>Synced';
      }

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
