import { isAdminUser, saveSession, loadSession } from "./auth.js";
import { ApiError, loginRequest } from "./api.js";

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const message = document.getElementById("login-message");
const submitButton = document.getElementById("login-submit");

const existingSession = loadSession();
if (existingSession && isAdminUser(existingSession.user)) {
  window.location.replace("admin.html");
}

function setMessage(text, tone) {
  message.textContent = text;
  message.className = `status-message${tone ? ` ${tone}` : ""}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    setMessage("Enter both email and password.", "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Signing in...";
  setMessage("", "");

  try {
    const response = await loginRequest(email, password);
    if (!response.token || !response.user) {
      throw new ApiError("Login response is missing session details.", 500, "INVALID_SESSION");
    }

    if (!isAdminUser(response.user)) {
      throw new ApiError("This account does not have admin access.", 403, "NOT_ADMIN");
    }

    saveSession({
      token: response.token,
      user: {
        id: response.user.id || "",
        email: response.user.email || email,
        name: response.user.name || "",
        role: response.user.role || "",
      },
    });

    window.location.replace("admin.html");
  } catch (error) {
    const text = error instanceof ApiError ? error.message : "Unable to sign in right now.";
    setMessage(text, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Sign In";
  }
});
