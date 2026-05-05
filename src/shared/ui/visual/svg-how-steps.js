const HOW_STEP_SVGS = {
  account: `
    <circle cx="50" cy="34" r="12" fill="none" stroke="currentColor" stroke-width="4"/>
    <path d="M28 72c5-18 39-18 44 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <path d="M86 30h30M86 48h22M86 66h34" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  `,
  products: `
    <path d="M36 38 72 22l36 16-36 16-36-16Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
    <path d="M36 38v30l36 16 36-16V38" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
    <path d="M72 54v30M54 30l36 16" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  `,
  orders: `
    <path d="M38 26h44a12 12 0 0 1 12 12v34a12 12 0 0 1-12 12H38a12 12 0 0 1-12-12V38a12 12 0 0 1 12-12Z" fill="none" stroke="currentColor" stroke-width="4"/>
    <path d="M42 48h34M42 64h22" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <path d="M102 48h22M116 38l10 10-10 10" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  `,
};

export function createHowStepSVG(name, className = "visual-svg visual-svg--support landing-how-card-visual") {
  const svgMarkup = HOW_STEP_SVGS[name];

  if (!svgMarkup) {
    return "";
  }

  return `
    <svg class="${className}" viewBox="0 0 144 104" aria-hidden="true">
      ${svgMarkup}
    </svg>
  `;
}
