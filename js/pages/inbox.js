/* ==========================================================================
   Inbox Scan page — simulation logic
   ========================================================================== */

function getScannedEmails() {
  let emails = JSON.parse(localStorage.getItem("sf_scanned_emails"));
  if (!emails) {
    emails = [
      {
        id: "gmail_email_1",
        sender: "Shopify Store (order-confirm@shopify.com)",
        subject: "Your order #1842 has shipped!",
        carrier: "DHL",
        trackingNo: "DHL771100099",
        customer: "Aiko Tanaka",
        destination: "Berlin, DE",
        eta: "Jul 14",
        status: "In transit",
        email: "aiko.tanaka@gmail.com"
      },
      {
        id: "gmail_email_2",
        sender: "Amazon.com (ship-confirm@amazon.com)",
        subject: "Shipping confirmation for Amazon Order #8391",
        carrier: "FedEx",
        trackingNo: "FX229100099",
        customer: "Daniel Kim",
        destination: "Seattle, US",
        eta: "Jul 12",
        status: "In transit",
        email: "daniel.kim@gmail.com"
      },
      {
        id: "gmail_email_3",
        sender: "BestBuy Notifications (info@bestbuy.com)",
        subject: "Important update about your package tracking",
        carrier: "UPS",
        trackingNo: "1Z88A100099",
        customer: "Hannah Lindqvist",
        destination: "New York, US",
        eta: "Jul 11",
        status: "Exception",
        email: "hannah.l@gmail.com"
      }
    ];
    localStorage.setItem("sf_scanned_emails", JSON.stringify(emails));
  }
  return emails;
}

function saveScannedEmails(emails) {
  localStorage.setItem("sf_scanned_emails", JSON.stringify(emails));
}

function renderInbox() {
  const discSection = document.getElementById("inbox-disconnected");
  const connSection = document.getElementById("inbox-connected");
  const emptySection = document.getElementById("inbox-connected-empty");
  const tbody = document.getElementById("inbox-rows");
  
  if (!discSection || !connSection || !emptySection || !tbody) return;

  const connected = typeof isGmailConnected !== "undefined" && isGmailConnected();

  if (!connected) {
    discSection.style.display = "";
    connSection.style.display = "none";
  } else {
    discSection.style.display = "none";
    connSection.style.display = "block";

    const emails = getScannedEmails();

    if (emails.length === 0) {
      tbody.closest(".table-wrap").style.display = "none";
      emptySection.style.display = "flex";
    } else {
      tbody.closest(".table-wrap").style.display = "block";
      emptySection.style.display = "none";

      tbody.innerHTML = emails.map(email => `
        <tr>
          <td>
            <div style="font-weight: 500;">${escapeHTML(email.sender.split(" ")[0])}</div>
            <div class="text-muted" style="font-size: 11px;">${escapeHTML(email.sender.match(/\(([^)]+)\)/)[0] || email.sender)}</div>
          </td>
          <td>
            <div class="ellipsis" style="font-weight: 500; max-width: 320px;">${escapeHTML(email.subject)}</div>
            <div class="text-muted" style="font-size: 11px;">Detected carrier info: ${email.carrier}</div>
          </td>
          <td>
            <span style="font-weight: 500;">${email.carrier}</span>
          </td>
          <td>
            <code class="mono" style="background: var(--surface-2); padding: 2px 6px; border-radius: 4px;">${email.trackingNo}</code>
          </td>
          <td class="text-right">
            <button class="btn-sm btn-primary" onclick="importFromInbox('${email.id}')">Import</button>
          </td>
        </tr>
      `).join("");
    }
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function connectGmailFromInbox(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-inbox-connect-gmail");
  if (!btn) return;

  btn.disabled = true;
  btn.innerHTML = `<i class="ti ti-loader-2 sf-spin" aria-hidden="true" style="margin-right:6px"></i>Connecting to Gmail…`;

  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = `<img src="assets/gmail-icon.svg" alt="" aria-hidden="true" style="width:14px;height:auto;margin-right:6px" />Connect Gmail`;
    if (typeof setGmailConnected !== "undefined") {
      setGmailConnected(true);
    }
    toast("Successfully connected to Gmail!");
    renderInbox();
  }, 1200);
}

function importFromInbox(emailId) {
  const emails = getScannedEmails();
  const index = emails.findIndex(e => e.id === emailId);
  if (index === -1) return;

  const email = emails[index];
  if (typeof ALL_SHIPMENTS === "undefined" || typeof addShipment === "undefined") return;

  // Build a shipment that matches the real data model (see data.js buildShipments),
  // so it works with search, the detail page, and the exceptions queue.
  const nextNum = ALL_SHIPMENTS.length + 10000;
  const newShipment = {
    id: `SHP-${nextNum}`,
    tracking: email.trackingNo,
    customer: email.customer,
    email: email.email,
    phone: `+1 (512) 555-${String(1000 + nextNum).slice(-4)}`,
    carrier: email.carrier,
    status: email.status,
    destination: email.destination,
    origin: "Imported via Gmail",
    serviceLevel: "Standard Ground",
    eta: email.eta,
    weight: "—",
    value: "—",
    updated: "Just now",
    orderId: `#${48000 + nextNum}`,
    notes: [],
  };

  // If the email flags an exception/delay, populate the exception metadata the
  // exceptions queue and detail timeline rely on (otherwise those pages crash on
  // undefined severity/title).
  if (email.status === STATUS.EXCEPTION || email.status === STATUS.DELAYED) {
    newShipment.exceptionId = `EXC-${5000 + ALL_EXCEPTIONS.length}`;
    newShipment.title = email.status === STATUS.EXCEPTION ? "Delivery attempt failed" : "Weather delay";
    newShipment.detail = email.status === STATUS.EXCEPTION
      ? "No one available to receive the package."
      : "Regional weather is delaying carrier routes.";
    newShipment.severity = email.status === STATUS.EXCEPTION ? "high" : "low";
    newShipment.age = "0d";
    newShipment.assignedTo = "Unassigned";
  }

  addShipment(newShipment);

  if (typeof addNotification !== "undefined") {
    addNotification({
      icon: "ti-mail",
      kind: "neutral",
      title: "Imported from Gmail",
      body: `${newShipment.id} (${email.trackingNo}) was imported for ${email.customer}.`,
      time: "Just now",
      read: false,
    });
  }

  // Remove from the scanned-email list and re-render.
  emails.splice(index, 1);
  saveScannedEmails(emails);

  toast(`Imported ${email.trackingNo} → ${newShipment.id}`);
  renderInbox();
}

// Listen to updates
window.addEventListener("sf-data-updated", (e) => {
  if (e.detail && e.detail.type === "gmail") {
    renderInbox();
  }
});

// Run
document.addEventListener("DOMContentLoaded", () => {
  renderInbox();
});

window.connectGmailFromInbox = connectGmailFromInbox;
window.importFromInbox = importFromInbox;
