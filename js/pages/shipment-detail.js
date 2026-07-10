/* ==========================================================================
   Shipment detail page — dynamic loading, note composer, timeline generation
   ========================================================================== */

let currentShipment = null;

// Tab switcher setup
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");
  });
});

function loadShipmentDetails(s) {
  if (!s) return;
  
  // Set title
  document.getElementById("det-title").textContent = s.id;
  document.title = `${s.id} — ShipFlow`;

  // Toggle Resolve Button visibility
  const resolveBtn = document.getElementById("btn-det-resolve");
  if (resolveBtn) {
    const hasException = s.status === STATUS.EXCEPTION || s.status === STATUS.DELAYED;
    resolveBtn.style.display = hasException ? "inline-flex" : "none";
  }

  // Sidebar details
  document.getElementById("det-tracking").textContent = s.tracking;
  document.getElementById("det-order-id").textContent = s.orderId || "—";
  document.getElementById("det-weight").textContent = s.weight;
  document.getElementById("det-value").textContent = s.value;
  document.getElementById("det-service-level").textContent = s.serviceLevel || "Ground Saver";
  
  document.getElementById("det-carrier").textContent = s.carrier;
  document.getElementById("det-carrier-service").textContent = s.serviceLevel || "Ground Saver";
  document.getElementById("det-origin").textContent = s.origin || "Origin facility";
  document.getElementById("det-destination").textContent = s.destination;

  // Customer
  const custName = document.getElementById("det-cust-name");
  custName.textContent = s.customer;
  
  const initials = s.customer.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  document.getElementById("det-cust-avatar").textContent = initials;
  document.getElementById("det-cust-email").textContent = s.email;
  document.getElementById("det-cust-phone").textContent = s.phone;

  // Render notes & timeline
  renderNotes(s);
  renderTimeline(s);
}

function renderTimeline(s) {
  const container = document.getElementById("det-timeline");
  if (!container) return;

  const dest = s.destination;
  const orig = s.origin || "Origin facility";
  
  let html = "";
  if (s.status === STATUS.PENDING) {
    html = renderTimelineItem("current", "Label created", "Jul 6, 4:02 PM");
  } else if (s.status === STATUS.IN_TRANSIT) {
    html += renderTimelineItem("current", "In transit", `Jul 8, 6:15 AM · Departed ${orig} hub`);
    html += renderTimelineItem("done", "Picked up", `Jul 7, 9:30 AM · ${orig}`);
    html += renderTimelineItem("done", "Label created", "Jul 6, 4:02 PM");
  } else if (s.status === STATUS.DELIVERED) {
    html += renderTimelineItem("done", "Delivered", `Jul 9, 2:14 PM · Delivered to receiver`);
    html += renderTimelineItem("done", "Out for delivery", `Jul 9, 8:02 AM · ${dest}`);
    html += renderTimelineItem("done", "Arrived at local facility", `Jul 8, 11:40 PM · ${dest} distribution center`);
    html += renderTimelineItem("done", "In transit", `Jul 8, 6:15 AM · Departed ${orig} hub`);
    html += renderTimelineItem("done", "Picked up", `Jul 7, 9:30 AM · ${orig}`);
    html += renderTimelineItem("done", "Label created", "Jul 6, 4:02 PM");
  } else if (s.status === STATUS.DELAYED) {
    html += renderTimelineItem("exception", s.title || "Weather delay", `Jul 9, 2:14 PM · ${s.detail || "Regional weather slowing transit."}`);
    html += renderTimelineItem("current", "In transit", `Jul 8, 6:15 AM · Departed ${orig} hub`);
    html += renderTimelineItem("done", "Picked up", `Jul 7, 9:30 AM · ${orig}`);
    html += renderTimelineItem("done", "Label created", "Jul 6, 4:02 PM");
  } else if (s.status === STATUS.EXCEPTION) {
    html += renderTimelineItem("exception", s.title || "Delivery attempt failed", `Jul 9, 2:14 PM · ${s.detail || "No one available to receive the package."}`);
    html += renderTimelineItem("current", "Out for delivery", `Jul 9, 8:02 AM · ${dest}`);
    html += renderTimelineItem("done", "Arrived at local facility", `Jul 8, 11:40 PM · ${dest} distribution center`);
    html += renderTimelineItem("done", "In transit", `Jul 8, 6:15 AM · Departed ${orig} hub`);
    html += renderTimelineItem("done", "Picked up", `Jul 7, 9:30 AM · ${orig}`);
    html += renderTimelineItem("done", "Label created", "Jul 6, 4:02 PM");
  }
  
  container.innerHTML = html;
}

function renderTimelineItem(type, title, meta) {
  return `
    <div class="timeline-item ${type}">
      <div class="t-title">${escapeHtml(title)}</div>
      <div class="t-meta">${escapeHtml(meta)}</div>
    </div>`;
}

function renderNotes(s) {
  const list = document.getElementById("note-list");
  const tabLabel = document.getElementById("det-tab-notes");
  if (!list) return;

  const notes = s.notes || [];
  if (tabLabel) {
    tabLabel.innerHTML = `Notes<span class="text-muted"> · ${notes.length}</span>`;
  }

  if (notes.length === 0) {
    list.innerHTML = `<div class="text-secondary text-center py-4" style="font-size:13px">No notes yet. Add one below.</div>`;
    return;
  }

  list.innerHTML = notes.map(n => `
    <div class="note">
      <div>${escapeHtml(n.text)}</div>
      <div class="meta">${escapeHtml(n.author)} · ${escapeHtml(n.time)}</div>
    </div>
  `).join("");
}

function addNote() {
  const input = document.getElementById("note-input");
  const text = input.value.trim();
  if (!text) { toast("Write a note before adding it", { icon: "ti-alert-circle" }); return; }
  
  const notes = [...(currentShipment.notes || [])];
  notes.unshift({ text, author: "Jordan Diaz", time: "Just now" });
  
  if (typeof updateShipment !== "undefined") {
    updateShipment(currentShipment.id, { notes });
  }
  
  renderNotes(currentShipment);
  input.value = "";
  toast("Note added");
}

function resolveShipmentDetail() {
  if (!currentShipment) return;
  
  if (typeof updateShipment !== "undefined") {
    updateShipment(currentShipment.id, {
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
      body: `${currentShipment.id} was marked as resolved and delivered.`,
      time: "Just now",
      read: false
    });
  }

  toast("Exception resolved and delivered!");
}

// Initial page setup
function initPage() {
  if (typeof ALL_SHIPMENTS === "undefined" || !ALL_SHIPMENTS.length) return;
  
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  let shipment = ALL_SHIPMENTS.find(s => s.id === id);
  if (!shipment) {
    // Graceful fallback to first shipment
    shipment = ALL_SHIPMENTS[0];
  }
  
  currentShipment = shipment;
  loadShipmentDetails(shipment);
}

// Listen for updates from simulation or other tabs
window.addEventListener("sf-data-updated", (e) => {
  if (e.detail && e.detail.type === "shipments" && currentShipment) {
    const updated = ALL_SHIPMENTS.find(s => s.id === currentShipment.id);
    if (updated) {
      currentShipment = updated;
      loadShipmentDetails(updated);
    }
  }
});

// Run setup
initPage();
