const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Mock LocalStorage
const storageStore = {};
const localStorage = {
  getItem: (key) => (key in storageStore ? storageStore[key] : null),
  setItem: (key, val) => { storageStore[key] = String(val); },
  removeItem: (key) => { delete storageStore[key]; },
  clear: () => { Object.keys(storageStore).forEach((k) => delete storageStore[k]); }
};

// DOM helper mocks
class MockElement {
  constructor(id, tag = "div") {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.value = "";
    this._textContent = "";
    this._innerHTML = "";
    this.children = [];
    this.classList = {
      classes: new Set(),
      add: (...c) => c.forEach((cl) => this.classList.classes.add(cl)),
      remove: (...c) => c.forEach((cl) => this.classList.classes.delete(cl)),
      contains: (cl) => this.classList.classes.has(cl),
    };
    this.listeners = {};
    this.selectedIndex = 0;
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(val) {
    this._textContent = String(val);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = val;
    if (val === "") {
      this.children = [];
    }
  }

  addEventListener(type, fn) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(fn);
  }

  dispatchEvent(event) {
    const fns = this.listeners[event.type] || [];
    fns.forEach((fn) => fn(event));
  }

  appendChild(child) {
    this.children.push(child);
  }

  setAttribute(k, v) {
    this[k] = v;
  }

  focus() {}
}

const elements = {
  "expense-form": new MockElement("expense-form", "form"),
  "expense-desc": new MockElement("expense-desc", "input"),
  "expense-amount": new MockElement("expense-amount", "input"),
  "expense-category": new MockElement("expense-category", "select"),
  "expense-date": new MockElement("expense-date", "input"),
  "desc-error": new MockElement("desc-error", "span"),
  "amount-error": new MockElement("amount-error", "span"),
  "category-error": new MockElement("category-error", "span"),
  "date-error": new MockElement("date-error", "span"),
  "total-amount": new MockElement("total-amount", "span"),
  "total-count": new MockElement("total-count", "span"),
  "expense-list-body": new MockElement("expense-list-body", "tbody"),
  "empty-state": new MockElement("empty-state", "p"),
  "filter-category": new MockElement("filter-category", "select"),
};
elements["filter-category"].value = "ALL";

const document = {
  getElementById: (id) => elements[id] || null,
  createElement: (tag) => new MockElement(null, tag),
};

const sandbox = {
  document,
  localStorage,
  console,
  Date,
  Math,
  String,
  Number,
  parseFloat,
  isNaN,
  Array,
  JSON,
};

vm.createContext(sandbox);
const appCode = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
vm.runInContext(appCode, sandbox);

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`  PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  FAIL: ${msg}`);
    failed++;
  }
}

console.log("\n--- Running Expense Tracker Tests ---");

// Test 1: Initial state
assert(elements["total-amount"].textContent === "$0.00", "Initial total is $0.00");
assert(elements["total-count"].textContent === "0", "Initial count is 0");
assert(!elements["empty-state"].classList.contains("hidden"), "Empty state is visible initially");

// Test 2: Validation errors
console.log("\nTesting Validation:");
elements["expense-form"].dispatchEvent({ type: "submit", preventDefault() {} });
assert(elements["desc-error"].textContent.length > 0, "Description error triggered when empty");
assert(elements["amount-error"].textContent.length > 0, "Amount error triggered when empty");
assert(elements["category-error"].textContent.length > 0, "Category error triggered when empty");

// Test 3: Invalid amount validation (negative or zero or text)
elements["expense-desc"].value = "Coffee";
elements["expense-amount"].value = "-5.00";
elements["expense-category"].value = "Food & Dining";
elements["expense-date"].value = "2026-11-18";
elements["expense-form"].dispatchEvent({ type: "submit", preventDefault() {} });
assert(elements["amount-error"].textContent.length > 0, "Negative amount rejected");

// Test 4: Add valid expense
console.log("\nTesting Add Expense & Calculation:");
elements["expense-amount"].value = "4.50";
elements["expense-form"].dispatchEvent({ type: "submit", preventDefault() {} });
assert(elements["total-amount"].textContent === "$4.50", "Total amount is $4.50 after adding Coffee");
assert(elements["total-count"].textContent === "1", "Total count is 1");
assert(elements["empty-state"].classList.contains("hidden"), "Empty state is hidden");
assert(elements["expense-list-body"].children.length === 1, "Table has 1 row");

// Check localStorage persistence
const savedData = JSON.parse(localStorage.getItem("expense_tracker_items"));
assert(Array.isArray(savedData) && savedData.length === 1, "Expense saved to localStorage");
assert(savedData[0].description === "Coffee" && savedData[0].amount === 4.5, "Stored correct data");

// Test 5: Add second expense
elements["expense-desc"].value = "Metro Ticket";
elements["expense-amount"].value = "2.75";
elements["expense-category"].value = "Transportation";
elements["expense-date"].value = "2026-11-18";
elements["expense-form"].dispatchEvent({ type: "submit", preventDefault() {} });
assert(elements["total-amount"].textContent === "$7.25", "Total is $7.25 after adding second expense");
assert(elements["total-count"].textContent === "2", "Total count is 2");
assert(elements["expense-list-body"].children.length === 2, "Table has 2 rows");

// Test 6: Category Filter
console.log("\nTesting Category Filter:");
elements["filter-category"].value = "Food & Dining";
elements["filter-category"].dispatchEvent({ type: "change" });
assert(elements["expense-list-body"].children.length === 1, "Filtered view shows 1 Food & Dining expense");

elements["filter-category"].value = "Entertainment";
elements["filter-category"].dispatchEvent({ type: "change" });
assert(elements["expense-list-body"].children.length === 0, "Filtered view shows 0 for empty category");
assert(!elements["empty-state"].classList.contains("hidden"), "Empty state appears when filter has no results");

// Reset filter
elements["filter-category"].value = "ALL";
elements["filter-category"].dispatchEvent({ type: "change" });
assert(elements["expense-list-body"].children.length === 2, "Resetting filter shows all 2 expenses");

// Test 7: Delete Expense
console.log("\nTesting Deletion:");
const firstRow = elements["expense-list-body"].children[0];
const deleteBtn = firstRow.children[4].children[0]; // action column -> button
deleteBtn.dispatchEvent({ type: "click" });

assert(elements["total-count"].textContent === "1", "Total count is 1 after deletion");
assert(elements["total-amount"].textContent === "$4.50", "Total amount updated to $4.50 after deletion");
const updatedStorage = JSON.parse(localStorage.getItem("expense_tracker_items"));
assert(updatedStorage.length === 1, "localStorage updated after deletion");

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
