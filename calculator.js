const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");
const errorEl = document.getElementById("error");

const MAX_DIGITS = 12;

// Tokens are either numeric strings ("12.5") or operators ("+", "-", "*", "/").
let tokens = [];
// When true the next digit starts a fresh number (after "=" or an operator).
let startFresh = false;
// The last computed result, reused when the user presses an operator after "=".
let lastResult = null;

const isOperator = (t) => ["+", "-", "*", "/"].includes(t);
const isNumber = (t) => typeof t === "string" && !isOperator(t);

function currentNumber() {
  const last = tokens[tokens.length - 1];
  return isNumber(last) ? last : null;
}

function displayNumber(value) {
  // Avoid floating point noise like 0.30000000000000004.
  return String(Number(value.toPrecision(12)));
}

function updateDisplay() {
  expressionEl.textContent = tokens.join(" ");
}

function clearError() {
  errorEl.textContent = "";
}

function showError(message) {
  errorEl.textContent = message;
}

function inputDigit(digit) {
  clearError();

  if (startFresh) {
    tokens = [];
    startFresh = false;
    lastResult = null;
  }

  const number = currentNumber();

  if (number === null) {
    tokens.push(digit);
  } else {
    if (number.replace(/[-.]/g, "").length >= MAX_DIGITS) return;
    tokens[tokens.length - 1] = number + digit;
  }

  updateDisplay();
}

function inputDecimal() {
  clearError();

  if (startFresh) {
    tokens = [];
    startFresh = false;
    lastResult = null;
  }

  const number = currentNumber();

  if (number === null) {
    tokens.push("0.");
  } else if (!number.includes(".")) {
    tokens[tokens.length - 1] = number + ".";
  }

  updateDisplay();
}

function inputOperator(op) {
  clearError();

  // After "=", continue calculating from the previous result.
  if (startFresh && lastResult !== null) {
    tokens = [displayNumber(lastResult), op];
    startFresh = false;
    updateDisplay();
    return;
  }

  if (tokens.length === 0) {
    // Allow a leading minus for negative numbers.
    if (op === "-") {
      tokens.push("-");
      updateDisplay();
    }
    return;
  }

  const last = tokens[tokens.length - 1];

  if (isOperator(last)) {
    // Negative numbers: keep "-" if it opens a number, otherwise replace.
    if (op === "-" && last !== "-") {
      tokens.push("-");
    } else {
      tokens[tokens.length - 1] = op;
    }
  } else if (last.endsWith(".")) {
    showError("Finish the number before choosing an operator.");
    return;
  } else {
    tokens.push(op);
  }

  updateDisplay();
}

function toggleSign() {
  clearError();

  if (startFresh) {
    tokens = ["-"];
    startFresh = false;
    lastResult = null;
    updateDisplay();
    return;
  }

  const number = currentNumber();
  if (number === null) return;

  tokens[tokens.length - 1] = number.startsWith("-") ? number.slice(1) : "-" + number;
  updateDisplay();
}

function backspace() {
  clearError();

  if (startFresh) {
    startFresh = false;
    lastResult = null;
    updateDisplay();
    return;
  }

  const last = tokens.pop();
  if (last !== undefined && last.length > 1) {
    tokens.push(last.slice(0, -1));
  }
  updateDisplay();
}

function clearAll() {
  tokens = [];
  startFresh = false;
  lastResult = null;
  resultEl.textContent = "0";
  clearError();
  updateDisplay();
}

const PRECEDENCE = { "+": 1, "-": 1, "*": 2, "/": 2 };

// Convert tokens to Reverse Polish Notation using the shunting-yard algorithm.
function toRPN(parts) {
  const output = [];
  const operators = [];

  parts.forEach((token) => {
    if (isNumber(token)) {
      const value = Number(token);
      if (!Number.isFinite(value)) throw new Error("Invalid number.");
      output.push(value);
      return;
    }

    const precedence = PRECEDENCE[token];
    if (!precedence) throw new Error("Invalid operator.");

    while (
      operators.length > 0 &&
      PRECEDENCE[operators[operators.length - 1]] >= precedence
    ) {
      output.push(operators.pop());
    }
    operators.push(token);
  });

  while (operators.length > 0) output.push(operators.pop());
  return output;
}

function evaluateRPN(rpn) {
  const stack = [];

  rpn.forEach((item) => {
    if (typeof item === "number") {
      stack.push(item);
      return;
    }

    if (stack.length < 2) throw new Error("Incomplete expression.");

    const b = stack.pop();
    const a = stack.pop();

    switch (item) {
      case "+": stack.push(a + b); break;
      case "-": stack.push(a - b); break;
      case "*": stack.push(a * b); break;
      case "/":
        if (b === 0) throw new Error("Cannot divide by zero.");
        stack.push(a / b);
        break;
      default: throw new Error("Invalid operator.");
    }
  });

  if (stack.length !== 1) throw new Error("Incomplete expression.");
  return stack[0];
}

function equals() {
  clearError();

  if (tokens.length === 0) return;

  const last = tokens[tokens.length - 1];
  if (isOperator(last)) {
    showError("Expression ends with an operator.");
    return;
  }
  if (last.endsWith(".")) {
    showError("Finish the number after the decimal point.");
    return;
  }

  const parts = [...tokens];

  try {
    const value = evaluateRPN(toRPN(parts));
    if (!Number.isFinite(value)) throw new Error("Result is not a valid number.");

    lastResult = value;
    startFresh = true;
    tokens = parts;
    expressionEl.textContent = parts.join(" ") + " =";
    resultEl.textContent = displayNumber(value);
  } catch (error) {
    showError(error.message);
  }
}

// --- Keypad wiring -------------------------------------------------------

document.querySelector(".keys").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const { num, op, action } = button.dataset;

  if (num !== undefined) {
    num === "." ? inputDecimal() : inputDigit(num);
  } else if (op !== undefined) {
    inputOperator(op);
  } else if (action === "equals") {
    equals();
  } else if (action === "clear") {
    clearAll();
  } else if (action === "backspace") {
    backspace();
  } else if (action === "sign") {
    toggleSign();
  }
});

// --- Keyboard support ----------------------------------------------------

const KEY_ACTIONS = {
  Enter: equals,
  "=": equals,
  Backspace: backspace,
  Delete: clearAll,
  Escape: clearAll,
  "+": () => inputOperator("+"),
  "-": () => inputOperator("-"),
  "*": () => inputOperator("*"),
  x: () => inputOperator("*"),
  "/": () => inputOperator("/"),
  ".": inputDecimal,
  ",": inputDecimal,
};

document.addEventListener("keydown", (event) => {
  if (/^\d$/.test(event.key)) {
    inputDigit(event.key);
  } else if (KEY_ACTIONS[event.key]) {
    event.preventDefault();
    KEY_ACTIONS[event.key]();
  }
});

clearAll();
