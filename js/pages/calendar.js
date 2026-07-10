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
        if (s.status === STATUS.DELIVERED) {
          totalDelivered++;
        }

        // Needs attention
        if (s.status === STATUS.EXCEPTION || s.status === STATUS.DELAYED) {
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
  // Headers: Sun - Sat (index 0 and 6 are weekend columns)
  const headers = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let html = headers.map((h, i) => `<div class="calendar-header-cell${(i === 0 || i === 6) ? " weekend" : ""}">${h}</div>`).join("");

  function eventClassFor(status) {
    if (status === STATUS.DELIVERED) return "event-delivered";
    if (status === STATUS.DELAYED) return "event-delayed";
    if (status === STATUS.EXCEPTION) return "event-exception";
    if (status === STATUS.PENDING) return "event-pending";
    return "event-transit";
  }

  let cellIndex = 0;
  function renderCell(dayLabel, opts = {}) {
    const isWeekend = cellIndex % 7 === 0 || cellIndex % 7 === 6;
    cellIndex++;

    const classes = ["calendar-cell"];
    if (opts.otherMonth) classes.push("other-month");
    if (isWeekend) classes.push("weekend");
    if (opts.today) classes.push("today");

    const shipments = opts.shipments || [];
    let eventsHtml = "";

    // Show up to 3 events, group the rest
    const displayCount = 3;
    const toShow = shipments.slice(0, displayCount);
    const extraCount = shipments.length - displayCount;

    toShow.forEach(s => {
      eventsHtml += `
        <div class="calendar-event ${eventClassFor(s.status)}" onclick="event.stopPropagation(); location.href='shipment-detail.html?id=${s.id}'" title="${escapeHTML(s.customer)} - ${escapeHTML(s.tracking)}">
          <span class="carrier">${s.carrier}</span> ${escapeHTML(s.customer.split(" ")[0])}
        </div>
      `;
    });

    if (extraCount > 0) {
      eventsHtml += `<div class="calendar-more">+ ${extraCount} more</div>`;
    }

    // Days that belong to this month open the shipments list filtered to that date.
    let attrs = "";
    if (!opts.otherMonth) {
      classes.push("clickable");
      attrs = ` role="button" tabindex="0" aria-label="View shipments arriving Jul ${dayLabel}"
        onclick="location.href='index.html?date=${dayLabel}'"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();location.href='index.html?date=${dayLabel}';}"`;
    }

    return `
      <div class="${classes.join(" ")}"${attrs}>
        <div class="day-num">${dayLabel}</div>
        <div class="calendar-events">${eventsHtml}</div>
      </div>
    `;
  }

  // July 1, 2026 is Wednesday, so we need 3 leading cells from June (28, 29, 30)
  [28, 29, 30].forEach(d => { html += renderCell(d, { otherMonth: true }); });

  // July days (1 to 31)
  for (let day = 1; day <= 31; day++) {
    html += renderCell(day, { shipments: shipmentsByDay[day] || [], today: day === 9 });
  }

  // Aug 1 (Saturday) to fill the 5th week row
  html += renderCell(1, { otherMonth: true });

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
