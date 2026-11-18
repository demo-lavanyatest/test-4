const STORAGE_KEY = "expenses";

const form = document.getElementById("expense-form");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const list = document.getElementById("expense-list");
const totalEl = document.getElementById("total");
const emptyState = document.getElementById("empty-state");

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function loadExpenses() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

let expenses = loadExpenses();

function formatCurrency(value) {
  return currency.format(value);
}

function setError(input, message) {
  document.getElementById(`${input.id}-error`).textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function render() {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  totalEl.textContent = formatCurrency(total);

  list.innerHTML = "";
  emptyState.hidden = expenses.length !== 0;

  expenses.forEach((expense, index) => {
    const li = document.createElement("li");
    li.className = "expense-item";

    const info = document.createElement("div");
    info.className = "expense-info";

    const category = document.createElement("span");
    category.className = "expense-category";
    category.textContent = expense.category;

    const amount = document.createElement("span");
    amount.className = "expense-amount";
    amount.textContent = formatCurrency(expense.amount);

    info.append(category, amount);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.setAttribute("aria-label", `Delete ${expense.category} expense`);
    deleteBtn.addEventListener("click", () => deleteExpense(index));

    li.append(info, deleteBtn);
    list.append(li);
  });
}

function deleteExpense(index) {
  expenses.splice(index, 1);
  saveExpenses();
  render();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const amount = Number.parseFloat(amountInput.value);
  const category = categoryInput.value;

  let valid = true;
  if (!amountInput.value || Number.isNaN(amount) || amount <= 0) {
    setError(amountInput, "Enter an amount greater than 0.");
    valid = false;
  } else {
    setError(amountInput, "");
  }

  if (!category) {
    setError(categoryInput, "Choose a category.");
    valid = false;
  } else {
    setError(categoryInput, "");
  }

  if (!valid) return;

  expenses.push({ amount: Math.round(amount * 100) / 100, category });
  saveExpenses();
  render();
  amountInput.value = "";
  categoryInput.value = "";
  amountInput.focus();
});

render();
