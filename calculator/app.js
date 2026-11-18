const display = document.getElementById("display");
const errorEl = document.getElementById("error");

const MAX_DIGITS = 15;

// state
let current = "0";   // current entry
let previous = null; // stored operand
let operator = null; // pending operator
let justEvaluated = false;

const OPS = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => a / b,
};

function render() {
  display.textContent = formatNumber(current);
}

function formatNumber(value) {
  if (value === "Error") return value;
  // keep an in-progress entry like "0." or "1.50" as typed
  if (typeof value === "string" && /^-?\d*\.\d*$/.test(value)) return value;
  const num = Number(value);
  if (!isFinite(num)) return "Error";
  // trim float noise while keeping precision reasonable
  let str = String(num);
  if (str.includes("e")) return str;
  return str;
}

function setError(message) {
  errorEl.textContent = message || "";
}

function inputDigit(digit) {
  setError("");
  if (justEvaluated) {
    current = "0";
    previous = null;
    operator = null;
    justEvaluated = false;
  }
  if (current.replace(/[-.]/g, "").length >= MAX_DIGITS) {
    setError("Maximum 15 digits reached.");
    return;
  }
  current = current === "0" ? digit : current + digit;
  render();
}

function inputDecimal() {
  setError("");
  if (justEvaluated) {
    current = "0";
    previous = null;
    operator = null;
    justEvaluated = false;
  }
  if (!current.includes(".")) {
    current += ".";
    render();
  }
}

function toggleSign() {
  if (current === "0" || current === "Error") return;
  current = current.startsWith("-") ? current.slice(1) : "-" + current;
  render();
}

function percent() {
  if (current === "Error") return;
  current = String(Number(current) / 100);
  render();
}

function clearAll() {
  current = "0";
  previous = null;
  operator = null;
  justEvaluated = false;
  setError("");
  render();
}

function chooseOperator(op) {
  setError("");
  if (operator !== null && !justEvaluated) {
    if (!evaluate()) return;
  }
  previous = current;
  operator = op;
  justEvaluated = false;
  current = "0";
}

function evaluate() {
  if (operator === null || previous === null) return true;

  const a = Number(previous);
  const b = Number(current);

  if (operator === "/" && b === 0) {
    setError("Cannot divide by zero.");
    current = "0";
    previous = null;
    operator = null;
    render();
    return false;
  }

  const result = OPS[operator](a, b);

  if (!isFinite(result) || Number.isNaN(result)) {
    setError("Result is not a finite number.");
    current = "0";
    previous = null;
    operator = null;
    justEvaluated = true;
    render();
    return false;
  }

  // guard against precision drift (e.g. 0.1 + 0.2)
  current = String(Math.round(result * 1e12) / 1e12);
  previous = null;
  operator = null;
  justEvaluated = true;
  setError("");
  render();
  return true;
}

function handleAction(action) {
  switch (action) {
    case "clear": clearAll(); break;
    case "sign": toggleSign(); break;
    case "percent": percent(); break;
    case "decimal": inputDecimal(); break;
    case "equals": evaluate(); break;
  }
}

// ---- events ----
document.querySelector(".keys").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.digit !== undefined) inputDigit(btn.dataset.digit);
  else if (btn.dataset.op) chooseOperator(btn.dataset.op);
  else if (btn.dataset.action) handleAction(btn.dataset.action);
});

document.addEventListener("keydown", (e) => {
  const k = e.key;
  if (/^[0-9]$/.test(k)) { inputDigit(k); }
  else if (k === ".") { inputDecimal(); }
  else if (k === "+" || k === "-" || k === "*" || k === "/") { chooseOperator(k); }
  else if (k === "Enter" || k === "=") { e.preventDefault(); evaluate(); }
  else if (k === "Escape") { clearAll(); }
  else if (k === "Backspace") {
    setError("");
    if (current !== "Error" && current.length > 0 && !justEvaluated) {
      current = current.length === 1 ? "0" : current.slice(0, -1);
      if (current === "-") current = "0";
      render();
    }
    return;
  } else {
    return;
  }
  // brief visual feedback for the matching key
  highlight(k);
});

function highlight(key) {
  const sel = key === "Enter" || key === "=" ? '[data-action="equals"]'
    : key === "Escape" ? '[data-action="clear"]'
    : /[0-9]/.test(key) ? `[data-digit="${key}"]`
    : key === "." ? '[data-action="decimal"]'
    : `[data-op="${key}"]`;
  const btn = document.querySelector(sel);
  if (btn) {
    btn.classList.add("active");
    setTimeout(() => btn.classList.remove("active"), 90);
  }
}

render();
