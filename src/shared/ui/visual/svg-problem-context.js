export function createProblemSVG(
  className = "visual-svg visual-svg--background landing-problem-visual",
) {
  return `
    <svg class="${className}" viewBox="0 0 720 320" preserveAspectRatio="none" aria-hidden="true">
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
  `;
}
