/* ==========================================================================
   Settings page — tab switching + simulated save lifecycle (saving/saved/error)
   ========================================================================== */

document.querySelectorAll(".settings-nav .item").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".settings-nav .item").forEach((i) => i.classList.remove("active"));
    document.querySelectorAll(".settings-panel").forEach((p) => p.classList.remove("active"));
    item.classList.add("active");
    document.getElementById(`panel-${item.dataset.panel}`).classList.add("active");
  });
});

/** Simulates a save round-trip with a validation failure the first time,
    so the panel demonstrates saving / error / saved states without a backend. */
function simulateSave(panel) {
  if (panel === "profile") {
    const emailField = document.getElementById("f-email-field");
    const email = document.getElementById("f-email").value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      emailField.classList.add("has-error");
      setStatus(panel, "error", "Fix the highlighted field");
      return;
    }
    emailField.classList.remove("has-error");
  }
  setStatus(panel, "saving", "Saving…");
  setTimeout(() => {
    setStatus(panel, "saved", "Saved");
    toast("Settings saved");
    setTimeout(() => setStatus(panel, "", ""), 2000);
  }, 700);
}

function setStatus(panel, state, label) {
  const el = document.getElementById(`save-status-${panel}`);
  if (!el) return;
  const icons = { saving: "ti-loader-2", saved: "ti-check", error: "ti-alert-circle" };
  el.innerHTML = state ? `<i class="ti ${icons[state]}" aria-hidden="true"></i>${label}` : "";
  el.style.color = state === "error" ? "var(--text-danger)" : state === "saved" ? "var(--text-success)" : "var(--text-muted)";
}

function toggleGmailConnection(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-connect-gmail");
  const config = document.getElementById("gmail-config");
  const statusContainer = btn.closest(".team-row").querySelector(".email");
  
  if (btn.textContent === "Connect") {
    btn.disabled = true;
    btn.innerHTML = `<i class="ti ti-loader-2 sf-spin" aria-hidden="true" style="margin-right:4px"></i>Connecting…`;
    
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "Disconnect";
      btn.className = "btn-secondary btn-sm";
      config.style.display = "block";
      statusContainer.innerHTML = `<span style="color:var(--text-success); font-weight: 500; display: inline-flex; align-items: center; gap: 4px;"><i class="ti ti-circle-check" style="font-size:14px"></i>Connected</span> · last scanned 2m ago`;
      if (typeof setGmailConnected !== "undefined") {
        setGmailConnected(true);
      }
      toast("Successfully connected to Gmail!");
    }, 1200);
  } else {
    btn.textContent = "Connect";
    btn.className = "btn-primary btn-sm";
    config.style.display = "none";
    statusContainer.textContent = "Scan messages in inbox and folders for shipping updates.";
    if (typeof setGmailConnected !== "undefined") {
      setGmailConnected(false);
    }
    toast("Gmail connection removed");
  }
}

function initSettingsGmail() {
  const btn = document.getElementById("btn-connect-gmail");
  const config = document.getElementById("gmail-config");
  if (!btn || !config) return;
  const statusContainer = btn.closest(".team-row").querySelector(".email");
  
  if (typeof isGmailConnected !== "undefined" && isGmailConnected()) {
    btn.textContent = "Disconnect";
    btn.className = "btn-secondary btn-sm";
    config.style.display = "block";
    statusContainer.innerHTML = `<span style="color:var(--text-success); font-weight: 500; display: inline-flex; align-items: center; gap: 4px;"><i class="ti ti-circle-check" style="font-size:14px"></i>Connected</span> · last scanned 2m ago`;
  } else {
    btn.textContent = "Connect";
    btn.className = "btn-primary btn-sm";
    config.style.display = "none";
    statusContainer.textContent = "Scan messages in inbox and folders for shipping updates.";
  }
}

// Run on load
document.addEventListener("DOMContentLoaded", initSettingsGmail);
window.toggleGmailConnection = toggleGmailConnection;
