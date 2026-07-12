/* ==========================================================================
   Settings page — tab switching + simulated save lifecycle (saving/saved/error)
   ========================================================================== */

document.querySelectorAll(".settings-nav .item").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".settings-nav .item").forEach((i) => i.classList.remove("active"));
    document.querySelectorAll(".settings-panel").forEach((p) => p.classList.remove("active"));
    item.classList.add("active");
    const targetPanel = document.getElementById(`panel-${item.dataset.panel}`);
    if (targetPanel) {
      targetPanel.classList.add("active");
    }
    if (item.dataset.panel === "billing") {
      animateBillingUsage();
    }
  });
});

let billingAnimFrameId = null;
function animateBillingUsage() {
  const panel = document.getElementById("panel-billing");
  if (!panel) return;
  const metricsEl = panel.querySelector(".kv-row .v");
  const progressBar = panel.querySelector(".user-chip-progress-bar");
  if (!metricsEl || !progressBar) return;
  
  const metricsText = "50 / 100 tracks used"; // default initial/target format
  const match = metricsText.match(/(\d+)\s*\/\s*(\d+)\s*(.*)/);
  if (!match) return;

  const targetVal = parseInt(match[1], 10);
  const maxVal = parseInt(match[2], 10);
  const suffix = match[3] || "tracks used";
  const targetPercent = maxVal > 0 ? (targetVal / maxVal) * 100 : 50;

  if (billingAnimFrameId) cancelAnimationFrame(billingAnimFrameId);
  
  progressBar.style.transition = "none";
  progressBar.style.width = "0%";
  metricsEl.textContent = `0 / ${maxVal} ${suffix}`;

  let startTimestamp = null;
  const duration = 800; // 800ms transition

  function animate(timestamp) {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const easeProgress = progress * (2 - progress); // easeOutQuad
    
    const currentVal = Math.floor(easeProgress * targetVal);
    const currentPercent = easeProgress * targetPercent;
    
    progressBar.style.width = `${currentPercent}%`;
    metricsEl.textContent = `${currentVal} / ${maxVal} ${suffix}`;
    
    if (progress < 1) {
      billingAnimFrameId = requestAnimationFrame(animate);
    } else {
      progressBar.style.transition = "width 0.3s ease";
    }
  }

  billingAnimFrameId = requestAnimationFrame(animate);
}

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
      statusContainer.innerHTML = `<span style="color:var(--text-success); font-weight: 500; display: inline-flex; align-items: center; gap: 4px;"><i class="ti ti-circle-check" style="font-size:14px"></i>Connected</span>`;
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
    statusContainer.innerHTML = `<span style="color:var(--text-success); font-weight: 500; display: inline-flex; align-items: center; gap: 4px;"><i class="ti ti-circle-check" style="font-size:14px"></i>Connected</span>`;
  } else {
    btn.textContent = "Connect";
    btn.className = "btn-primary btn-sm";
    config.style.display = "none";
    statusContainer.textContent = "Scan messages in inbox and folders for shipping updates.";
  }
}

/** Generic connect/disconnect toggle for the Outlook, Slack, and Shopify rows —
    same simulated-connect UX as Gmail, driven by data-integration/data-label/data-config
    attributes so each integration doesn't need its own handler. */
function toggleIntegrationConnection(e) {
  e.preventDefault();
  const btn = e.currentTarget;
  const key = btn.dataset.integration;
  const label = btn.dataset.label;
  const row = btn.closest(".team-row");
  const statusEl = row ? row.querySelector(".integration-status") : null;
  const config = btn.dataset.config ? document.getElementById(btn.dataset.config) : null;

  if (btn.textContent.trim() === "Connect") {
    btn.disabled = true;
    btn.innerHTML = `<i class="ti ti-loader-2 sf-spin" aria-hidden="true" style="margin-right:4px"></i>Connecting…`;

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "Disconnect";
      btn.className = "btn-secondary btn-sm";
      if (config) config.style.display = "block";
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:var(--text-success); font-weight: 500; display: inline-flex; align-items: center; gap: 4px;"><i class="ti ti-circle-check" style="font-size:14px"></i>Connected</span>`;
      }
      localStorage.setItem(`sf_integration_${key}`, "true");
      toast(`Connected to ${label}`);
    }, 1000);
  } else {
    btn.textContent = "Connect";
    btn.className = "btn-primary btn-sm";
    if (config) config.style.display = "none";
    if (statusEl) statusEl.textContent = statusEl.dataset.default || "";
    localStorage.setItem(`sf_integration_${key}`, "false");
    toast(`${label} disconnected`);
  }
}

function initIntegrationStates() {
  document.querySelectorAll("[data-integration]").forEach((btn) => {
    const key = btn.dataset.integration;
    const label = btn.dataset.label;
    const row = btn.closest(".team-row");
    const statusEl = row ? row.querySelector(".integration-status") : null;
    const config = btn.dataset.config ? document.getElementById(btn.dataset.config) : null;

    if (localStorage.getItem(`sf_integration_${key}`) === "true") {
      btn.textContent = "Disconnect";
      btn.className = "btn-secondary btn-sm";
      if (config) config.style.display = "block";
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:var(--text-success); font-weight: 500; display: inline-flex; align-items: center; gap: 4px;"><i class="ti ti-circle-check" style="font-size:14px"></i>Connected</span>`;
      }
    }
  });
}

function initThemeSelector() {
  const currentTheme = localStorage.getItem("sf_theme") || "system";
  const options = document.querySelectorAll(".theme-grid .theme-option");
  
  options.forEach((opt) => {
    if (opt.dataset.themeVal === currentTheme) {
      opt.classList.add("active");
    } else {
      opt.classList.remove("active");
    }

    const selectTheme = () => {
      options.forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");
      const val = opt.dataset.themeVal;
      localStorage.setItem("sf_theme", val);
      if (typeof applyTheme === "function") {
        applyTheme(val);
      }
      toast(`Theme set to ${opt.querySelector(".theme-name").textContent}`);
    };

    opt.addEventListener("click", selectTheme);
    opt.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        selectTheme();
      }
    });
  });
}

function submitInvite() {
  const email = document.getElementById("inv-email").value.trim();
  if (!email) return;
  toast(`Invitation sent to ${email}`);
  if (typeof closeDrawer === "function") {
    closeDrawer("invite-member-drawer");
  }
  document.getElementById("invite-member-form").reset();
}

// Run on load
document.addEventListener("DOMContentLoaded", initSettingsGmail);
document.addEventListener("DOMContentLoaded", initIntegrationStates);
document.addEventListener("DOMContentLoaded", initThemeSelector);
document.addEventListener("DOMContentLoaded", handleUrlPanel);
window.toggleGmailConnection = toggleGmailConnection;
window.toggleIntegrationConnection = toggleIntegrationConnection;
window.submitInvite = submitInvite;

function handleUrlPanel() {
  const params = new URLSearchParams(window.location.search);
  let panel = params.get("panel");
  if (panel === "usage") {
    panel = "billing";
  }
  if (panel) {
    const navItem = document.querySelector(`.settings-nav .item[data-panel="${panel}"]`);
    if (navItem) {
      document.querySelectorAll(".settings-nav .item").forEach((i) => i.classList.remove("active"));
      document.querySelectorAll(".settings-panel").forEach((p) => p.classList.remove("active"));
      navItem.classList.add("active");
      const targetPanel = document.getElementById(`panel-${panel}`);
      if (targetPanel) {
        targetPanel.classList.add("active");
        if (panel === "billing") {
          animateBillingUsage();
        }
      }
    }
  }
}

// FAQ Toggle & Help Center interactions
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".faq-question").forEach((item) => {
    item.addEventListener("click", () => {
      item.closest(".faq-item").classList.toggle("active");
    });
  });

  const helpSearch = document.getElementById("help-search");
  if (helpSearch) {
    helpSearch.addEventListener("input", searchHelp);
  }
});

function searchHelp() {
  const query = (document.getElementById("help-search")?.value || "").toLowerCase();
  document.querySelectorAll(".faq-item").forEach(item => {
    const question = item.querySelector(".faq-question").textContent.toLowerCase();
    const answer = item.querySelector(".faq-answer").textContent.toLowerCase();
    if (question.includes(query) || answer.includes(query)) {
      item.style.display = "";
    } else {
      item.style.display = "none";
    }
  });
}

function submitSupportTicket() {
  const subject = document.getElementById("sup-subject").value;
  if (!subject) return;
  if (typeof toast !== "undefined") {
    toast("Support ticket submitted! We will reply via email shortly.");
  } else {
    alert("Support ticket submitted! We will reply via email shortly.");
  }
  document.getElementById("support-form").reset();
}

window.searchHelp = searchHelp;
window.submitSupportTicket = submitSupportTicket;

