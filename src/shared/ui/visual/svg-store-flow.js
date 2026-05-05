export const STORE_FLOW_VISUAL_ID = "store-flow";

export function createStoreFlowSVG(className = "visual-svg visual-svg--hero store-flow-visual") {
  return `
    <svg class="${className}" viewBox="0 0 160 96" aria-hidden="true" opacity="0.9">
      <path d="M24 28h54a14 14 0 0 1 14 14v12a14 14 0 0 1-14 14H24a14 14 0 0 1-14-14V42a14 14 0 0 1 14-14Z" fill="none" stroke="currentColor" stroke-width="4.6"/>
      <path d="M48 42h30M48 54h20" fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round"/>
      <path d="M98 48h34" fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round"/>
      <path d="m122 36 16 12-16 12" fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="28" cy="48" r="6" fill="currentColor"/>
    </svg>
  `;
}

export function renderStoreFlowVisual(className = "visual-svg visual-svg--hero store-flow-visual") {
  return createStoreFlowSVG(className);
}
