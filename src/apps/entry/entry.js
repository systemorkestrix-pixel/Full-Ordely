import {
  getCurrentUser,
  getSession,
  getTenantByOwner,
  hasSupabaseConfig,
} from "../../features/auth/auth.service.js";
import { AUTH_UI_TEXT, HTML_PAGE_UI_TEXT_AR } from "../../shared/constants/ui-text.ar.js";
import { applyPageCopy } from "../../shared/ui/apply-page-copy.js";
import { createIcon } from "../../shared/ui/visual/icons.js";
import { createAuthAmbientSVG } from "../../shared/ui/visual/svg-hero-scarf.js";
import { runtimeGuard, setState } from "./entry.state.js";

const ENTRY_UI_TEXT = AUTH_UI_TEXT.entry;
const root = document.getElementById("entryRoot");

applyPageCopy(HTML_PAGE_UI_TEXT_AR.entryPage);
runtimeGuard.assertUiConsistency("entry", ["#entryRoot"]);

function renderBackground() {
  const slot = document.querySelector(".auth-bg-visual");
  if (!slot) return;
  slot.innerHTML = createAuthAmbientSVG();
}

function reveal() {
  document.body.classList.remove("auth-is-resolving");
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
}

function renderLoading() {
  root.innerHTML = `
    <div class="auth-form-block">
      <div class="auth-step-visual">
        ${createIcon("check", "lg")}
      </div>
      <h2>${ENTRY_UI_TEXT.loadingTitle}</h2>
      <p>${ENTRY_UI_TEXT.loadingText}</p>
    </div>
  `;
}

function renderEmailConfirm(email) {
  root.innerHTML = `
    <div class="auth-confirm reveal">
      <div class="auth-step-visual">
        ${createIcon("mail", "xl")}
      </div>
      <h2>${ENTRY_UI_TEXT.confirmTitle}</h2>
      <p>${ENTRY_UI_TEXT.confirmSent(email)}</p>
      <p>${ENTRY_UI_TEXT.confirmHint}</p>
      <div id="entryFeedback" class="auth-feedback" role="alert" aria-live="polite"></div>
      <div class="auth-actions">
        <button id="entryCheck" class="auth-submit">
          ${ENTRY_UI_TEXT.confirmAction}
        </button>
        <a href="/auth" class="auth-secondary">
          ${ENTRY_UI_TEXT.backToAuth}
        </a>
      </div>
    </div>
  `;
  document.getElementById("entryCheck").addEventListener("click", checkAndRoute);
  reveal();
}

function renderError(message) {
  root.innerHTML = `
    <div class="auth-form-block">
      <div class="auth-step-visual">
        ${createIcon("alert", "lg")}
      </div>
      <h2>${ENTRY_UI_TEXT.errorTitle}</h2>
      <p>${message}</p>
      <div class="auth-actions">
        <a href="/auth" class="auth-submit">
          ${ENTRY_UI_TEXT.backToAuth}
        </a>
      </div>
    </div>
  `;
  reveal();
}

function showFeedback(message) {
  const feedback = document.getElementById("entryFeedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = "auth-feedback is-visible is-error";
}

function isEmailConfirmed(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

async function routeUser(user) {
  if (!user?.id) {
    renderError(ENTRY_UI_TEXT.accountReadError);
    return;
  }

  setState({ session: { user } });

  if (!isEmailConfirmed(user)) {
    runtimeGuard.trace("ENTRY_EMAIL_UNCONFIRMED", { userId: user.id });
    renderEmailConfirm(user.email);
    return;
  }

  try {
    const { data, error } = await getTenantByOwner(user.id);

    if (error) {
      runtimeGuard.trace("ENTRY_TENANT_FETCH_FAILED", { userId: user.id });
      window.location.replace("/onboarding");
      return;
    }

    if (data?.id) {
      runtimeGuard.trace("ENTRY_ROUTE_TO_ADMIN", { userId: user.id, tenantId: data.id });
      window.location.replace("/admin");
    } else {
      runtimeGuard.trace("ENTRY_ROUTE_TO_ONBOARDING", { userId: user.id });
      window.location.replace("/onboarding");
    }
  } catch (error) {
    console.error("Entry route failed:", error);
    window.location.replace("/onboarding");
  }
}

async function checkAndRoute() {
  const feedback = document.getElementById("entryFeedback");
  if (feedback) {
    feedback.textContent = "";
    feedback.className = "auth-feedback";
  }

  const btn = document.getElementById("entryCheck");
  if (btn) btn.disabled = true;

  const { data, error } = await getCurrentUser();
  const user = data?.user || null;

  if (error || !user) {
    if (btn) btn.disabled = false;
    showFeedback(ENTRY_UI_TEXT.confirmationPending);
    return;
  }

  if (!isEmailConfirmed(user)) {
    if (btn) btn.disabled = false;
    showFeedback(ENTRY_UI_TEXT.confirmationLinkPending);
    return;
  }

  await routeUser(user);
}

async function boot() {
  renderBackground();
  renderLoading();
  reveal();

  if (!hasSupabaseConfig) {
    renderError(ENTRY_UI_TEXT.serviceUnavailable);
    return;
  }

  const { data, error } = await getSession();

  if (error || !data?.session?.user) {
    runtimeGuard.trace("ENTRY_NO_SESSION", {});
    window.location.replace("/auth?intent=access");
    return;
  }

  runtimeGuard.trace("ENTRY_SESSION_FOUND", { userId: data.session.user.id });
  await routeUser(data.session.user);
}

boot().catch((error) => {
  console.error("Entry boot failed:", error);
  renderError(ENTRY_UI_TEXT.bootFailed);
  reveal();
});
