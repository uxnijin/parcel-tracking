/* ==========================================================================
   Notifications page
   ========================================================================== */

let notifFilter = "all";

function renderNotifications() {
  const list = document.getElementById("notif-list");
  const empty = document.getElementById("notif-empty");
  list.innerHTML = Array.from({ length: 5 }).map(() =>
    `<div class="notif-row"><div class="skeleton" style="width:32px;height:32px;border-radius:50%"></div>
     <div style="flex:1"><div class="skeleton" style="height:12px;width:40%;margin-bottom:8px"></div><div class="skeleton" style="height:12px;width:80%"></div></div></div>`
  ).join("");

  let rows = ALL_NOTIFICATIONS;
  if (notifFilter === "unread") {
    rows = ALL_NOTIFICATIONS.filter((n) => !n.read);
  } else if (notifFilter === "exceptions") {
    rows = ALL_NOTIFICATIONS.filter((n) => n.kind === "danger");
  } else if (notifFilter === "alerts") {
    rows = ALL_NOTIFICATIONS.filter((n) => n.kind === "warning");
  } else if (notifFilter === "deliveries") {
    rows = ALL_NOTIFICATIONS.filter((n) => n.kind === "success");
  }

  delay(rows, 220).then((items) => {
    // Sidebar unread count is kept in sync by app.js updateSidebarCounts().

    if (items.length === 0) {
      list.innerHTML = "";
      empty.style.display = "flex";
      const emptyTitle = empty.querySelector("h3");
      const emptyText = empty.querySelector("p");
      if (notifFilter === "unread") {
        emptyTitle.textContent = "You're all caught up";
        emptyText.textContent = "No unread notifications right now.";
      } else if (notifFilter === "exceptions") {
        emptyTitle.textContent = "No exceptions";
        emptyText.textContent = "No exception notifications to review.";
      } else if (notifFilter === "alerts") {
        emptyTitle.textContent = "No alerts or delays";
        emptyText.textContent = "No warnings or ETA changes found.";
      } else if (notifFilter === "deliveries") {
        emptyTitle.textContent = "No deliveries";
        emptyText.textContent = "No shipment delivery notifications.";
      } else {
        emptyTitle.textContent = "No notifications";
        emptyText.textContent = "Your notification inbox is empty.";
      }
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
