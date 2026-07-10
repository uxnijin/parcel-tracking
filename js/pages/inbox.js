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
    discSection.style.display = "flex";
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
    btn.innerHTML = `<i class="ti ti-brand-gmail" aria-hidden="true" style="margin-right:6px"></i>Connect Gmail`;
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

  // Import to shipments database
  if (typeof ALL_SHIPMENTS !== "undefined") {
    // Generate a random customer details since it's imported
    const newShipment = {
      id: Math.floor(100000 + Math.random() * 900000), // Random 6 digit ID
      trackingNo: email.trackingNo,
      customer: email.customer,
      carrier: email.carrier,
      status: email.status,
      destination: email.destination,
      eta: email.eta,
      updated: "Just now",
      email: email.email
    };
    
    ALL_SHIPMENTS.unshift(newShipment);
    localStorage.setItem("sf_shipments", JSON.stringify(ALL_SHIPMENTS));
    
    // Create notification
    if (typeof ALL_NOTIFICATIONS !== "undefined") {
      const newNotification = {
        id: Math.floor(100000 + Math.random() * 900000),
        shipmentId: newShipment.id,
        trackingNo: email.trackingNo,
        customer: email.customer,
        carrier: email.carrier,
        type: "import",
        message: `Imported tracking ${email.trackingNo} from connected Gmail account.`,
        time: "Just now",
        unread: true
      };
      ALL_NOTIFICATIONS.unshift(newNotification);
      localStorage.setItem("sf_notifications", JSON.stringify(ALL_NOTIFICATIONS));
    }
    
    // Remove from email scanner list
    emails.splice(index, 1);
    saveScannedEmails(emails);
    
    // Broadcast updates
    window.dispatchEvent(new CustomEvent("sf-data-updated", { detail: { type: "shipments", id: newShipment.id } }));
    
    toast(`Imported tracking ${email.trackingNo} successfully!`);
    renderInbox();
  }
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
