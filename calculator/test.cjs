// Headless DOM stub so the real calculator/app.js runs, then drive it.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const buttons = [];
function makeButton(dataset) {
  const btn = { dataset, classList: { add() {}, remove() {} }, clicked: null };
  btn.closest = (sel) => (sel === "button" ? btn : null);
  btn.addEventListener = (type, fn) => { if (type === "click") btn.clicked = fn; };
  btn.click = () => btn.clicked && btn.clicked({ target: btn });
  buttons.push(btn);
  return btn;
}

["0","1","2","3","4","5","6","7","8","9"].forEach((d) => makeButton({ digit: d }));
["/", "*", "-", "+"].forEach((op) => makeButton({ op }));
["clear", "sign", "percent", "decimal", "equals"].forEach((a) => makeButton({ action: a }));

let delegate = null;          // click handler registered on .keys
const docListeners = {};       // document-level (keyboard) handlers

const display = { textContent: "0" };
const errorEl = { textContent: "" };

const realKeys = { addEventListener: (type, fn) => { if (type === "click") delegate = fn; } };

const document = {
  getElementById: (id) => (id === "display" ? display : id === "error" ? errorEl : null),
  querySelector: (sel) => {
    if (sel === ".keys") return realKeys;
    const m = sel.match(/data-(digit|op|action)="([^"]+)"/);
    if (!m) return null;
    const field = { digit: "digit", op: "op", action: "action" }[m[1]];
    return buttons.find((b) => b.dataset[field] === m[2]) || null;
  },
  addEventListener: (type, fn) => { docListeners[type] = fn; },
};

const sandbox = { document, console, setTimeout: (fn) => fn(), String, Number, Math, isFinite, parseFloat };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "app.js"), "utf8"), sandbox);

const find = (field, val) => buttons.find((b) => b.dataset[field] === val);
const tap = (el) => delegate({ target: el });
const key = (k) => docListeners.keydown({ key: k, preventDefault() {} });

function type(str) {
  for (const ch of str) {
    if (/[0-9]/.test(ch)) tap(find("digit", ch));
    else if (ch === ".") tap(find("action", "decimal"));
    else tap(find("op", ch));
  }
}
const reset = () => tap(find("action", "clear"));
const equals = () => tap(find("action", "equals"));

let pass = 0, fail = 0;
function check(name, actual, expected) {
  if (actual === expected) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}  -> got "${actual}", expected "${expected}"`); }
}

console.log("\nCore operations");
reset(); type("2+3"); equals();       check("2 + 3", display.textContent, "5");
reset(); type("10-4"); equals();      check("10 - 4", display.textContent, "6");
reset(); type("6*7"); equals();       check("6 * 7", display.textContent, "42");
reset(); type("20/5"); equals();      check("20 / 5", display.textContent, "4");
reset(); type("7/2"); equals();       check("7 / 2", display.textContent, "3.5");

console.log("\nChaining (left to right)");
reset(); type("2+3*4"); equals();     check("2 + 3 * 4", display.textContent, "20");
reset(); type("9-2-3"); equals();     check("9 - 2 - 3", display.textContent, "4");

console.log("\nDecimals / float precision");
reset(); type("0.1+0.2"); equals();   check("0.1 + 0.2", display.textContent, "0.3");
reset(); type("1.5*2"); equals();     check("1.5 * 2", display.textContent, "3");

console.log("\nValidation");
reset(); type("5/0"); equals();
check("divide by zero sets error", errorEl.textContent.length > 0, true);
console.log(`        message: "${errorEl.textContent}"`);
reset(); type("1234567890123456789");
check("digit cap = 15", display.textContent.length, 15);
reset(); type("0"); tap(find("action", "decimal")); tap(find("action", "decimal"));
check("single decimal point", display.textContent, "0.");
reset(); equals(); equals();
check("equals with no operator is safe", display.textContent, "0");

console.log("\nSign / percent");
reset(); type("5"); tap(find("action", "sign")); check("sign toggle", display.textContent, "-5");
reset(); type("50"); tap(find("action", "percent")); check("percent", display.textContent, "0.5");

console.log("\nKeyboard");
reset(); key("7"); key("+"); key("8"); key("Enter");
check("keyboard 7 + 8", display.textContent, "15");
reset(); key("5"); key("/"); key("0"); key("Enter");
check("keyboard divide by zero", errorEl.textContent.length > 0, true);
reset(); key("1"); key("2"); key("Backspace");
check("backspace removes digit", display.textContent, "1");
reset(); key("9"); key("9"); key("Escape");
check("escape clears", display.textContent, "0");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
