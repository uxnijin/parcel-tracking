/* ==========================================================================
   Mock data — swap this module for a real API client later.
   Every list function returns a Promise to mirror async fetch behavior,
   so pages already handle loading states correctly.
   ========================================================================== */

const CARRIERS = ["UPS", "FedEx", "DHL", "USPS"];

const STATUS = {
  IN_TRANSIT: "In transit",
  DELAYED: "Delayed",
  EXCEPTION: "Exception",
  DELIVERED: "Delivered",
  PENDING: "Pending pickup",
};

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildShipments(count) {
  const rand = seededRandom(42);
  const names = ["Maya Rodriguez", "Daniel Kim", "Priya Nair", "Owen Clarke", "Sara Al-Farsi",
    "Lucas Meyer", "Aiko Tanaka", "Ben Whitfield", "Elena Popescu", "Farid Haidari",
    "Grace Osei", "Hannah Lindqvist"];
  const cities = ["Austin, TX", "Portland, OR", "Berlin, DE", "Denver, CO", "Toronto, CA",
    "Lyon, FR", "Osaka, JP", "Bristol, UK", "Cluj, RO", "Kabul, AF", "Accra, GH", "Malmo, SE"];
  const origins = ["Dallas, TX", "Chicago, IL", "Atlanta, GA", "New York, NY", "Los Angeles, CA", "Seattle, WA", "Houston, TX"];
  const serviceLevels = ["Ground Saver", "Standard Ground", "Expedited Air", "Priority Overnight"];
  const statuses = [STATUS.IN_TRANSIT, STATUS.IN_TRANSIT, STATUS.IN_TRANSIT, STATUS.DELAYED,
    STATUS.EXCEPTION, STATUS.DELIVERED, STATUS.DELIVERED, STATUS.PENDING];

  const reasons = [
    { title: "Delivery attempt failed", detail: "No one available to receive the package.", severity: "high" },
    { title: "Address undeliverable", detail: "Carrier could not validate the destination address.", severity: "high" },
    { title: "Customs hold", detail: "Shipment held for customs documentation review.", severity: "medium" },
    { title: "Damaged in transit", detail: "Package reported damaged at a carrier facility.", severity: "high" },
    { title: "Lost tracking signal", detail: "No scan events received in the last 48 hours.", severity: "medium" },
    { title: "Weather delay", detail: "Regional weather is delaying carrier routes.", severity: "low" },
  ];

  const out = [];
  for (let i = 0; i < count; i++) {
    const carrier = CARRIERS[Math.floor(rand() * CARRIERS.length)];
    const status = statuses[Math.floor(rand() * statuses.length)];
    const prefix = { UPS: "1Z88A", FedEx: "FX229", DHL: "DHL771", USPS: "9400 1" }[carrier];
    const customer = names[Math.floor(rand() * names.length)];
    const email = customer.toLowerCase().replace(" ", ".") + "@acme.com";
    const phone = `+1 (512) 555-${String(1000 + i).slice(-4)}`;
    const destination = cities[Math.floor(rand() * cities.length)];
    const origin = origins[Math.floor(rand() * origins.length)];
    const serviceLevel = serviceLevels[Math.floor(rand() * serviceLevels.length)];
    const weight = (0.5 + rand() * 22).toFixed(1) + " kg";
    const value = "$" + Math.floor(20 + rand() * 900);
    const updated = `${Math.floor(rand() * 12) + 1}h ago`;
    const id = `SHP-${10000 + i}`;
    const orderId = `#${48000 + i}`;

    const notes = [];
    if (status === STATUS.EXCEPTION || status === STATUS.DELAYED) {
      notes.push({ text: "Confirmed address matches order record, no unit number missing.", author: "Jordan Diaz", time: "5h ago" });
      notes.push({ text: "Called customer — they'll be home after 5pm, rescheduled attempt for tomorrow.", author: "Priya Nair", time: "2h ago" });
    }

    const shipment = {
      id,
      tracking: `${prefix}${String(100000 + i).slice(-6)}`,
      customer,
      email,
      phone,
      carrier,
      status,
      destination,
      origin,
      serviceLevel,
      eta: status === STATUS.DELIVERED ? "Delivered" : `Jul ${8 + Math.floor(rand() * 10)}`,
      weight,
      value,
      updated,
      orderId,
      notes,
    };

    if (status === STATUS.EXCEPTION || status === STATUS.DELAYED) {
      const excIndex = out.filter(s => s.status === STATUS.EXCEPTION || s.status === STATUS.DELAYED).length;
      const r = reasons[Math.floor(rand() * reasons.length)];
      shipment.exceptionId = `EXC-${5000 + excIndex}`;
      shipment.title = r.title;
      shipment.detail = r.detail;
      shipment.severity = r.severity;
      shipment.age = `${Math.floor(rand() * 5) + 1}d`;
      shipment.assignedTo = "Unassigned";
    }

    out.push(shipment);
  }
  return out;
}

const ALL_SHIPMENTS = [];
const ALL_EXCEPTIONS = [];
const ALL_NOTIFICATIONS = [];

function buildExceptionsList() {
  return ALL_SHIPMENTS.filter(s => s.status === STATUS.EXCEPTION || s.status === STATUS.DELAYED);
}

function buildNotifications() {
  const rand = seededRandom(21);
  const types = [
    { icon: "ti-alert-triangle", kind: "danger", title: "Exception raised", body: "SHP-10032 needs review — delivery attempt failed." },
    { icon: "ti-truck-delivery", kind: "success", title: "Shipment delivered", body: "SHP-10118 was delivered to Denver, CO." },
    { icon: "ti-clock", kind: "warning", title: "ETA changed", body: "SHP-10201 is now expected 2 days later than planned." },
    { icon: "ti-message", kind: "neutral", title: "New note", body: "Priya Nair added a note to SHP-10077." },
    { icon: "ti-file-upload", kind: "neutral", title: "Import finished", body: "412 of 420 shipments imported. 8 rows need attention." },
  ];
  const out = [];
  for (let i = 0; i < 24; i++) {
    const t = types[Math.floor(rand() * types.length)];
    out.push({ id: i, ...t, time: `${Math.floor(rand() * 23) + 1}h ago`, read: rand() > 0.4 });
  }
  return out;
}

function broadcastUpdate(type, data) {
  window.dispatchEvent(new CustomEvent("sf-data-updated", { detail: { type, data } }));
}

function saveShipments(shipments) {
  // Copy first: callers may pass the live ALL_SHIPMENTS array, and clearing it
  // before spreading would wipe the source.
  const next = [...shipments];
  localStorage.setItem("sf_shipments", JSON.stringify(next));
  ALL_SHIPMENTS.length = 0;
  ALL_SHIPMENTS.push(...next);

  ALL_EXCEPTIONS.length = 0;
  ALL_EXCEPTIONS.push(...buildExceptionsList());

  broadcastUpdate("shipments", ALL_SHIPMENTS);
}

function saveNotifications(notifications) {
  // Copy first: notifications.js passes the live ALL_NOTIFICATIONS array here, so
  // clearing before spreading (without a copy) would empty it and lose every row.
  const next = [...notifications];
  localStorage.setItem("sf_notifications", JSON.stringify(next));
  ALL_NOTIFICATIONS.length = 0;
  ALL_NOTIFICATIONS.push(...next);

  broadcastUpdate("notifications", ALL_NOTIFICATIONS);
}

function updateShipment(id, updates) {
  const shipments = JSON.parse(localStorage.getItem("sf_shipments")) || [];
  const idx = shipments.findIndex(s => s.id === id);
  if (idx === -1) return null;
  
  shipments[idx] = { ...shipments[idx], ...updates };
  saveShipments(shipments);
  return shipments[idx];
}

function addShipment(shipment) {
  const shipments = JSON.parse(localStorage.getItem("sf_shipments")) || [];
  shipments.unshift(shipment);
  saveShipments(shipments);
  return shipment;
}

function addNotification(notification) {
  const notifications = JSON.parse(localStorage.getItem("sf_notifications")) || [];
  // Ensure notification has numeric or unique id
  if (notification.id === undefined) {
    notification.id = notifications.length ? Math.max(...notifications.map(n => n.id)) + 1 : 0;
  }
  notifications.unshift(notification);
  saveNotifications(notifications);
  return notification;
}

function loadDataFromStorage() {
  let shipments = JSON.parse(localStorage.getItem("sf_shipments"));
  if (!shipments) {
    shipments = buildShipments(248);
    localStorage.setItem("sf_shipments", JSON.stringify(shipments));
  }
  
  let notifications = JSON.parse(localStorage.getItem("sf_notifications"));
  if (!notifications) {
    notifications = buildNotifications();
    localStorage.setItem("sf_notifications", JSON.stringify(notifications));
  }

  ALL_SHIPMENTS.length = 0;
  ALL_SHIPMENTS.push(...shipments);

  ALL_EXCEPTIONS.length = 0;
  ALL_EXCEPTIONS.push(...buildExceptionsList());

  ALL_NOTIFICATIONS.length = 0;
  ALL_NOTIFICATIONS.push(...notifications);
}

// Perform initial load
loadDataFromStorage();

function statusBadgeClass(status) {
  switch (status) {
    case STATUS.DELIVERED: return "badge-success";
    case STATUS.DELAYED: return "badge-warning";
    case STATUS.EXCEPTION: return "badge-danger";
    default: return "badge-neutral";
  }
}

/** Simulates network latency so loading states are visible and testable. */
function delay(data, ms = 350) {
  return new Promise(resolve => setTimeout(() => resolve(data), ms));
}

function isGmailConnected() {
  return localStorage.getItem("sf_gmail_connected") === "true";
}

function setGmailConnected(val) {
  localStorage.setItem("sf_gmail_connected", val ? "true" : "false");
  window.dispatchEvent(new CustomEvent("sf-data-updated", { detail: { type: "gmail", value: val } }));
}
