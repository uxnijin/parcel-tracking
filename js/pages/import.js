/* ==========================================================================
   Import page — drag/drop upload, progress, partial-success reporting.
   Demonstrates: empty, dragover, uploading, processing, partial success,
   and error-row states for a file-import workflow.
   ========================================================================== */

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");

["dragenter", "dragover"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("dragover"); })
);
["dragleave", "drop"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("dragover"); })
);
dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) startUpload(file.name);
});
document.getElementById("browse-link").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) startUpload(fileInput.files[0].name);
});

function showStep(id) {
  document.querySelectorAll(".import-step").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function startUpload(filename) {
  document.getElementById("upload-filename").textContent = filename;
  document.getElementById("upload-status").textContent = "Uploading…";
  showStep("step-uploading");

  const bar = document.getElementById("upload-progress");
  let pct = 0;
  const tick = setInterval(() => {
    pct += Math.random() * 18 + 8;
    if (pct >= 100) {
      pct = 100;
      bar.style.width = "100%";
      clearInterval(tick);
      document.getElementById("upload-status").textContent = "Processing rows…";
      setTimeout(showResults, 700);
      return;
    }
    bar.style.width = pct + "%";
  }, 250);
}

function showResults() {
  const issues = [
    { row: 12, tracking: "FX2291533", issue: "Duplicate tracking no.", kind: "warn" },
    { row: 47, tracking: "—", issue: "Missing customer name", kind: "err" },
    { row: 88, tracking: "1Z88A0977", issue: "Duplicate tracking no.", kind: "warn" },
    { row: 103, tracking: "DHL771091", issue: "Unrecognized carrier code", kind: "err" },
    { row: 156, tracking: "FX2291602", issue: "Duplicate tracking no.", kind: "warn" },
    { row: 201, tracking: "—", issue: "Missing destination address", kind: "err" },
    { row: 244, tracking: "1Z88A1002", issue: "Duplicate tracking no.", kind: "warn" },
    { row: 390, tracking: "FX2291711", issue: "Duplicate tracking no.", kind: "warn" },
  ];
  const iconFor = { warn: "ti-alert-triangle icon-warn", err: "ti-circle-x icon-err" };
  document.getElementById("issue-rows").innerHTML = issues.map((i) => `
    <tr class="result-row">
      <td class="text-muted">${i.row}</td>
      <td class="mono">${i.tracking}</td>
      <td><i class="ti ${iconFor[i.kind]}" aria-hidden="true"></i> ${i.issue}</td>
      <td><button class="btn-sm" onclick="resolveImportRow(${i.row}, '${i.tracking}', '${i.issue}')">Fix &amp; retry</button></td>
    </tr>`).join("");
  
  addImportedShipments();
  showStep("step-results");
}

function addImportedShipments() {
  if (typeof ALL_SHIPMENTS === "undefined") return;
  const names = ["Maya Rodriguez", "Daniel Kim", "Priya Nair", "Owen Clarke", "Sara Al-Farsi", "Lucas Meyer", "Aiko Tanaka", "Ben Whitfield"];
  const cities = ["Austin, TX", "Portland, OR", "Denver, CO", "Toronto, CA", "Malmo, SE", "Osaka, JP"];
  const carriers = ["UPS", "FedEx", "DHL", "USPS"];
  
  const rand = seededRandom(99);
  const newShipments = [];
  for (let i = 0; i < 412; i++) {
    const carrier = carriers[Math.floor(rand() * carriers.length)];
    const customer = names[Math.floor(rand() * names.length)];
    const destination = cities[Math.floor(rand() * cities.length)];
    const prefix = { UPS: "1Z88A", FedEx: "FX229", DHL: "DHL771", USPS: "9400 1" }[carrier];
    const nextId = ALL_SHIPMENTS.length + 10000 + i;
    newShipments.push({
      id: `SHP-${nextId}`,
      tracking: `${prefix}${String(100000 + nextId).slice(-6)}`,
      customer,
      email: customer.toLowerCase().replace(" ", ".") + "@acme.com",
      phone: `+1 (512) 555-${String(1000 + nextId).slice(-4)}`,
      carrier,
      status: STATUS.IN_TRANSIT,
      destination,
      origin: "Imported Hub",
      serviceLevel: "Standard Ground",
      eta: `Jul ${15 + Math.floor(rand() * 10)}`,
      weight: (1.5 + rand() * 10).toFixed(1) + " kg",
      value: "$" + Math.floor(50 + rand() * 500),
      updated: "Just now",
      orderId: `#${48000 + nextId}`,
      notes: []
    });
  }

  const shipments = [...ALL_SHIPMENTS];
  shipments.unshift(...newShipments);
  if (typeof saveShipments !== "undefined") {
    saveShipments(shipments);
  }

  if (typeof addNotification !== "undefined") {
    addNotification({
      icon: "ti-file-upload",
      kind: "success",
      title: "Import finished",
      body: "412 new shipments imported successfully from file.",
      time: "Just now",
      read: false
    });
  }
}

function resolveImportRow(rowNum, tracking, issue) {
  toast(`Fixed row ${rowNum}: added missing details.`);
  // Find and remove issue row from UI
  const rows = Array.from(document.querySelectorAll("#issue-rows tr"));
  rows.forEach(r => {
    if (r.cells[0].textContent == rowNum) {
      r.remove();
    }
  });

  // Create one shipment for the fixed row
  if (typeof ALL_SHIPMENTS === "undefined") return;
  const nextId = ALL_SHIPMENTS.length + 10000;
  const newShip = {
    id: `SHP-${nextId}`,
    tracking: tracking === "—" ? `FX229${String(100000 + nextId).slice(-6)}` : tracking,
    customer: "Imported Customer",
    email: "imported.customer@acme.com",
    phone: `+1 (512) 555-${String(1000 + nextId).slice(-4)}`,
    carrier: "FedEx",
    status: STATUS.IN_TRANSIT,
    destination: "Austin, TX",
    origin: "Imported Hub",
    serviceLevel: "Standard Ground",
    eta: `Jul 20`,
    weight: "5.0 kg",
    value: "$100",
    updated: "Just now",
    orderId: `#${48000 + nextId}`,
    notes: []
  };

  if (typeof addShipment !== "undefined") {
    addShipment(newShip);
  }
  toast(`Shipment ${newShip.id} added from resolved row ${rowNum}!`);
}

function resetImport() {
  document.getElementById("upload-progress").style.width = "0%";
  fileInput.value = "";
  showStep("step-upload");
}
