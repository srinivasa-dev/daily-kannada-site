import { ApiError, resetPasswordRequest } from "./api.js";

const form = document.getElementById("reset-password-form");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");
const submitButton = document.getElementById("reset-password-submit");
const message = document.getElementById("reset-password-message");
const tokenNotice = document.getElementById("token-notice");
const passwordToggles = document.querySelectorAll(".password-toggle");

const token = new URLSearchParams(window.location.search).get("token") || "";

function setMessage(text, tone) {
  message.textContent = text;
  message.className = `status-message${tone ? ` ${tone}` : ""}`;
}

function disableForm() {
  submitButton.disabled = true;
  passwordInput.disabled = true;
  confirmPasswordInput.disabled = true;
}

function setTokenState() {
  if (token) {
    tokenNotice.textContent = "Reset token detected. Enter a new password to continue.";
    tokenNotice.className = "token-notice";
    return;
  }

  tokenNotice.textContent = "This reset link is invalid or incomplete. Request a new password reset email.";
  tokenNotice.className = "token-notice error";
  disableForm();
}

setTokenState();

passwordToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const targetId = toggle.dataset.target || "";
    const input = document.getElementById(targetId);
    if (!(input instanceof HTMLInputElement)) return;

    const isVisible = input.type === "text";
    input.type = isVisible ? "password" : "text";
    toggle.setAttribute("aria-pressed", String(!isVisible));
    toggle.setAttribute(
      "aria-label",
      `${isVisible ? "Show" : "Hide"} ${targetId === "password" ? "new" : "confirm"} password`
    );
    toggle.classList.toggle("is-visible", !isVisible);
  });
});

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

  if (password.length < 6) {
    setMessage("Use at least 6 characters for the new password.", "error");
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
    disableForm();
    tokenNotice.textContent = "Password reset complete. This link can no longer be used.";
    tokenNotice.className = "token-notice success";
    setMessage("Password reset successful. You can return to the app and sign in with the new password.", "success");
  } catch (error) {
    if (error instanceof ApiError && error.code === "INVALID_TOKEN") {
      disableForm();
      tokenNotice.textContent = "This reset link is invalid or has already been used. Request a new password reset email.";
      tokenNotice.className = "token-notice error";
      setMessage("This reset link is invalid or has already been used.", "error");
      return;
    }

    const text =
      error instanceof ApiError
        ? error.message
        : "Unable to reset password right now. Please try again.";
    setMessage(text, "error");
  } finally {
    if (!passwordInput.disabled && !confirmPasswordInput.disabled) {
      submitButton.disabled = false;
    }
    submitButton.textContent = "Reset Password";
  }
});
