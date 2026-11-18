const form = document.getElementById("login-form");
const email = document.getElementById("email");
const password = document.getElementById("password");
const toggle = document.getElementById("toggle-password");
const status = document.getElementById("status");

toggle.addEventListener("click", () => {
  const show = password.type === "password";
  password.type = show ? "text" : "password";
  toggle.textContent = show ? "Hide" : "Show";
  toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
  toggle.setAttribute("aria-pressed", String(show));
});

function setError(input, message) {
  document.getElementById(`${input.id}-error`).textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function validate() {
  let valid = true;

  if (!email.value.trim()) {
    setError(email, "Email is required.");
    valid = false;
  } else if (!email.validity.valid) {
    setError(email, "Enter a valid email address.");
    valid = false;
  } else {
    setError(email, "");
  }

  if (!password.value) {
    setError(password, "Password is required.");
    valid = false;
  } else if (password.value.length < 8) {
    setError(password, "Password must be at least 8 characters.");
    valid = false;
  } else {
    setError(password, "");
  }

  return valid;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  status.textContent = "";
  if (!validate()) return;

  // Placeholder: replace with a POST to your authentication endpoint over HTTPS.
  status.textContent = "Logged in successfully (demo).";
});
