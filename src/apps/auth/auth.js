import {
  getCurrentUser,
  getSession,
  hasSupabaseConfig,
  sanitizeEmail,
  signInWithPassword,
  signUpUser,
  validateAuthFields,
} from '../../features/auth/auth.service.js';
import { AUTH_UI_TEXT } from '../../shared/constants/ui-text.ar.js';
import { ROUTES } from '../../shared/constants/routes.js';
import { createIcon } from '../../shared/ui/visual/icons.js';
import { createAuthAmbientSVG } from '../../shared/ui/visual/svg-hero-scarf.js';
import { hydrateAuthPageCopy } from './auth.copy.js';
import { runtimeGuard, state, setState } from './auth.state.js';

const AUTH_INTENTS = new Set(['signup', 'access']);

hydrateAuthPageCopy();
runtimeGuard.assertUiConsistency('auth', ['.auth-shell', '.auth-layout']);
renderAuthBackground();

function getAuthIntent() {
  const intent = new URLSearchParams(window.location.search).get('intent') || 'signup';
  return AUTH_INTENTS.has(intent) ? intent : 'signup';
}

function getIntentCopy() {
  const intent = getAuthIntent();
  return {
    intent,
    guidance: AUTH_UI_TEXT.guidance[intent],
    title: intent === 'access' ? AUTH_UI_TEXT.copy.accessTitle : AUTH_UI_TEXT.copy.signupTitle,
    subtitle: intent === 'access' ? AUTH_UI_TEXT.copy.accessSubtitle : AUTH_UI_TEXT.copy.signupSubtitle,
    submit: intent === 'access' ? AUTH_UI_TEXT.copy.accessSubmit : AUTH_UI_TEXT.copy.signupSubmit,
    loading: intent === 'access' ? AUTH_UI_TEXT.copy.signingIn : AUTH_UI_TEXT.copy.signingUp,
    icon: intent === 'access' ? 'lock' : 'plus',
  };
}

function getRoot() {
  return document.getElementById('authRoot');
}

function getIntentHref(nextIntent) {
  const params = new URLSearchParams(window.location.search);
  params.set('intent', nextIntent);
  return `${ROUTES.auth}?${params.toString()}`;
}

function renderIntentSwitch(intent) {
  const isAccess = intent === 'access';
  const prompt = isAccess ? AUTH_UI_TEXT.copy.switchToSignupPrompt : AUTH_UI_TEXT.copy.switchToAccessPrompt;
  const action = isAccess ? AUTH_UI_TEXT.copy.switchToSignupAction : AUTH_UI_TEXT.copy.switchToAccessAction;
  const href = getIntentHref(isAccess ? 'signup' : 'access');
  return `<p class="auth-alt"><span>${prompt}</span><a href="${href}">${action}</a></p>`;
}

function renderAuthBackground() {
  const slot = document.querySelector('.auth-bg-visual');
  if (!slot || slot.querySelector('.auth-ambient-visual')) return;
  slot.innerHTML = createAuthAmbientSVG();
}

function revealAuthFlow() {
  document.body.classList.remove('auth-is-resolving');
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
}

function getEmailField() {
  return document.getElementById('email');
}

function getPasswordField() {
  return document.getElementById('password');
}

function getSubmitButton() {
  return document.querySelector('#authForm .auth-submit');
}

function setLoading(isLoading) {
  [getEmailField(), getPasswordField(), getSubmitButton()].forEach((field) => {
    if (field) field.disabled = isLoading;
  });
  const submitButton = getSubmitButton();
  if (!submitButton) return;
  const copy = getIntentCopy();
  submitButton.textContent = isLoading ? copy.loading : copy.submit;
}

function showError(message) {
  const feedback = document.getElementById('authFeedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = 'auth-feedback is-visible is-error';
}

function normalizeAuthError(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('already') || message.includes('registered')) {
    return AUTH_UI_TEXT.feedback.accountAlreadyExists;
  }
  return error?.message || AUTH_UI_TEXT.feedback.genericError;
}

function normalizeAccessError(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('invalid') || message.includes('credentials')) {
    return AUTH_UI_TEXT.feedback.invalidCredentials;
  }
  return error?.message || AUTH_UI_TEXT.feedback.accessFailed;
}

async function checkEmailConfirmed() {
  runtimeGuard.trace('AUTH_CONFIRMATION_CHECK_STARTED', {});
  const { data, error } = await getCurrentUser();
  const user = data?.user || null;

  if (error || !user) {
    runtimeGuard.trace('AUTH_CONFIRMATION_PENDING', {});
    showError('لم يتم التأكيد بعد، تحقق من بريدك وأعد المحاولة');
    return;
  }

  runtimeGuard.trace('AUTH_CONFIRMATION_READY', { userId: user.id });
  window.location.replace('/entry');
}

function renderConfirmScreen(email) {
  getRoot().innerHTML = `
    <div class="auth-confirm reveal">
      <a href="/" class="auth-back">العودة</a>
      <div class="auth-step-visual">
        ${createIcon('mail', 'xl')}
      </div>
      <h2>تحقق من بريدك</h2>
      <p>أرسلنا رابط التأكيد إلى ${email}</p>
      <p>بعد الضغط على الرابط، ارجع هنا وتابع.</p>
      <div id="authFeedback" class="auth-feedback" role="alert" aria-live="polite"></div>
      <div class="auth-actions">
        <button id="checkStatus" class="auth-submit">
          أكدت البريد — تابع
        </button>
      </div>
    </div>
  `;
  document.getElementById('checkStatus').addEventListener('click', checkEmailConfirmed);
  revealAuthFlow();
}

async function handleSignup(email, password) {
  setLoading(true);

  const { user, session, error } = await signUpUser(email, password);

  if (error) {
    runtimeGuard.trace('AUTH_SIGNUP_FAILED', { email });
    showError(normalizeAuthError(error));
    setLoading(false);
    return;
  }

  if (session?.access_token) {
    runtimeGuard.trace('AUTH_SIGNUP_SESSION_CREATED', { userId: user?.id || null });
    window.location.replace('/entry');
    return;
  }

  runtimeGuard.trace('AUTH_SIGNUP_CONFIRMATION_SENT', { email, userId: user?.id || null });
  setState({ ui: { view: 'confirm', cachedEmail: email } });
  renderConfirmScreen(email);
}

async function handleAccess(email, password) {
  setLoading(true);

  const { error } = await signInWithPassword({ email, password });

  if (error) {
    runtimeGuard.trace('AUTH_ACCESS_FAILED', { email });
    showError(normalizeAccessError(error));
    setLoading(false);
    return;
  }

  runtimeGuard.trace('AUTH_ACCESS_SESSION_CREATED', { email });
  window.location.replace('/entry');
}

function handleSubmit(event) {
  runtimeGuard.trackEvent('auth.submit');
  event.preventDefault();

  const email = sanitizeEmail(getEmailField().value);
  const password = getPasswordField().value;
  const { intent } = getIntentCopy();
  const validationMessage = validateAuthFields(email, password, {
    mode: intent,
    text: AUTH_UI_TEXT.validation,
  });

  if (validationMessage) {
    showError(validationMessage);
    return;
  }

  setState({ ui: { cachedEmail: email, cachedPassword: password } });
  if (intent === 'access') {
    handleAccess(email, password);
    return;
  }
  handleSignup(email, password);
}

function renderForm() {
  const root = getRoot();
  const copy = getIntentCopy();
  root.innerHTML = `
    <div class="auth-form-block">
      <a href="/" class="auth-back">${AUTH_UI_TEXT.copy.backHome}</a>
      <div class="auth-step-visual">
        ${createIcon(copy.icon, 'lg')}
      </div>
      <h2>${copy.title}</h2>
      <p>${copy.subtitle}</p>
      <div id="authFeedback" class="auth-feedback" role="alert" aria-live="polite"></div>
      <form id="authForm" class="auth-form">
        <label class="auth-form-field" for="email">
          <span>${AUTH_UI_TEXT.copy.emailLabel}</span>
          <span class="auth-input-row">
            ${createIcon('mail', 'sm')}
            <input type="email" id="email" required dir="ltr" autocomplete="username" />
          </span>
        </label>
        <label class="auth-form-field" for="password">
          <span>${AUTH_UI_TEXT.copy.passwordLabel}</span>
          <span class="auth-input-row">
            ${createIcon('lock', 'sm')}
            <input type="password" id="password" required dir="ltr" autocomplete="${copy.intent === 'access' ? 'current-password' : 'new-password'}" placeholder="${AUTH_UI_TEXT.copy.passwordPlaceholder}" />
          </span>
        </label>
        <button type="submit" class="auth-submit">
          ${copy.submit}
        </button>
      </form>
      ${renderIntentSwitch(copy.intent)}
    </div>
  `;
  document.getElementById('authForm').addEventListener('submit', handleSubmit);
}

function renderAuthPoints() {
  const authPoints = document.querySelector('.auth-points');
  if (!authPoints) return;
  authPoints.innerHTML = getIntentCopy().guidance.points
    .map(([titleText, description], index) => `
      <article class="auth-point${index === 2 ? ' layout-density-optional' : ''}">
        ${createIcon('check', 'sm')}
        <div>
          <strong>${titleText}</strong>
          <span>${description}</span>
        </div>
      </article>
    `)
    .join('');
}

async function initAuth() {
  if (state.ui.view === 'confirm') return;

  renderForm();
  renderAuthPoints();

  if (!hasSupabaseConfig) {
    showError(AUTH_UI_TEXT.feedback.authUnavailable);
    setLoading(true);
    revealAuthFlow();
    return;
  }

  const { data, error } = await getSession();
  if (error) throw error;

  if (data?.session?.user) {
    window.location.replace('/entry');
    return;
  }

  revealAuthFlow();
}

initAuth().catch((error) => {
  console.error('Auth init failed:', error);
  showError(AUTH_UI_TEXT.feedback.sessionCheckFailed);
  revealAuthFlow();
});
