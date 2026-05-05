import{a as d,c as i,H as u}from"./icons-6t8fWUnl.js";import{c as h}from"./svg-hero-scarf-WWxnzTzq.js";const p={account:`
    <circle cx="50" cy="34" r="12" fill="none" stroke="currentColor" stroke-width="4"/>
    <path d="M28 72c5-18 39-18 44 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <path d="M86 30h30M86 48h22M86 66h34" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  `,products:`
    <path d="M36 38 72 22l36 16-36 16-36-16Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
    <path d="M36 38v30l36 16 36-16V38" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
    <path d="M72 54v30M54 30l36 16" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  `,orders:`
    <path d="M38 26h44a12 12 0 0 1 12 12v34a12 12 0 0 1-12 12H38a12 12 0 0 1-12-12V38a12 12 0 0 1 12-12Z" fill="none" stroke="currentColor" stroke-width="4"/>
    <path d="M42 48h34M42 64h22" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <path d="M102 48h22M116 38l10 10-10 10" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  `};function f(r,o="visual-svg visual-svg--support landing-how-card-visual"){const e=p[r];return e?`
    <svg class="${o}" viewBox="0 0 144 104" aria-hidden="true">
      ${e}
    </svg>
  `:""}function k(r="visual-svg visual-svg--background landing-problem-visual"){return`
    <svg class="${r}" viewBox="0 0 720 320" preserveAspectRatio="none" aria-hidden="true">
      <path d="M64 82c54-38 124-34 172 12 38 37 94 44 148 15 72-39 154-22 208 38" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
      <path d="M92 216c44-28 91-25 132 9 45 38 98 36 145-4 55-47 124-43 178 8" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="14 18"/>
      <path d="M514 66c38 0 68 30 68 68 0 28-16 50-40 61" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
      <path d="M208 70c28 0 50 22 50 50 0 20-11 37-28 45" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
      <circle cx="154" cy="126" r="10" fill="currentColor"/>
      <circle cx="316" cy="178" r="8" fill="currentColor"/>
      <circle cx="564" cy="214" r="10" fill="currentColor"/>
      <circle cx="604" cy="96" r="7" fill="currentColor"/>
      <path d="M116 154h58M456 132h64M248 240h92" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    </svg>
  `}d(u.landing);const n=document.querySelector(".landing-hero-scarf-slot"),s=document.querySelector(".landing-demo-indicator"),l=document.querySelector(".landing-problem-visual-slot"),g=Array.from(document.querySelectorAll(".landing-how-visual-slot")),c=Array.from(document.querySelectorAll(".landing-step-card")).slice(0,3),a=Array.from(document.querySelectorAll(".flow-card"));function m(){const r=document.querySelector(".platform-strip");if(!r)return;const o=["whatsapp","instagram","messenger","telegram","facebook","tiktok"];r.innerHTML=o.map(e=>i(e,"md")).join("")}function v(){const r=document.querySelectorAll(".reveal"),o=new IntersectionObserver(e=>{e.forEach(t=>{t.isIntersecting&&(t.target.classList.add("is-visible"),o.unobserve(t.target))})},{threshold:.15});r.forEach(e=>o.observe(e))}n&&!n.querySelector(".landing-hero-scarf")&&(n.innerHTML=h());m();v();s&&(s.innerHTML=i("arrow","sm"));l&&!l.querySelector(".landing-problem-visual")&&(l.innerHTML=k());g.forEach(r=>{const o=r.getAttribute("data-how-visual");o&&!r.querySelector(".landing-how-card-visual")&&(r.innerHTML=f(o))});[["alert","lg",c[0],"landing-step-card--iconic"],["help","lg",c[1],"landing-step-card--iconic"],["clock","lg",c[2],"landing-step-card--iconic"],["box","md",a[0]],["send","md",a[1]]].forEach(([r,o,e,t])=>{e&&!e.querySelector(".ui-icon")&&(t&&e.classList.add(t),e.insertAdjacentHTML("afterbegin",i(r,o)))});
