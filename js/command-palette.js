/* ==========================================================================
   Command palette — available on every page via Cmd/Ctrl+K.
   Keyboard-first: type to filter, Up/Down to move, Enter to go, Esc to close.
   ========================================================================== */

(function () {
  const PAGES = [
    { label: "Dashboard", href: "index.html", icon: "ti-layout-dashboard" },
    { label: "Shipments", href: "index.html", icon: "ti-package" },
    { label: "Exceptions", href: "exceptions.html", icon: "ti-alert-triangle" },
    { label: "Notifications", href: "notifications.html", icon: "ti-bell" },
    { label: "Import shipments", href: "import.html", icon: "ti-upload" },
    { label: "Reports", href: "reports.html", icon: "ti-chart-bar" },
    { label: "Settings", href: "settings.html", icon: "ti-settings" },
  ];

  let scrim, input, results, activeIndex = 0, flatItems = [];

  function ensureBuilt() {
    if (scrim) return;
    scrim = document.createElement("div");
    scrim.className = "palette-scrim";
    scrim.id = "cmd-palette";
    scrim.innerHTML = `
      <div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="palette-input-row">
          <i class="ti ti-search" aria-hidden="true"></i>
          <input type="text" id="cmd-input" placeholder="Search shipments or jump to a page" aria-label="Command palette search" />
          <kbd>esc</kbd>
        </div>
        <div class="palette-results" id="cmd-results"></div>
        <div class="palette-footer">
          <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> navigate</span>
          <span><kbd>&crarr;</kbd> select</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>`;
    document.body.appendChild(scrim);
    input = document.getElementById("cmd-input");
    results = document.getElementById("cmd-results");

    scrim.addEventListener("click", (e) => { if (e.target === scrim) closePalette(); });
    input.addEventListener("input", () => renderResults(input.value));
    input.addEventListener("keydown", onKeydown);
  }

  function shipmentMatches(q) {
    if (!q || typeof ALL_SHIPMENTS === "undefined") return [];
    const lower = q.toLowerCase();
    return ALL_SHIPMENTS.filter((s) =>
      s.tracking.toLowerCase().includes(lower) || s.customer.toLowerCase().includes(lower)
    ).slice(0, 6);
  }

  function renderResults(q) {
    const pageMatches = PAGES.filter((p) => !q || p.label.toLowerCase().includes(q.toLowerCase()));
    const shipMatches = shipmentMatches(q);
    flatItems = [];

    let html = "";
    if (pageMatches.length) {
      html += `<div class="palette-group-label">Go to</div>`;
      html += pageMatches.map((p) => {
        const idx = flatItems.push({ type: "page", ...p }) - 1;
        return `<div class="palette-item" data-idx="${idx}"><i class="ti ${p.icon}" aria-hidden="true"></i>${p.label}</div>`;
      }).join("");
    }
    if (shipMatches.length) {
      html += `<div class="palette-group-label">Shipments</div>`;
      html += shipMatches.map((s) => {
        const idx = flatItems.push({ type: "shipment", ...s }) - 1;
        return `<div class="palette-item" data-idx="${idx}"><i class="ti ti-package" aria-hidden="true"></i>${s.tracking} — ${s.customer}<span class="meta">${s.status}</span></div>`;
      }).join("");
    }
    if (!pageMatches.length && !shipMatches.length) {
      html = `<div class="palette-group-label">No results</div>`;
    }
    results.innerHTML = html;
    activeIndex = 0;
    highlightActive();

    results.querySelectorAll(".palette-item").forEach((el) => {
      el.addEventListener("click", () => selectIndex(Number(el.dataset.idx)));
    });
  }

  function highlightActive() {
    results.querySelectorAll(".palette-item").forEach((el, i) => {
      el.classList.toggle("active", i === activeIndex);
      if (i === activeIndex) el.scrollIntoView({ block: "nearest" });
    });
  }

  function selectIndex(i) {
    const item = flatItems[i];
    if (!item) return;
    if (item.type === "page") location.href = item.href;
    else location.href = `shipment-detail.html?id=${item.id}`;
  }

  function onKeydown(e) {
    if (e.key === "Escape") { closePalette(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, flatItems.length - 1); highlightActive(); }
    if (e.key === "ArrowUp") { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); highlightActive(); }
    if (e.key === "Enter") { e.preventDefault(); selectIndex(activeIndex); }
  }

  function openPalette() {
    ensureBuilt();
    scrim.classList.add("open");
    input.value = "";
    renderResults("");
    setTimeout(() => input.focus(), 0);
  }
  function closePalette() {
    if (scrim) scrim.classList.remove("open");
  }

  document.addEventListener("keydown", (e) => {
    const isMeta = e.metaKey || e.ctrlKey;
    if (isMeta && e.key.toLowerCase() === "k") {
      e.preventDefault();
      scrim && scrim.classList.contains("open") ? closePalette() : openPalette();
    }
  });

  window.openCommandPalette = openPalette;
})();
