// Storage key
const STORAGE_KEY = "expense_tracker_items";

// DOM Elements
const form = document.getElementById("expense-form");
const descInput = document.getElementById("expense-desc");
const amountInput = document.getElementById("expense-amount");
const categorySelect = document.getElementById("expense-category");
const dateInput = document.getElementById("expense-date");

const descError = document.getElementById("desc-error");
const amountError = document.getElementById("amount-error");
const categoryError = document.getElementById("category-error");
const dateError = document.getElementById("date-error");

const totalAmountEl = document.getElementById("total-amount");
const totalCountEl = document.getElementById("total-count");
const tableBody = document.getElementById("expense-list-body");
const emptyState = document.getElementById("empty-state");
const filterCategory = document.getElementById("filter-category");

// State
let expenses = loadExpenses();

// Default date to today
if (dateInput) {
  dateInput.value = new Date().toISOString().split("T")[0];
}

// Persistence
function loadExpenses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load expenses from localStorage", e);
    return [];
  }
}

function saveExpenses() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (e) {
    console.error("Failed to save expenses to localStorage", e);
  }
}

// Formatting
function formatCurrency(num) {
  return "$" + Number(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${m}/${d}/${y}`;
  }
  return dateStr;
}

// Render
function render() {
  const selectedFilter = filterCategory.value;
  const filtered = selectedFilter === "ALL"
    ? expenses
    : expenses.filter((item) => item.category === selectedFilter);

  // Compute total of all expenses regardless of filter, or filter-based? Total should reflect all overall expenses
  const overallTotal = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  totalAmountEl.textContent = formatCurrency(overallTotal);
  totalCountEl.textContent = expenses.length;

  tableBody.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
    filtered.forEach((item) => {
      const tr = document.createElement("tr");

      const tdDate = document.createElement("td");
      tdDate.textContent = formatDate(item.date);

      const tdDesc = document.createElement("td");
      tdDesc.textContent = item.description;

      const tdCat = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = item.category;
      tdCat.appendChild(badge);

      const tdAmt = document.createElement("td");
      tdAmt.className = "text-right amount-col";
      tdAmt.textContent = formatCurrency(item.amount);

      const tdAction = document.createElement("td");
      tdAction.className = "text-center";
      const delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.textContent = "Delete";
      delBtn.setAttribute("aria-label", `Delete expense ${item.description}`);
      delBtn.addEventListener("click", () => deleteExpense(item.id));
      tdAction.appendChild(delBtn);

      tr.appendChild(tdDate);
      tr.appendChild(tdDesc);
      tr.appendChild(tdCat);
      tr.appendChild(tdAmt);
      tr.appendChild(tdAction);

      tableBody.appendChild(tr);
    });
  }
}

// Add Expense
function clearErrors() {
  descError.textContent = "";
  amountError.textContent = "";
  categoryError.textContent = "";
  dateError.textContent = "";
}

function validateInputs(desc, amountStr, category, date) {
  let isValid = true;
  clearErrors();

  if (!desc.trim()) {
    descError.textContent = "Description is required.";
    isValid = false;
  }

  const amountNum = parseFloat(amountStr);
  if (!amountStr || isNaN(amountNum) || amountNum <= 0) {
    amountError.textContent = "Please enter a valid amount greater than 0.";
    isValid = false;
  }

  if (!category) {
    categoryError.textContent = "Please select a category.";
    isValid = false;
  }

  if (!date) {
    dateError.textContent = "Please select a date.";
    isValid = false;
  }

  return isValid;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const desc = descInput.value;
  const amountStr = amountInput.value;
  const category = categorySelect.value;
  const date = dateInput.value;

  if (!validateInputs(desc, amountStr, category, date)) {
    return;
  }

  const newExpense = {
    id: "exp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    description: desc.trim(),
    amount: parseFloat(parseFloat(amountStr).toFixed(2)),
    category,
    date,
  };

  expenses.unshift(newExpense);
  saveExpenses();
  render();

  // Reset form inputs except date
  descInput.value = "";
  amountInput.value = "";
  categorySelect.selectedIndex = 0;
  descInput.focus();
});

// Delete Expense
function deleteExpense(id) {
  expenses = expenses.filter((item) => item.id !== id);
  saveExpenses();
  render();
}

// Filter change listener
filterCategory.addEventListener("change", () => {
  render();
});

// Initial render
render();
