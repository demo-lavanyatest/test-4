const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const SECRET = crypto.randomBytes(32).toString("hex");
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.static("public"));

// In-memory stores
const users = [
  { id: "1", email: "agent@desk.com", password: "password1", name: "Alex", role: "agent" },
  { id: "2", email: "user@desk.com",  password: "password1", name: "Sam",  role: "user" },
];

let tickets = [
  { id: "1", title: "Printer not working", description: "Office printer on 3rd floor is jammed.", status: "open", priority: "high",   createdBy: "2", assignee: "1", createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "2", title: "VPN access request", description: "New hire needs VPN credentials.",            status: "open", priority: "medium", createdBy: "2", assignee: null, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "3", title: "Email not syncing",  description: "Outlook not syncing on mobile.",             status: "open", priority: "low",    createdBy: "2", assignee: null, createdAt: new Date().toISOString() },
];

let nextTicketId = 4;

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    req.user = jwt.verify(auth.slice(7), SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  const user = users.find((u) => u.email === email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, SECRET, { expiresIn: "8h" });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// List tickets
app.get("/api/tickets", authenticate, (req, res) => {
  const { status, priority } = req.query;
  let result = tickets.map((t) => ({ ...t, creatorName: users.find((u) => u.id === t.createdBy)?.name }));
  if (status) result = result.filter((t) => t.status === status);
  if (priority) result = result.filter((t) => t.priority === priority);
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(result);
});

// Create ticket
app.post("/api/tickets", authenticate, (req, res) => {
  const { title, description, priority } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: "Title is required" });
  const ticket = {
    id: String(nextTicketId++),
    title: title.trim(),
    description: (description || "").trim(),
    status: "open",
    priority: priority || "medium",
    createdBy: req.user.id,
    assignee: null,
    createdAt: new Date().toISOString(),
  };
  tickets.push(ticket);
  res.status(201).json(ticket);
});

// Get single ticket
app.get("/api/tickets/:id", authenticate, (req, res) => {
  const ticket = tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  const creator = users.find((u) => u.id === ticket.createdBy);
  res.json({ ...ticket, creatorName: creator?.name });
});

// Update ticket status / assign
app.patch("/api/tickets/:id", authenticate, (req, res) => {
  const ticket = tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const { status, assignee } = req.body || {};
  if (status) ticket.status = status;
  if (assignee !== undefined) ticket.assignee = assignee;

  res.json(ticket);
});

// Me
app.get("/api/me", authenticate, (req, res) => {
  res.json(req.user);
});

app.listen(PORT, () => console.log(`Service Desk running on port ${PORT}`));