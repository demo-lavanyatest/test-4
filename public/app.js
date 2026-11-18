// ---- state ----
let token = localStorage.getItem("token");
let currentUser = null;
let currentTickets = [];

// ---- views ----
const views = {
  login:    document.getElementById("view-login"),
  tickets:  document.getElementById("view-tickets"),
  create:   document.getElementById("view-create"),
  detail:   document.getElementById("view-detail"),
};
const header = document.getElementById("app-header");

function show(viewName) {
  Object.values(views).forEach((v) => v.classList.add("hidden"));
  if (viewName === "login") {
    header.classList.add("hidden");
  } else {
    header.classList.remove("hidden");
  }
  views[viewName].classList.remove("hidden");
}

// ---- api ----
function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function api(method, path, body) {
  const opts = { method, headers: authHeaders() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ---- auth ----
function logout() {
  localStorage.removeItem("token");
  token = null;
  currentUser = null;
  show("login");
}

// ---- login ----
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("login-status");
  status.textContent = "";
  status.className = "status";

  const email = document.getElementById("login-email").value.trim();
  const pw = document.getElementById("login-password").value;
  if (!email || !pw) { status.textContent = "Email and password are required."; status.className = "status error"; return; }

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    token = data.token;
    currentUser = data.user;
    localStorage.setItem("token", token);
    document.getElementById("login-email").value = "";
    document.getElementById("login-password").value = "";

    document.getElementById("user-name").textContent = currentUser.name;
    show("tickets");
    loadTickets();
  } catch (err) {
    status.textContent = err.message;
    status.className = "status error";
  }
});

document.getElementById("logout-btn").addEventListener("click", logout);

// ---- tickets ----
async function loadTickets(filters = {}) {
  const list = document.getElementById("ticket-list");
  const empty = document.getElementById("ticket-list-empty");
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);

  try {
    currentTickets = await api("GET", "/api/tickets?" + params.toString());
    if (currentTickets.length === 0) {
      list.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");
    list.innerHTML = currentTickets.map((t) => `
      <div class="ticket-item" data-id="${t.id}">
        <div class="ti-left">
          <span class="ti-title">${escHtml(t.title)}</span>
          <span class="ti-meta">#${t.id} by ${escHtml(t.creatorName || "—")} · ${new Date(t.createdAt).toLocaleString()}</span>
        </div>
        <div class="ti-right">
          <span class="badge ${t.status}">${t.status}</span>
          <span class="badge ${t.priority}">${t.priority}</span>
        </div>
      </div>
    `).join("");

    list.querySelectorAll(".ticket-item").forEach((el) => {
      el.addEventListener("click", () => openTicket(el.dataset.id));
    });
  } catch (err) {
    list.innerHTML = "";
    empty.textContent = err.message;
    empty.classList.remove("hidden");
  }
}

function escHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

document.getElementById("filter-status").addEventListener("change", (e) => {
  loadTickets({ status: e.target.value, priority: document.getElementById("filter-priority").value });
});
document.getElementById("filter-priority").addEventListener("change", (e) => {
  loadTickets({ status: document.getElementById("filter-status").value, priority: e.target.value });
});

// ---- create ----
document.getElementById("new-ticket-btn").addEventListener("click", () => show("create"));
document.getElementById("create-back-btn").addEventListener("click", () => show("tickets"));

document.getElementById("create-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("create-status");
  status.textContent = "";
  const title = document.getElementById("create-title").value.trim();
  if (!title) { document.getElementById("create-title-error").textContent = "Title is required."; return; }
  document.getElementById("create-title-error").textContent = "";

  try {
    await api("POST", "/api/tickets", {
      title,
      description: document.getElementById("create-desc").value.trim(),
      priority: document.getElementById("create-priority").value,
    });
    document.getElementById("create-form").reset();
    show("tickets");
    loadTickets();
  } catch (err) {
    status.textContent = err.message;
    status.className = "status error";
  }
});

// ---- detail ----
let currentTicketId = null;

async function openTicket(id) {
  try {
    const ticket = await api("GET", "/api/tickets/" + id);
    currentTicketId = id;
    document.getElementById("detail-title-heading").textContent = ticket.title;
    document.getElementById("detail-status").textContent = ticket.status;
    document.getElementById("detail-status").className = "badge " + ticket.status;
    document.getElementById("detail-priority").textContent = ticket.priority;
    document.getElementById("detail-priority").className = "badge " + ticket.priority;
    document.getElementById("detail-created").textContent = "Created " + new Date(ticket.createdAt).toLocaleString();
    document.getElementById("detail-body").textContent = ticket.description || "No description provided.";
    document.getElementById("detail-status-select").value = ticket.status;
    document.getElementById("detail-status-msg").textContent = "";
    show("detail");
  } catch (err) {
    alert(err.message);
  }
}

document.getElementById("detail-back-btn").addEventListener("click", () => { show("tickets"); loadTickets(); });

document.getElementById("detail-update-btn").addEventListener("click", async () => {
  const msg = document.getElementById("detail-status-msg");
  msg.textContent = "";
  const newStatus = document.getElementById("detail-status-select").value;
  try {
    const updated = await api("PATCH", "/api/tickets/" + currentTicketId, { status: newStatus });
    document.getElementById("detail-status").textContent = updated.status;
    document.getElementById("detail-status").className = "badge " + updated.status;
    msg.textContent = "Status updated.";
    msg.className = "status success";
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "status error";
  }
});

// ---- startup ----
if (token) {
  api("GET", "/api/me")
    .then((user) => {
      currentUser = user;
      document.getElementById("user-name").textContent = user.name;
      show("tickets");
      loadTickets();
    })
    .catch(() => {
      localStorage.removeItem("token");
      token = null;
      show("login");
    });
} else {
  show("login");
}