/* ==========================================================================
   Dashboard / shipments table page
   ========================================================================== */

const state = {
  page: 1,
  perPage: 20,
  sortKey: null,
  sortDir: 1,
  search: "",
  carriers: new Set(),
  statuses: new Set(),
  serviceLevels: new Set(),
  severities: new Set(),
  selected: new Set(),
  dateDay: null,
  activeViewId: null,
};

/** Extracts the July day number from an eta string like "Jul 9". */
function shipmentEtaDay(eta) {
  const match = eta && eta.match(/Jul\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/** Archived ids live outside ALL_SHIPMENTS so the undo action can restore them instantly. */
const ARCHIVED = new Set();

const tbody = document.getElementById("table-body");
const emptyState = document.getElementById("empty-state");

function skeletonRows(n = 8) {
  let html = "";
  for (let i = 0; i < n; i++) {
    html += `<tr>${Array.from({ length: 9 }).map(() =>
      `<td><div class="skeleton" style="height:14px;width:${60 + Math.random() * 40}%"></div></td>`
    ).join("")}</tr>`;
  }
  return html;
}

function getFiltered() {
  const q = state.search.trim().toLowerCase();
  let rows = ALL_SHIPMENTS.filter((s) => {
    if (ARCHIVED.has(s.id)) return false;
    if (state.carriers.size > 0 && !state.carriers.has(s.carrier)) return false;
    if (state.statuses.size > 0 && !state.statuses.has(s.status)) return false;
    if (state.serviceLevels.size > 0 && !state.serviceLevels.has(s.serviceLevel)) return false;
    if (state.severities.size > 0 && !state.severities.has(s.severity)) return false;
    if (state.dateDay !== null && shipmentEtaDay(s.eta) !== state.dateDay) return false;
    if (q && !(s.tracking.toLowerCase().includes(q) || s.customer.toLowerCase().includes(q) || s.destination.toLowerCase().includes(q))) return false;
    return true;
  });
  if (state.sortKey) {
    rows = [...rows].sort((a, b) => (a[state.sortKey] > b[state.sortKey] ? 1 : -1) * state.sortDir);
  }
  return rows;
}

function renderMetrics() {
  if (typeof ALL_SHIPMENTS === "undefined") return;
  const inTransit = ALL_SHIPMENTS.filter(s => s.status === STATUS.IN_TRANSIT && !ARCHIVED.has(s.id)).length;
  const delivered = ALL_SHIPMENTS.filter(s => s.status === STATUS.DELIVERED && !ARCHIVED.has(s.id)).length;
  const delayed = ALL_SHIPMENTS.filter(s => s.status === STATUS.DELAYED && !ARCHIVED.has(s.id)).length;
  const exceptions = ALL_SHIPMENTS.filter(s => s.status === STATUS.EXCEPTION && !ARCHIVED.has(s.id)).length;
  const pending = ALL_SHIPMENTS.filter(s => s.status === STATUS.PENDING && !ARCHIVED.has(s.id)).length;

  const mInTransit = document.getElementById("metric-in-transit");
  const mDelivered = document.getElementById("metric-delivered");
  const mDelayed = document.getElementById("metric-delayed");
  const mExceptions = document.getElementById("metric-exceptions");
  const mPending = document.getElementById("metric-pending");

  if (mInTransit) mInTransit.textContent = inTransit.toLocaleString();
  if (mDelivered) mDelivered.textContent = delivered.toLocaleString();
  if (mDelayed) mDelayed.textContent = delayed.toLocaleString();
  if (mExceptions) mExceptions.textContent = exceptions.toLocaleString();
  if (mPending) mPending.textContent = pending.toLocaleString();
}

function renderTable(highlightId = null) {
  tbody.innerHTML = skeletonRows(6);
  emptyState.style.display = "none";

  const filtered = getFiltered();
  delay(filtered, 260).then((rows) => {
    renderMetrics();
    updateSortHeaders();

    const start = (state.page - 1) * state.perPage;
    const pageRows = rows.slice(start, start + state.perPage);

    if (rows.length === 0) {
      tbody.innerHTML = "";
      emptyState.style.display = "flex";
      document.getElementById("page-label").textContent = "Showing 0 of 0";
      const btnPrevTop = document.getElementById("btn-prev-top");
      if (btnPrevTop) btnPrevTop.disabled = true;
      const btnNextTop = document.getElementById("btn-next-top");
      if (btnNextTop) btnNextTop.disabled = true;
      return;
    }
    emptyState.style.display = "none";

    tbody.innerHTML = pageRows.map((s) => `
      <tr data-id="${s.id}" tabindex="0" role="button" aria-label="Open ${s.id}, ${s.status}" class="${s.id === highlightId ? "row-highlight" : ""}">
        <td onclick="event.stopPropagation()"><input type="checkbox" class="row-check" data-id="${s.id}" ${state.selected.has(s.id) ? "checked" : ""} aria-label="Select ${s.id}" /></td>
        <td class="mono">${escapeHtml(s.tracking)}</td>
        <td class="ellipsis">${escapeHtml(s.customer)}</td>
        <td class="text-secondary">${s.carrier}</td>
        <td><span class="badge ${statusBadgeClass(s.status)}"><span class="sw"></span>${s.status}</span></td>
        <td class="ellipsis text-secondary">${escapeHtml(s.destination)}</td>
        <td class="text-secondary">${s.eta}</td>
        <td class="text-muted">${s.updated}</td>
        <td><i class="ti ti-chevron-right text-muted" aria-hidden="true"></i></td>
      </tr>`).join("");

    const end = Math.min(start + state.perPage, rows.length);
    const labelText = `Showing ${start + 1}\u2013${end} of ${rows.length}`;
    document.getElementById("page-label").textContent = labelText;

    const isPrevDisabled = state.page === 1;
    const isNextDisabled = end >= rows.length;

    document.getElementById("btn-prev").disabled = isPrevDisabled;
    document.getElementById("btn-next").disabled = isNextDisabled;

    const btnPrevTop = document.getElementById("btn-prev-top");
    if (btnPrevTop) btnPrevTop.disabled = isPrevDisabled;
    const btnNextTop = document.getElementById("btn-next-top");
    if (btnNextTop) btnNextTop.disabled = isNextDisabled;

    tbody.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", () => openQuickView(tr.dataset.id));
    });
    tbody.querySelectorAll(".row-check").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        e.target.checked ? state.selected.add(cb.dataset.id) : state.selected.delete(cb.dataset.id);
        updateBulkBar();
      });
    });

    if (highlightId) {
      setTimeout(() => {
        const row = tbody.querySelector(`tr[data-id="${highlightId}"]`);
        if (row) row.classList.remove("row-highlight");
      }, 2000);
    }
  });
}

function updateBulkBar() {
  const bar = document.getElementById("bulk-bar");
  const count = state.selected.size;
  bar.classList.toggle("visible", count > 0);
  document.getElementById("bulk-count").textContent = `${count} selected`;
}

function openQuickView(id) {
  const s = ALL_SHIPMENTS.find((x) => x.id === id);
  if (!s) return;
  document.getElementById("qv-title").textContent = s.id;
  document.getElementById("qv-body").innerHTML = `
    <span class="badge ${statusBadgeClass(s.status)} mb-3"><span class="sw"></span>${s.status}</span>
    <div class="kv-row"><span class="k">Tracking no.</span><span class="v mono">${escapeHtml(s.tracking)}</span></div>
    <div class="kv-row"><span class="k">Customer</span><span class="v">${escapeHtml(s.customer)}</span></div>
    <div class="kv-row"><span class="k">Carrier</span><span class="v">${s.carrier}</span></div>
    <div class="kv-row"><span class="k">Destination</span><span class="v">${escapeHtml(s.destination)}</span></div>
    <div class="kv-row"><span class="k">ETA</span><span class="v">${s.eta}</span></div>
    <div class="kv-row"><span class="k">Weight</span><span class="v">${s.weight}</span></div>
    <div class="kv-row"><span class="k">Declared value</span><span class="v">${s.value}</span></div>
  `;

  const fdBtn = document.getElementById("btn-qv-full-detail");
  if (fdBtn) {
    fdBtn.onclick = () => {
      location.href = `shipment-detail.html?id=${s.id}`;
    };
  }
  const noteBtn = fdBtn ? fdBtn.nextElementSibling : null;
  if (noteBtn) {
    noteBtn.onclick = () => {
      const noteText = prompt("Enter a note for this shipment:");
      if (noteText && noteText.trim()) {
        const updatedNotes = [...(s.notes || [])];
        updatedNotes.push({ text: noteText.trim(), author: "Jordan Diaz", time: "Just now" });
        updateShipment(s.id, { notes: updatedNotes });
        toast("Note added to " + s.id);
      }
    };
  }

  openDrawer("row-drawer");
}

document.getElementById("table-search").addEventListener("input", debounce((e) => {
  state.search = e.target.value; state.page = 1; renderTable();
}, 200));
// Multi-select dropdown filters helper
function setupFilterDropdown(btnId, menuId, updateFn) {
  const btn = document.getElementById(btnId);
  const menu = document.getElementById(menuId);
  if (!btn || !menu) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    // Close other menus
    document.querySelectorAll(".menu").forEach((m) => {
      if (m !== menu) m.classList.remove("open");
    });
    menu.classList.toggle("open");
  });

  menu.querySelectorAll("input[type='checkbox']").forEach((cb) => {
    cb.addEventListener("change", updateFn);
  });
}

function updateCarrierFilter() {
  const btn = document.getElementById("btn-filter-carrier");
  const menu = document.getElementById("menu-filter-carrier");
  if (!btn || !menu) return;

  state.carriers.clear();
  menu.querySelectorAll("input[type='checkbox']:checked").forEach((cb) => {
    state.carriers.add(cb.value);
  });

  if (state.carriers.size === 0) {
    btn.textContent = "All carriers";
  } else if (state.carriers.size === 1) {
    btn.textContent = Array.from(state.carriers)[0];
  } else {
    btn.textContent = `${state.carriers.size} carriers`;
  }

  updateClearButtonState();
  state.page = 1;
  renderTable();
}

function updateStatusFilter() {
  const btn = document.getElementById("btn-filter-status");
  const menu = document.getElementById("menu-filter-status");
  if (!btn || !menu) return;

  state.statuses.clear();
  menu.querySelectorAll("input[type='checkbox']:checked").forEach((cb) => {
    state.statuses.add(cb.value);
  });

  if (state.statuses.size === 0) {
    btn.textContent = "All statuses";
  } else if (state.statuses.size === 1) {
    btn.textContent = Array.from(state.statuses)[0];
  } else {
    btn.textContent = `${state.statuses.size} statuses`;
  }

  updateClearButtonState();
  state.page = 1;
  renderTable();
}

function updateClearButtonState() {
  const totalFilters = state.carriers.size + state.statuses.size + state.serviceLevels.size + state.severities.size + (state.dateDay !== null ? 1 : 0);
  const btnClear = document.getElementById("btn-clear-filters");
  if (btnClear) {
    btnClear.style.display = totalFilters > 0 ? "inline-flex" : "none";
  }
  const btnSave = document.getElementById("btn-save-current-view");
  if (btnSave) {
    btnSave.style.display = totalFilters > 0 ? "inline-flex" : "none";
  }
  if (totalFilters === 0) {
    const list = document.getElementById('saved-views-list');
    if (list) {
      list.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    }
  }
}

/** Shows the "Jul N, 2026" chip in the filter toolbar when arriving from the calendar. */
function showDateFilterChip(day) {
  const chip = document.getElementById("date-filter-chip");
  const label = document.getElementById("date-filter-label");
  if (!chip || !label) return;
  label.textContent = `Jul ${day}, 2026`;
  chip.style.display = "inline-flex";
}

function hideDateFilterChip() {
  const chip = document.getElementById("date-filter-chip");
  if (chip) chip.style.display = "none";
}

function clearDateFilter() {
  state.dateDay = null;
  hideDateFilterChip();
  history.replaceState(null, "", location.pathname);
  updateClearButtonState();
  state.page = 1;
  renderTable();
}
window.clearDateFilter = clearDateFilter;

// Arriving from the calendar: filter to the requested date. Cleared via the
// chip itself, or the toolbar's "Clear" button, like any other active filter.
(function initDateFilterFromUrl() {
  const day = parseInt(new URLSearchParams(location.search).get("date"), 10);
  if (!isNaN(day)) {
    state.dateDay = day;
    showDateFilterChip(day);
    updateClearButtonState();
  }
})();

// Setup basic filters
setupFilterDropdown("btn-filter-carrier", "menu-filter-carrier", updateCarrierFilter);
setupFilterDropdown("btn-filter-status", "menu-filter-status", updateStatusFilter);

// More Filters Popover Logic
const btnFilters = document.getElementById("btn-filters");
const menuFilters = document.getElementById("menu-filters");

if (btnFilters && menuFilters) {
  // Toggle filter panel visibility
  btnFilters.addEventListener("click", (e) => {
    e.stopPropagation();
    // Close other menus (like columns menu)
    document.querySelectorAll(".menu").forEach((m) => {
      if (m !== menuFilters) m.classList.remove("open");
    });
    menuFilters.classList.toggle("open");
  });

  menuFilters.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Apply filters action
  document.getElementById("btn-apply-filters").addEventListener("click", () => {
    state.serviceLevels.clear();
    menuFilters.querySelectorAll("input[name='serviceLevel']:checked").forEach((cb) => {
      state.serviceLevels.add(cb.value);
    });

    state.severities.clear();
    menuFilters.querySelectorAll("input[name='severity']:checked").forEach((cb) => {
      state.severities.add(cb.value);
    });

    // Update filter badge (shows count of advanced filters)
    const advancedFilters = state.serviceLevels.size + state.severities.size;
    const badge = document.getElementById("filter-badge");

    if (badge) {
      badge.textContent = advancedFilters;
      badge.style.display = advancedFilters > 0 ? "inline-block" : "none";
    }

    updateClearButtonState();
    state.page = 1;
    menuFilters.classList.remove("open");
    renderTable();
  });

  // Reset filters inside panel
  document.getElementById("btn-reset-filters").addEventListener("click", () => {
    menuFilters.querySelectorAll("input[type='checkbox']").forEach((cb) => {
      cb.checked = false;
    });
    document.getElementById("btn-apply-filters").click();
  });
}

// Clear filters action (from main toolbar button)
document.getElementById("btn-clear-filters").addEventListener("click", () => {
  state.search = "";
  state.carriers.clear();
  state.statuses.clear();
  state.serviceLevels.clear();
  state.severities.clear();
  state.dateDay = null;
  state.activeViewId = null;
  hideDateFilterChip();
  state.page = 1;
  document.getElementById("table-search").value = "";
  history.replaceState(null, "", location.pathname);

  // Uncheck all checkboxes in all filter menus
  document.querySelectorAll("#menu-filter-carrier input[type='checkbox'], #menu-filter-status input[type='checkbox'], #menu-filters input[type='checkbox']").forEach((cb) => {
    cb.checked = false;
  });

  // Reset button labels
  const btnCarrier = document.getElementById("btn-filter-carrier");
  if (btnCarrier) btnCarrier.textContent = "All carriers";
  const btnStatus = document.getElementById("btn-filter-status");
  if (btnStatus) btnStatus.textContent = "All statuses";

  // Hide badge and clear button
  const badge = document.getElementById("filter-badge");
  if (badge) {
    badge.style.display = "none";
    badge.textContent = "0";
  }
  document.getElementById("btn-clear-filters").style.display = "none";
  const btnSave = document.getElementById("btn-save-current-view");
  if (btnSave) btnSave.style.display = "none";

  renderSavedViews();
  renderTable();
});
document.getElementById("btn-prev").addEventListener("click", () => { if (state.page > 1) { state.page--; renderTable(); } });
document.getElementById("btn-next").addEventListener("click", () => { state.page++; renderTable(); });
document.getElementById("btn-prev-top")?.addEventListener("click", () => { if (state.page > 1) { state.page--; renderTable(); } });
document.getElementById("btn-next-top")?.addEventListener("click", () => { state.page++; renderTable(); });
document.getElementById("btn-refresh").addEventListener("click", function() {
  const icon = this.querySelector(".ti-refresh");
  if (icon) icon.classList.add("sf-spin");
  this.disabled = true;
  toast("Refreshing page...");
  setTimeout(() => {
    location.reload();
  }, 800);
});
document.getElementById("select-all").addEventListener("change", (e) => {
  const rows = getFiltered().slice((state.page - 1) * state.perPage, state.page * state.perPage);
  rows.forEach((s) => e.target.checked ? state.selected.add(s.id) : state.selected.delete(s.id));
  renderTable(); updateBulkBar();
});
document.querySelectorAll("th.sortable").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.sort;
    state.sortDir = state.sortKey === key ? -state.sortDir : 1;
    state.sortKey = key;
    renderTable();
  });
});

enableRowKeyboardNav("#table-body", openQuickView);

document.querySelectorAll(".bulk-bar .btn-danger").forEach((btn) => {
  btn.addEventListener("click", () => {
    const ids = Array.from(state.selected);
    if (!ids.length) return;
    ids.forEach((id) => (ARCHIVED.add(id)));
    state.selected.clear();
    renderTable();
    updateBulkBar();
    toast(`${ids.length} shipment${ids.length > 1 ? "s" : ""} archived`, {
      icon: "ti-archive",
      action: { label: "Undo", onClick: () => { ids.forEach((id) => ARCHIVED.delete(id)); renderTable(); } },
    });
  });
});

// Dynamic Saved Views Logic
function getCustomViews() {
  try {
    const raw = localStorage.getItem('shipflow_saved_views');
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading saved views from localStorage', err);
    return [];
  }
}

function saveCustomViews(views) {
  try {
    localStorage.setItem('shipflow_saved_views', JSON.stringify(views));
  } catch (err) {
    console.error('Error writing saved views to localStorage', err);
  }
}

function renderSavedViews() {
  const container = document.getElementById('saved-views-list');
  if (!container) return;

  const customViews = getCustomViews();
  let html = '';

  // Render Defaults
  html += `
    <div class="saved-view-item">
      <a class="nav-item ${state.activeViewId === 'delayed' ? 'active' : ''}" href="#" onclick="applySavedView(event, 'delayed')">
        <i class="ti ti-star" aria-hidden="true"></i>Delayed today
      </a>
    </div>
    <div class="saved-view-item">
      <a class="nav-item ${state.activeViewId === 'exceptions' ? 'active' : ''}" href="#" onclick="applySavedView(event, 'exceptions')">
        <i class="ti ti-star" aria-hidden="true"></i>Open exceptions
      </a>
    </div>
  `;

  // Render Custom Views
  customViews.forEach(view => {
    html += `
      <div class="saved-view-item" data-view-id="${view.id}">
        <a class="nav-item ${state.activeViewId === view.id ? 'active' : ''}" href="#" onclick="applySavedView(event, '${view.id}')">
          <i class="ti ti-star" aria-hidden="true"></i>${escapeHtml(view.name)}
        </a>
        <button class="btn-delete-view" onclick="deleteSavedView(event, '${view.id}')" title="Delete view">
          <i class="ti ti-trash"></i>
        </button>
      </div>
    `;
  });

  container.innerHTML = html;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function applySavedView(e, viewId) {
  if (e) e.preventDefault();
  state.activeViewId = viewId;

  // Highlight active view in sidebar
  const list = document.getElementById('saved-views-list');
  if (list) {
    list.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    let activeLink = null;
    if (e && e.currentTarget && e.currentTarget.classList.contains('nav-item')) {
      activeLink = e.currentTarget;
    } else {
      activeLink = list.querySelector(`a[onclick*="'${viewId}'"]`);
    }
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }
  
  let filters = null;
  let viewName = "";

  if (viewId === 'delayed') {
    filters = { statuses: ['Delayed'] };
    viewName = "Delayed today";
  } else if (viewId === 'exceptions') {
    filters = { statuses: ['Exception'] };
    viewName = "Open exceptions";
  } else {
    const customViews = getCustomViews();
    const customView = customViews.find(v => v.id === viewId);
    if (customView) {
      filters = customView.filters;
      viewName = customView.name;
    }
  }

  if (!filters) return;

  // Reset state to empty
  state.carriers.clear();
  state.statuses.clear();
  state.serviceLevels.clear();
  state.severities.clear();
  state.dateDay = null;
  state.search = "";

  // Apply filters
  if (filters.carriers) filters.carriers.forEach(c => state.carriers.add(c));
  if (filters.statuses) filters.statuses.forEach(s => state.statuses.add(s));
  if (filters.serviceLevels) filters.serviceLevels.forEach(sl => state.serviceLevels.add(sl));
  if (filters.severities) filters.severities.forEach(sev => state.severities.add(sev));
  if (filters.dateDay !== undefined && filters.dateDay !== null) {
    state.dateDay = filters.dateDay;
    showDateFilterChip(state.dateDay);
  } else {
    hideDateFilterChip();
  }
  if (filters.search) {
    state.search = filters.search;
  }
  
  // Update inputs in DOM
  const searchInput = document.getElementById("table-search");
  if (searchInput) {
    searchInput.value = state.search;
  }

  // Update checkmarks in Carrier & Status dropdowns
  document.querySelectorAll("#menu-filter-carrier input[type='checkbox']").forEach(cb => {
    cb.checked = state.carriers.has(cb.value);
  });
  document.querySelectorAll("#menu-filter-status input[type='checkbox']").forEach(cb => {
    cb.checked = state.statuses.has(cb.value);
  });
  // Update checkmarks in More filters menu
  document.querySelectorAll("#menu-filters input[type='checkbox']").forEach(cb => {
    cb.checked = state.serviceLevels.has(cb.value) || state.severities.has(cb.value);
  });

  // Update button text labels
  const btnCarrier = document.getElementById("btn-filter-carrier");
  if (btnCarrier) {
    if (state.carriers.size === 0) btnCarrier.textContent = "All carriers";
    else if (state.carriers.size === 1) btnCarrier.textContent = Array.from(state.carriers)[0];
    else btnCarrier.textContent = `${state.carriers.size} carriers`;
  }

  const btnStatus = document.getElementById("btn-filter-status");
  if (btnStatus) {
    if (state.statuses.size === 0) btnStatus.textContent = "All statuses";
    else if (state.statuses.size === 1) btnStatus.textContent = Array.from(state.statuses)[0];
    else btnStatus.textContent = `${state.statuses.size} statuses`;
  }

  // Update advanced filters badge
  const advancedFilters = state.serviceLevels.size + state.severities.size;
  const badge = document.getElementById("filter-badge");
  if (badge) {
    badge.textContent = advancedFilters;
    badge.style.display = advancedFilters > 0 ? "inline-block" : "none";
  }

  // Update Clear button state
  updateClearButtonState();

  state.page = 1;
  renderTable();
  toast(`Showing saved view: ${viewName}`);
}

function openSaveViewModal(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const modal = document.getElementById('save-view-modal');
  if (modal) {
    modal.classList.add('open');
    const input = document.getElementById('sv-name');
    if (input) {
      input.value = '';
      input.focus();
    }
  }
}

function submitSaveView() {
  const input = document.getElementById('sv-name');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;

  const currentFilters = {
    carriers: Array.from(state.carriers),
    statuses: Array.from(state.statuses),
    serviceLevels: Array.from(state.serviceLevels),
    severities: Array.from(state.severities),
    dateDay: state.dateDay,
    search: state.search
  };

  const customViews = getCustomViews();
  const newView = {
    id: 'view_' + Date.now(),
    name: name,
    filters: currentFilters
  };

  customViews.push(newView);
  saveCustomViews(customViews);
  state.activeViewId = newView.id;
  renderSavedViews();
  closeDrawer('save-view-modal');
  toast(`Saved view "${name}" created`);
}

let pendingDeleteViewId = null;

function deleteSavedView(e, viewId) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  const customViews = getCustomViews();
  const customView = customViews.find(v => v.id === viewId);
  if (!customView) return;

  pendingDeleteViewId = viewId;
  const nameEl = document.getElementById('delete-view-name');
  if (nameEl) nameEl.textContent = `"${customView.name}"`;

  const modal = document.getElementById('delete-view-modal');
  if (modal) {
    modal.classList.add('open');
  }
}

// Confirm Delete Event Listener
document.getElementById('btn-confirm-delete-view')?.addEventListener('click', () => {
  if (!pendingDeleteViewId) return;

  let customViews = getCustomViews();
  customViews = customViews.filter(v => v.id !== pendingDeleteViewId);
  saveCustomViews(customViews);
  
  if (state.activeViewId === pendingDeleteViewId) {
    state.activeViewId = null;
  }

  renderSavedViews();
  closeDrawer('delete-view-modal');
  toast("Saved view deleted");
  pendingDeleteViewId = null;
});

// Make sure functions are globally accessible
window.openSaveViewModal = openSaveViewModal;
window.submitSaveView = submitSaveView;
window.deleteSavedView = deleteSavedView;
window.applySavedView = applySavedView;



function updateSortHeaders() {
  document.querySelectorAll("th.sortable").forEach((th) => {
    const key = th.dataset.sort;
    const icon = th.querySelector("i");
    if (!icon) return;

    if (state.sortKey === key) {
      icon.className = state.sortDir === 1 ? "ti ti-arrow-up" : "ti ti-arrow-down";
    } else {
      icon.className = "ti ti-arrows-sort";
    }
  });
}

window.addEventListener("sf-data-updated", (e) => {
  if (e.detail && e.detail.type === "shipments") {
    renderTable(e.detail.id);
  }
});

// Columns toggle popover logic
const btnColumns = document.getElementById("btn-columns");
const columnsMenu = document.getElementById("columns-menu");
const shipmentsTable = document.getElementById("shipments-table");

if (btnColumns && columnsMenu) {
  // Toggle menu visibility
  btnColumns.addEventListener("click", (e) => {
    e.stopPropagation();
    // Close other menus
    document.querySelectorAll(".menu").forEach((m) => {
      if (m !== columnsMenu) m.classList.remove("open");
    });
    columnsMenu.classList.toggle("open");
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    document.querySelectorAll(".menu").forEach((menu) => {
      const btn = menu.previousElementSibling;
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.classList.remove("open");
      }
    });
  });

  // Load saved state from localStorage
  let hiddenCols = [];
  try {
    const savedCols = localStorage.getItem("sf-columns-hidden");
    if (savedCols) {
      hiddenCols = JSON.parse(savedCols);
    }
  } catch (err) {
    console.error("Error parsing sf-columns-hidden from localStorage", err);
  }

  // Apply saved hidden columns to table and checkboxes
  hiddenCols.forEach((colName) => {
    shipmentsTable?.classList.add(`hide-col-${colName}`);
    const checkbox = columnsMenu.querySelector(`input[data-column="${colName}"]`);
    if (checkbox) checkbox.checked = false;
  });

  // Listen for checkbox changes
  columnsMenu.querySelectorAll("input[data-column]").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const colName = cb.dataset.column;
      if (cb.checked) {
        shipmentsTable?.classList.remove(`hide-col-${colName}`);
        hiddenCols = hiddenCols.filter((c) => c !== colName);
      } else {
        shipmentsTable?.classList.add(`hide-col-${colName}`);
        if (!hiddenCols.includes(colName)) {
          hiddenCols.push(colName);
        }
      }
      localStorage.setItem("sf-columns-hidden", JSON.stringify(hiddenCols));
    });
  });
}

renderSavedViews();
renderTable();
