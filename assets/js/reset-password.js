import { ApiError, resetPasswordRequest } from "./api.js";

const form = document.getElementById("reset-password-form");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");
const submitButton = document.getElementById("reset-password-submit");
const message = document.getElementById("reset-password-message");
const tokenNotice = document.getElementById("token-notice");

const token = new URLSearchParams(window.location.search).get("token") || "";

function setMessage(text, tone) {
  message.textContent = text;
  message.className = `status-message${tone ? ` ${tone}` : ""}`;
}

function setTokenState() {
  if (token) {
    tokenNotice.textContent = "Reset token detected. Enter a new password to continue.";
    tokenNotice.className = "token-notice";
    return;
  }

  tokenNotice.textContent = "This reset link is invalid or incomplete. Request a new password reset email.";
  tokenNotice.className = "token-notice error";
  submitButton.disabled = true;
  passwordInput.disabled = true;
  confirmPasswordInput.disabled = true;
}

setTokenState();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (!token) {
    setMessage("Reset token is missing from the URL.", "error");
    return;
  }

  if (!password) {
    setMessage("Enter a new password.", "error");
    return;
  }

  if (password.length < 8) {
    setMessage("Use at least 8 characters for the new password.", "error");
    return;
  }

  if (password !== confirmPassword) {
    setMessage("Passwords do not match.", "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Resetting...";
  setMessage("", "");

  try {
    await resetPasswordRequest(token, password);
    form.reset();
    setMessage("Password reset successful. You can return to the app and sign in with the new password.", "success");
  } catch (error) {
    const text =
      error instanceof ApiError
        ? error.message
        : "Unable to reset password right now. Please try again.";
    setMessage(text, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Reset Password";
  }
});
