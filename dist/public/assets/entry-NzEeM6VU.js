import{a as b,H as v,A as E,c}from"./icons-6t8fWUnl.js";/* empty css             */import{c as T,h as y,g,b as p}from"./create-state-store-DF-ygWbV.js";import{g as _}from"./tenant.service-7sGzkED-.js";import{a as I}from"./svg-hero-scarf-WWxnzTzq.js";const u=T({ui:{view:"loading"},session:{user:null}},{label:"entry"}),k=u.setState,a=u.runtimeGuard,n=E.entry,s=document.getElementById("entryRoot");b(v.entryPage);a.assertUiConsistency("entry",["#entryRoot"]);function N(){const e=document.querySelector(".auth-bg-visual");e&&(e.innerHTML=I())}function o(){document.body.classList.remove("auth-is-resolving"),document.querySelectorAll(".reveal").forEach(e=>e.classList.add("is-visible"))}function w(){s.innerHTML=`
    <div class="auth-form-block">
      <div class="auth-step-visual">
        ${c("check","lg")}
      </div>
      <h2>${n.loadingTitle}</h2>
      <p>${n.loadingText}</p>
    </div>
  `}function A(e){s.innerHTML=`
    <div class="auth-confirm reveal">
      <div class="auth-step-visual">
        ${c("mail","xl")}
      </div>
      <h2>${n.confirmTitle}</h2>
      <p>${n.confirmSent(e)}</p>
      <p>${n.confirmHint}</p>
      <div id="entryFeedback" class="auth-feedback" role="alert" aria-live="polite"></div>
      <div class="auth-actions">
        <button id="entryCheck" class="auth-submit">
          ${n.confirmAction}
        </button>
        <a href="/auth" class="auth-secondary">
          ${n.backToAuth}
        </a>
      </div>
    </div>
  `,document.getElementById("entryCheck").addEventListener("click",R),o()}function d(e){s.innerHTML=`
    <div class="auth-form-block">
      <div class="auth-step-visual">
        ${c("alert","lg")}
      </div>
      <h2>${n.errorTitle}</h2>
      <p>${e}</p>
      <div class="auth-actions">
        <a href="/auth" class="auth-submit">
          ${n.backToAuth}
        </a>
      </div>
    </div>
  `,o()}function l(e){const t=document.getElementById("entryFeedback");t&&(t.textContent=e,t.className="auth-feedback is-visible is-error")}function f(e){return!!(e!=null&&e.email_confirmed_at||e!=null&&e.confirmed_at)}async function m(e){if(!(e!=null&&e.id)){d(n.accountReadError);return}if(k({session:{user:e}}),!f(e)){a.trace("ENTRY_EMAIL_UNCONFIRMED",{userId:e.id}),A(e.email);return}try{const{data:t,error:i}=await _(e.id);if(i){a.trace("ENTRY_TENANT_FETCH_FAILED",{userId:e.id}),window.location.replace("/onboarding");return}t!=null&&t.id?(a.trace("ENTRY_ROUTE_TO_ADMIN",{userId:e.id,tenantId:t.id}),window.location.replace("/admin")):(a.trace("ENTRY_ROUTE_TO_ONBOARDING",{userId:e.id}),window.location.replace("/onboarding"))}catch(t){console.error("Entry route failed:",t),window.location.replace("/onboarding")}}async function R(){const e=document.getElementById("entryFeedback");e&&(e.textContent="",e.className="auth-feedback");const t=document.getElementById("entryCheck");t&&(t.disabled=!0);const{data:i,error:h}=await p(),r=(i==null?void 0:i.user)||null;if(h||!r){t&&(t.disabled=!1),l(n.confirmationPending);return}if(!f(r)){t&&(t.disabled=!1),l(n.confirmationLinkPending);return}await m(r)}async function S(){var i;if(N(),w(),o(),!y){d(n.serviceUnavailable);return}const{data:e,error:t}=await g();if(t||!((i=e==null?void 0:e.session)!=null&&i.user)){a.trace("ENTRY_NO_SESSION",{}),window.location.replace("/auth?intent=access");return}a.trace("ENTRY_SESSION_FOUND",{userId:e.session.user.id}),await m(e.session.user)}S().catch(e=>{console.error("Entry boot failed:",e),d(n.bootFailed),o()});
