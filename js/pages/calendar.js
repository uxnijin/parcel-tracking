/* ==========================================================================
   Calendar Page — dynamic calendar generation and shipment mapping
   ========================================================================== */

function renderCalendar() {
  const container = document.getElementById("calendar-days");
  if (!container) return;

  // 1. Group shipments by day for July 2026
  const shipmentsByDay = {};
  let totalMonth = 0;
  let totalToday = 0;
  let totalDelivered = 0;
  let totalAttention = 0;

  if (typeof ALL_SHIPMENTS !== "undefined") {
    ALL_SHIPMENTS.forEach(s => {
      if (!s.eta) return;
      const match = s.eta.match(/Jul\s+(\d+)/i);
      if (match) {
        const dayNum = parseInt(match[1]);
        if (!shipmentsByDay[dayNum]) shipmentsByDay[dayNum] = [];
        shipmentsByDay[dayNum].push(s);

        totalMonth++;

        // Arriving today (Jul 9)
        if (dayNum === 9) {
          totalToday++;
        }

        // Delivered this month
        if (s.status === "Delivered") {
          totalDelivered++;
        }

        // Needs attention
        if (s.status === "Exception" || s.status === "Delayed") {
          totalAttention++;
        }
      }
    });
  }

  // Update metrics
  document.getElementById("metric-month-count").textContent = totalMonth;
  document.getElementById("metric-today-count").textContent = totalToday;
  document.getElementById("metric-delivered-count").textContent = totalDelivered;
  document.getElementById("metric-attention-count").textContent = totalAttention;

  // 2. Generate Grid HTML
  let html = "";

  // Headers: Sun - Sat
  const headers = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  html += headers.map(h => `<div class="calendar-header-cell">${h}</div>`).join("");

  // July 1, 2026 is Wednesday, so we need 3 leading cells from June (28, 29, 30)
  const leadingDays = [
    { day: 28, label: "Jun 28" },
    { day: 29, label: "Jun 29" },
    { day: 30, label: "Jun 30" }
  ];

  leadingDays.forEach(d => {
    html += `
      <div class="calendar-cell other-month">
        <div class="day-num">${d.day}</div>
      </div>
    `;
  });

  // July days (1 to 31)
  for (let day = 1; day <= 31; day++) {
    const shipments = shipmentsByDay[day] || [];
    let eventsHtml = "";

    // Show up to 3 events, group the rest
    const displayCount = 3;
    const toShow = shipments.slice(0, displayCount);
    const extraCount = shipments.length - displayCount;

    toShow.forEach(s => {
      let eventClass = "event-transit";
      if (s.status === "Delivered") eventClass = "event-delivered";
      else if (s.status === "Delayed") eventClass = "event-delayed";
      else if (s.status === "Exception") eventClass = "event-exception";
      else if (s.status === "Pending") eventClass = "event-pending";

      eventsHtml += `
        <div class="calendar-event ${eventClass}" onclick="location.href='shipment-detail.html?id=${s.id}'" title="${escapeHTML(s.customer)} - ${s.trackingNo}">
          <span style="font-weight:600;">${s.carrier}</span> ${escapeHTML(s.customer.split(" ")[0])}
        </div>
      `;
    });

    if (extraCount > 0) {
      eventsHtml += `
        <div class="text-secondary" style="font-size: 10px; font-weight: 500; padding: 2px 6px;">
          + ${extraCount} more
        </div>
      `;
    }

    // Highlight today (Jul 9)
    const isToday = (day === 9) ? "border: 2px solid var(--fill-primary); background: rgba(var(--primary-rgb), 0.03);" : "";

    html += `
      <div class="calendar-cell" style="${isToday}">
        <div class="day-num" style="${day === 9 ? 'color:var(--fill-primary)' : ''}">${day}</div>
        <div style="display:flex; flex-direction:column; gap:4px; flex:1; overflow:hidden;">
          ${eventsHtml}
        </div>
      </div>
    `;
  }

  // Aug 1 (Saturday) to fill the 5th week row
  html += `
    <div class="calendar-cell other-month">
      <div class="day-num">1</div>
    </div>
  `;

  container.innerHTML = html;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Render calendar on load
document.addEventListener("DOMContentLoaded", () => {
  renderCalendar();
});

// Sync changes
window.addEventListener("sf-data-updated", (e) => {
  if (e.detail && e.detail.type === "shipments") {
    renderCalendar();
  }
});
