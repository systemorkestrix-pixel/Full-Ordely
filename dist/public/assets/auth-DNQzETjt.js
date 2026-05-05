import{a as S,H as y,A as s,c as r}from"./icons-6t8fWUnl.js";/* empty css             */import{c as A,h as w,g as E,s as v,a as T,b as I}from"./create-state-store-DF-ygWbV.js";import{a as _}from"./svg-hero-scarf-WWxnzTzq.js";const k=/^[^\s@]+@[^\s@]+\.[^\s@]+$/,C=8,N=72;function U(t){return String(t||"").trim().toLowerCase()}function $(t,e){return t.length<C?e.passwordTooShort:t.length>N?e.passwordTooLong:!/[A-Za-z]/.test(t)||!/\d/.test(t)?e.passwordNeedsLettersAndNumbers:""}function L(t,e,{mode:n,text:a}){return!t||!e?a.accountFieldsRequired:k.test(t)?n==="signup"?$(e,a):"":a.emailInvalid}const P={auth:"/auth"};function H(){S(y.authPage)}const p=A({ui:{view:"form",loading:!1,error:null,mode:"signup",cachedEmail:"",cachedPassword:""},entities:{products:[],categories:[],orders:[]},session:{user:null,tenant:null}},{label:"auth"}),F=p.state,m=p.setState,i=p.runtimeGuard,R=new Set(["signup","access"]);H();i.assertUiConsistency("auth",[".auth-shell",".auth-layout"]);D();function M(){const t=new URLSearchParams(window.location.search).get("intent")||"signup";return R.has(t)?t:"signup"}function d(){const t=M();return{intent:t,guidance:s.guidance[t],title:t==="access"?s.copy.accessTitle:s.copy.signupTitle,subtitle:t==="access"?s.copy.accessSubtitle:s.copy.signupSubtitle,submit:t==="access"?s.copy.accessSubmit:s.copy.signupSubmit,loading:t==="access"?s.copy.signingIn:s.copy.signingUp,icon:t==="access"?"lock":"plus"}}function f(){return document.getElementById("authRoot")}function O(t){const e=new URLSearchParams(window.location.search);return e.set("intent",t),`${P.auth}?${e.toString()}`}function G(t){const e=t==="access",n=e?s.copy.switchToSignupPrompt:s.copy.switchToAccessPrompt,a=e?s.copy.switchToSignupAction:s.copy.switchToAccessAction,c=O(e?"signup":"access");return`<p class="auth-alt"><span>${n}</span><a href="${c}">${a}</a></p>`}function D(){const t=document.querySelector(".auth-bg-visual");!t||t.querySelector(".auth-ambient-visual")||(t.innerHTML=_())}function l(){document.body.classList.remove("auth-is-resolving"),document.querySelectorAll(".reveal").forEach(t=>t.classList.add("is-visible"))}function g(){return document.getElementById("email")}function b(){return document.getElementById("password")}function h(){return document.querySelector("#authForm .auth-submit")}function u(t){[g(),b(),h()].forEach(a=>{a&&(a.disabled=t)});const e=h();if(!e)return;const n=d();e.textContent=t?n.loading:n.submit}function o(t){const e=document.getElementById("authFeedback");e&&(e.textContent=t,e.className="auth-feedback is-visible is-error")}function B(t){const e=String((t==null?void 0:t.message)||"").toLowerCase();return e.includes("already")||e.includes("registered")?s.feedback.accountAlreadyExists:(t==null?void 0:t.message)||s.feedback.genericError}function q(t){const e=String((t==null?void 0:t.message)||"").toLowerCase();return e.includes("invalid")||e.includes("credentials")?s.feedback.invalidCredentials:(t==null?void 0:t.message)||s.feedback.accessFailed}async function z(){i.trace("AUTH_CONFIRMATION_CHECK_STARTED",{});const{data:t,error:e}=await I(),n=(t==null?void 0:t.user)||null;if(e||!n){i.trace("AUTH_CONFIRMATION_PENDING",{}),o("لم يتم التأكيد بعد، تحقق من بريدك وأعد المحاولة");return}i.trace("AUTH_CONFIRMATION_READY",{userId:n.id}),window.location.replace("/entry")}function X(t){f().innerHTML=`
    <div class="auth-confirm reveal">
      <a href="/" class="auth-back">العودة</a>
      <div class="auth-step-visual">
        ${r("mail","xl")}
      </div>
      <h2>تحقق من بريدك</h2>
      <p>أرسلنا رابط التأكيد إلى ${t}</p>
      <p>بعد الضغط على الرابط، ارجع هنا وتابع.</p>
      <div id="authFeedback" class="auth-feedback" role="alert" aria-live="polite"></div>
      <div class="auth-actions">
        <button id="checkStatus" class="auth-submit">
          أكدت البريد — تابع
        </button>
      </div>
    </div>
  `,document.getElementById("checkStatus").addEventListener("click",z),l()}async function W(t,e){u(!0);const{user:n,session:a,error:c}=await T(t,e);if(c){i.trace("AUTH_SIGNUP_FAILED",{email:t}),o(B(c)),u(!1);return}if(a!=null&&a.access_token){i.trace("AUTH_SIGNUP_SESSION_CREATED",{userId:(n==null?void 0:n.id)||null}),window.location.replace("/entry");return}i.trace("AUTH_SIGNUP_CONFIRMATION_SENT",{email:t,userId:(n==null?void 0:n.id)||null}),m({ui:{view:"confirm",cachedEmail:t}}),X(t)}async function V(t,e){u(!0);const{error:n}=await v({email:t,password:e});if(n){i.trace("AUTH_ACCESS_FAILED",{email:t}),o(q(n)),u(!1);return}i.trace("AUTH_ACCESS_SESSION_CREATED",{email:t}),window.location.replace("/entry")}function j(t){i.trackEvent("auth.submit"),t.preventDefault();const e=U(g().value),n=b().value,{intent:a}=d(),c=L(e,n,{mode:a,text:s.validation});if(c){o(c);return}if(m({ui:{cachedEmail:e,cachedPassword:n}}),a==="access"){V(e,n);return}W(e,n)}function x(){const t=f(),e=d();t.innerHTML=`
    <div class="auth-form-block">
      <a href="/" class="auth-back">${s.copy.backHome}</a>
      <div class="auth-step-visual">
        ${r(e.icon,"lg")}
      </div>
      <h2>${e.title}</h2>
      <p>${e.subtitle}</p>
      <div id="authFeedback" class="auth-feedback" role="alert" aria-live="polite"></div>
      <form id="authForm" class="auth-form">
        <label class="auth-form-field" for="email">
          <span>${s.copy.emailLabel}</span>
          <span class="auth-input-row">
            ${r("mail","sm")}
            <input type="email" id="email" required dir="ltr" autocomplete="username" />
          </span>
        </label>
        <label class="auth-form-field" for="password">
          <span>${s.copy.passwordLabel}</span>
          <span class="auth-input-row">
            ${r("lock","sm")}
            <input type="password" id="password" required dir="ltr" autocomplete="${e.intent==="access"?"current-password":"new-password"}" placeholder="${s.copy.passwordPlaceholder}" />
          </span>
        </label>
        <button type="submit" class="auth-submit">
          ${e.submit}
        </button>
      </form>
      ${G(e.intent)}
    </div>
  `,document.getElementById("authForm").addEventListener("submit",j)}function K(){const t=document.querySelector(".auth-points");t&&(t.innerHTML=d().guidance.points.map(([e,n],a)=>`
      <article class="auth-point${a===2?" layout-density-optional":""}">
        ${r("check","sm")}
        <div>
          <strong>${e}</strong>
          <span>${n}</span>
        </div>
      </article>
    `).join(""))}async function Y(){var n;if(F.ui.view==="confirm")return;if(x(),K(),!w){o(s.feedback.authUnavailable),u(!0),l();return}const{data:t,error:e}=await E();if(e)throw e;if((n=t==null?void 0:t.session)!=null&&n.user){window.location.replace("/entry");return}l()}Y().catch(t=>{console.error("Auth init failed:",t),o(s.feedback.sessionCheckFailed),l()});
