/* ==========================================================================
   Exceptions queue page
   ========================================================================== */

const excState = { search: "", severity: "" };
let currentException = null;

function sevLabel(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function getFilteredExceptions() {
  const q = excState.search.trim().toLowerCase();
  return ALL_EXCEPTIONS.filter((e) => {
    if (excState.severity && e.severity !== excState.severity) return false;
    if (q && !(e.tracking.toLowerCase().includes(q) || e.customer.toLowerCase().includes(q) || e.title.toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderExceptions() {
  const body = document.getElementById("exc-body");
  const empty = document.getElementById("exc-empty");
  body.innerHTML = `<tr>${Array.from({ length: 7 }).map(() => `<td><div class="skeleton" style="height:14px;width:70%"></div></td>`).join("")}</tr>`;

  const rows = getFilteredExceptions();
  delay(rows, 220).then((list) => {
    document.getElementById("count-high").textContent = ALL_EXCEPTIONS.filter(e => e.severity === "high").length;
    document.getElementById("count-medium").textContent = ALL_EXCEPTIONS.filter(e => e.severity === "medium").length;
    document.getElementById("count-unassigned").textContent = ALL_EXCEPTIONS.filter(e => !e.assignedTo || e.assignedTo === "Unassigned").length;

    if (list.length === 0) {
      body.innerHTML = "";
      empty.style.display = "flex";
      return;
    }
    empty.style.display = "none";

    body.innerHTML = list.map((e) => `
      <tr data-id="${e.exceptionId}" tabindex="0" role="button" aria-label="Open ${e.exceptionId}, ${sevLabel(e.severity)} severity">
        <td class="mono">${escapeHtml(e.tracking)}</td>
        <td class="ellipsis" style="max-width:160px">${escapeHtml(e.customer)}</td>
        <td class="ellipsis" style="max-width:260px">${escapeHtml(e.title)}</td>
        <td><span class="sev sev-${e.severity}">${sevLabel(e.severity)}</span></td>
        <td class="text-secondary">${e.carrier}</td>
        <td class="text-muted">${e.age}</td>
        <td><i class="ti ti-chevron-right text-muted" aria-hidden="true"></i></td>
      </tr>`).join("");

    body.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", () => openException(tr.dataset.id));
    });
  });
}

function openException(id) {
  const e = ALL_EXCEPTIONS.find((x) => x.exceptionId === id);
  if (!e) return;
  currentException = e;
  document.getElementById("exc-title").textContent = e.exceptionId;
  document.getElementById("exc-detail").innerHTML = `
    <span class="sev sev-${e.severity} mb-3" style="display:inline-flex">${sevLabel(e.severity)} severity</span>
    <div class="kv-row"><span class="k">Shipment</span><span class="v mono">${escapeHtml(e.tracking)}</span></div>
    <div class="kv-row"><span class="k">Customer</span><span class="v">${escapeHtml(e.customer)}</span></div>
    <div class="kv-row"><span class="k">Carrier</span><span class="v">${e.carrier}</span></div>
    <div class="kv-row"><span class="k">Reported</span><span class="v">${e.age} ago</span></div>
    <p class="mt-3 text-secondary" style="font-size:13px;line-height:1.6">${escapeHtml(e.detail)}</p>
  `;
  const assignSelect = document.getElementById("exc-assign");
  if (assignSelect) {
    assignSelect.value = e.assignedTo || "Unassigned";
  }
  const openBtn = document.getElementById("btn-exc-open-shipment");
  if (openBtn) {
    openBtn.onclick = () => {
      location.href = `shipment-detail.html?id=${e.id}`;
    };
  }
  openDrawer("exc-drawer");
}

function resolveException() {
  if (!currentException) return;
  
  if (typeof updateShipment !== "undefined") {
    updateShipment(currentException.id, {
      status: STATUS.DELIVERED,
      eta: "Delivered",
      exceptionId: undefined,
      title: undefined,
      detail: undefined,
      severity: undefined,
      age: undefined,
      assignedTo: undefined
    });
  }

  if (typeof addNotification !== "undefined") {
    addNotification({
      icon: "ti-truck-delivery",
      kind: "success",
      title: "Exception resolved",
      body: `${currentException.id} was marked as resolved and delivered.`,
      time: "Just now",
      read: false
    });
  }

  toast(`${currentException.exceptionId} resolved and delivered`);
  closeDrawer("exc-drawer");
}

document.getElementById("exc-search").addEventListener("input", debounce((e) => { excState.search = e.target.value; renderExceptions(); }, 200));
document.getElementById("exc-severity").addEventListener("change", (e) => { excState.severity = e.target.value; renderExceptions(); });

const assignSelect = document.getElementById("exc-assign");
if (assignSelect) {
  assignSelect.addEventListener("change", (e) => {
    if (currentException && typeof updateShipment !== "undefined") {
      updateShipment(currentException.id, { assignedTo: e.target.value });
      toast(`Assigned ${currentException.id} to ${e.target.value}`);
    }
  });
}

window.addEventListener("sf-data-updated", (e) => {
  if (e.detail && e.detail.type === "shipments") {
    renderExceptions();
  }
});

enableRowKeyboardNav("#exc-body", openException);

renderExceptions();
