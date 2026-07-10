/* ==========================================================================
   Notifications page
   ========================================================================== */

let notifFilter = "all";

function unreadCount() { return ALL_NOTIFICATIONS.filter((n) => !n.read).length; }

function renderNotifications() {
  const list = document.getElementById("notif-list");
  const empty = document.getElementById("notif-empty");
  list.innerHTML = Array.from({ length: 5 }).map(() =>
    `<div class="notif-row"><div class="skeleton" style="width:32px;height:32px;border-radius:50%"></div>
     <div style="flex:1"><div class="skeleton" style="height:12px;width:40%;margin-bottom:8px"></div><div class="skeleton" style="height:12px;width:80%"></div></div></div>`
  ).join("");

  const rows = notifFilter === "unread" ? ALL_NOTIFICATIONS.filter((n) => !n.read) : ALL_NOTIFICATIONS;
  delay(rows, 220).then((items) => {
    document.getElementById("result-count").textContent = `${unreadCount()} unread`;
    document.getElementById("nav-unread").textContent = unreadCount();

    if (items.length === 0) {
      list.innerHTML = "";
      empty.style.display = "flex";
      return;
    }
    empty.style.display = "none";

    list.innerHTML = items.map((n) => `
      <div class="notif-row ${n.read ? "" : "unread"}" data-id="${n.id}">
        <div class="notif-icon ${n.kind}"><i class="ti ${n.icon}" aria-hidden="true"></i></div>
        <div class="notif-body">
          <div class="notif-title">${!n.read ? '<span class="unread-dot"></span>' : ""}${n.title}</div>
          <div class="notif-text">${n.body}</div>
          <div class="notif-time">${n.time}</div>
        </div>
      </div>`).join("");

    list.querySelectorAll(".notif-row").forEach((row) => {
      row.addEventListener("click", () => {
        const n = ALL_NOTIFICATIONS.find((x) => x.id === Number(row.dataset.id));
        if (n) {
          n.read = true;
          if (typeof saveNotifications !== "undefined") {
            saveNotifications(ALL_NOTIFICATIONS);
          }
          const match = n.body.match(/SHP-\d+/);
          if (match) {
            location.href = `shipment-detail.html?id=${match[0]}`;
            return;
          }
        }
        renderNotifications();
      });
    });
  });
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    notifFilter = tab.dataset.filter;
    renderNotifications();
  });
});

document.getElementById("btn-mark-all").addEventListener("click", () => {
  ALL_NOTIFICATIONS.forEach((n) => (n.read = true));
  if (typeof saveNotifications !== "undefined") {
    saveNotifications(ALL_NOTIFICATIONS);
  }
  renderNotifications();
  toast("All notifications marked as read");
});

window.addEventListener("sf-data-updated", (e) => {
  if (e.detail && e.detail.type === "notifications") {
    renderNotifications();
  }
});

renderNotifications();
