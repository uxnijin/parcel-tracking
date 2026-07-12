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
      const importActions = document.getElementById("inbox-import-actions");
      if (importActions) importActions.style.display = "none";
      const toolbar = connSection.querySelector(".flex.justify-between.items-center");
      if (toolbar) {
        toolbar.style.display = "flex";
        toolbar.style.justifyContent = "flex-end";
      }
    } else {
      tbody.closest(".table-wrap").style.display = "block";
      emptySection.style.display = "none";
      const importActions = document.getElementById("inbox-import-actions");
      if (importActions) importActions.style.display = "flex";
      const toolbar = connSection.querySelector(".flex.justify-between.items-center");
      if (toolbar) {
        toolbar.style.display = "flex";
        toolbar.style.justifyContent = "space-between";
      }

      tbody.innerHTML = emails.map(email => `
        <tr>
          <td>
            <input type="checkbox" class="inbox-row-checkbox" value="${email.id}" onclick="updateBulkActionsState()" />
          </td>
          <td>
            <div style="font-weight: 500;">${escapeHTML(email.sender.split(" ")[0])}</div>
            <div class="text-muted" style="font-size: 11px;">${escapeHTML(email.sender.match(/\(([^)]+)\)/) ? email.sender.match(/\(([^)]+)\)/)[0] : email.sender)}</div>
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

      // Reset select-all checkbox
      const selectAllCheckbox = document.getElementById("select-all-inbox");
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
      }
      updateBulkActionsState();
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
    btn.innerHTML = `<img src="assets/gmail.png" alt="" aria-hidden="true" style="width:14px;height:auto;margin-right:6px" />Connect Gmail`;
    if (typeof setGmailConnected !== "undefined") {
      setGmailConnected(true);
    }
    toast("Successfully connected to Gmail!");
    renderInbox();
  }, 1200);
}

function disconnectGmailFromInbox(e) {
  e.preventDefault();
  showConfirmModal({
    title: "Disconnect Gmail",
    message: "Are you sure you want to disconnect Gmail? This will stop scanning your inbox for shipping updates.",
    confirmText: "Disconnect",
    cancelText: "Cancel",
    kind: "danger",
    onConfirm: () => {
      if (typeof setGmailConnected !== "undefined") {
        setGmailConnected(false);
      }
      toast("Successfully disconnected Gmail!");
      renderInbox();
    }
  });
}

function toggleSelectAllInbox(masterCheckbox) {
  const checkboxes = document.querySelectorAll(".inbox-row-checkbox");
  checkboxes.forEach(cb => cb.checked = masterCheckbox.checked);
  updateBulkActionsState();
}

function updateBulkActionsState() {
  const checkboxes = document.querySelectorAll(".inbox-row-checkbox");
  const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
  
  const btnImportSelected = document.getElementById("btn-import-selected");
  if (btnImportSelected) {
    btnImportSelected.disabled = selectedCount === 0;
    btnImportSelected.innerHTML = `<i class="ti ti-download" aria-hidden="true"></i>Import selected (${selectedCount})`;
  }

  const selectAllCheckbox = document.getElementById("select-all-inbox");
  if (selectAllCheckbox && checkboxes.length > 0) {
    selectAllCheckbox.checked = selectedCount === checkboxes.length;
  }
}

function executeImport(emailId, doToastAndRender = true) {
  const emails = getScannedEmails();
  const index = emails.findIndex(e => e.id === emailId);
  if (index === -1) return;

  const email = emails[index];
  if (typeof ALL_SHIPMENTS === "undefined" || typeof addShipment === "undefined") return;

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

  emails.splice(index, 1);
  saveScannedEmails(emails);

  if (doToastAndRender) {
    toast(`Imported ${email.trackingNo} → ${newShipment.id}`);
    renderInbox();
  }
}

function importFromInbox(emailId) {
  executeImport(emailId, true);
}

function importSelectedInbox() {
  const checkboxes = document.querySelectorAll(".inbox-row-checkbox:checked");
  const selectedIds = Array.from(checkboxes).map(cb => cb.value);
  if (selectedIds.length === 0) return;

  selectedIds.forEach(id => {
    executeImport(id, false);
  });

  toast(`Successfully imported ${selectedIds.length} shipments from Gmail!`);
  renderInbox();
}

function importAllInbox() {
  const emails = getScannedEmails();
  if (emails.length === 0) return;

  const count = emails.length;
  const emailIds = emails.map(e => e.id);
  emailIds.forEach(id => {
    executeImport(id, false);
  });

  toast(`Successfully imported all ${count} shipments from Gmail!`);
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
window.disconnectGmailFromInbox = disconnectGmailFromInbox;
window.importFromInbox = importFromInbox;
window.toggleSelectAllInbox = toggleSelectAllInbox;
window.updateBulkActionsState = updateBulkActionsState;
window.importSelectedInbox = importSelectedInbox;
window.importAllInbox = importAllInbox;
