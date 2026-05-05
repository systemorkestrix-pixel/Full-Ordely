const ICONS = {
  products: `
    <path d="M4 7.5 12 4l8 3.5-8 3.5L4 7.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M4 7.5V16.5L12 20V11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M20 7.5V16.5L12 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
  `,
  box: `
    <path d="M4 7.5 12 4l8 3.5-8 3.5L4 7.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M4 7.5v9L12 20l8-3.5v-9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M12 11v9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  `,
  categories: `<path d="M4 4H10V10H4zM14 4H20V10H14zM4 14H10V20H4zM14 14H20V20H14z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`,
  settings: `
    <path d="M4 7h16M7 12h10M10 17h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="9" cy="7" r="2" fill="currentColor"/>
    <circle cx="15" cy="12" r="2" fill="currentColor"/>
    <circle cx="12" cy="17" r="2" fill="currentColor"/>
  `,
  logout: `
    <path d="M14 4h3a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M10 16 14 12 10 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M14 12H4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  `,
  login: `
    <path d="M10 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M14 8 18 12 14 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18 12H8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  `,
  mail: `
    <path d="M4 6h16v12H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="m5 7 7 6 7-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  lock: `
    <rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="M8 10V8a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  `,
  tag: `
    <path d="M4 12 12 4h7v7l-8 8-7-7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="16" cy="8" r="1.3" fill="currentColor"/>
  `,
  price: `<path d="M12 4v16M16 7.5c0-1.4-1.8-2.5-4-2.5s-4 1.1-4 2.5 1.8 2.5 4 2.5 4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  folder: `<path d="M3.5 7.5h6l2 2h9v7.5a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V7.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`,
  image: `
    <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
    <path d="m7 17 3.5-3.5L13 16l2.5-2.5L17 15l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  check: `
    <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="m8.5 12.2 2.2 2.2 4.8-4.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  alert: `
    <path d="M12 4 3.8 18.5a1.8 1.8 0 0 0 1.6 2.5h13.2a1.8 1.8 0 0 0 1.6-2.5L12 4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M12 9v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="12" cy="17" r="1" fill="currentColor"/>
  `,
  help: `
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="M9.5 9.5a2.7 2.7 0 0 1 5.2 1c0 2.2-2.7 2.3-2.7 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="12" cy="17" r="1" fill="currentColor"/>
  `,
  clock: `
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  order: `
    <path d="M8 6h10M8 12h7M8 18h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="m5 8 2-2 2 2M7 6v12M5 16l2 2 2-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  spark: `<path d="m12 4 1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`,
  link: `
    <path d="M10 14 8.5 15.5a3.5 3.5 0 1 1-5-5L7 7a3.5 3.5 0 0 1 5 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M14 10 15.5 8.5a3.5 3.5 0 1 1 5 5L17 17a3.5 3.5 0 0 1-5 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M9 15 15 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  `,
  upload: `
    <path d="M12 16V5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="m8.5 8.5 3.5-3.5 3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5 19h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  `,
  phone: `<path d="M6.7 4.8c.4-.4 1-.6 1.6-.4l2.2.7c.7.2 1.1.9 1 1.6l-.2 2.1c0 .4.1.8.4 1.1l2.3 2.3c.3.3.7.5 1.1.4l2.1-.2c.7-.1 1.4.3 1.6 1l.7 2.2c.2.6 0 1.2-.4 1.6l-1 1c-.7.7-1.8 1-2.8.8-2.2-.5-4.4-1.7-6.3-3.7-1.9-1.9-3.2-4.1-3.7-6.3-.2-1 .1-2.1.8-2.8l1-1Z" fill="currentColor"/>`,
  message: `<path d="M5 18.5V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H9l-4 2.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`,
  send: `
    <path d="M20 4 4.5 10.2c-.9.4-.8 1.7.2 1.9l5.2 1.5 1.5 5.2c.3 1 1.5 1.1 1.9.2L20 4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M9.8 13.6 20 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  `,
  map: `
    <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <circle cx="12" cy="10" r="2.3" fill="none" stroke="currentColor" stroke-width="1.8"/>
  `,
  facebook: `<path d="M14.5 4.5h-1.8a3.2 3.2 0 0 0-3.2 3.2V11H7.2v3h2.3v6h3.2v-6h2.4l.4-3h-2.8V8.1c0-.5.4-.9.9-.9h1.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  instagram: `
    <rect x="4" y="4" width="16" height="16" rx="5" ry="5" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <circle cx="17.2" cy="6.8" r="1.1" fill="none" stroke="currentColor" stroke-width="1.8"/>
  `,
  tiktok: `<path d="M14.2 4c.5 1.7 1.8 3 3.5 3.5v2.8c-1.3 0-2.5-.4-3.5-1v5.2a4.5 4.5 0 1 1-4.5-4.5c.3 0 .7 0 1 .1v2.9a2 2 0 1 0 1 1.7V4h2.5z" fill="currentColor"/>`,
  telegram: `
    <path d="M20 5 4 11.2l5.4 1.7L11.2 19l3-3.5 4.7 3.4L20 5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="m9.4 12.9 6.7-4.2-4.9 5.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  whatsapp: `
    <path d="M12 4.2a7.8 7.8 0 0 0-6.7 11.8l-.9 3.6 3.8-1A7.8 7.8 0 1 0 12 4.2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9.3 9.1c.4 2.4 2.2 4.2 5.6 5.6.6.2 1.2 0 1.5-.5l.4-.7-2.1-1-.6.8c-1.1-.5-2-1.3-2.6-2.5l.8-.6-1-2.1-.8.4c-.8.1-1.3.3-1.2.6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  messenger: `
    <path d="M12 4.5c-4.4 0-8 3.2-8 7.2 0 2.3 1.2 4.3 3 5.6v2.2l2.4-1.3c.8.2 1.7.4 2.6.4 4.4 0 8-3.2 8-7.2s-3.6-6.9-8-6.9Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="m7.4 13.6 3.2-3.4 2.1 2.2 3.9-2.2-3.2 3.4-2.1-2.2-3.9 2.2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  plus: `<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  save: `
    <path d="M5 4h11l3 3v13H5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M8 4v5h8V4M9 20v-6h6v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
  `,
  edit: `
    <path d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="m13.5 7.5 3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  `,
  trash: `<path d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  close: `<path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  bell: `
    <path d="M12 4a4 4 0 0 0-4 4v2.4c0 .8-.3 1.6-.8 2.2L6 14h12l-1.2-1.4c-.5-.6-.8-1.4-.8-2.2V8a4 4 0 0 0-4-4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M10 18a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  `,
  globe: `
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="M3 12h18M12 3c2.4 2.5 3.7 5.8 3.7 9S14.4 18.5 12 21M12 3c-2.4 2.5-3.7 5.8-3.7 9S9.6 18.5 12 21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  `,
  chart: `
    <path d="M5 19V9M12 19V5M19 19v-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M4 19h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  `,
  refresh: `
    <path d="M20 6v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4 18v-5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18.2 9A7 7 0 0 0 6.7 6.7L4 9M5.8 15a7 7 0 0 0 11.5 2.3L20 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  list: `<path d="M5 7h14M5 12h10M5 17h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  arrow: `<path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  form: `<path d="M4 6h16v12H4zM8 10h8M8 14h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
};

const ICON_SIZES = new Set(["xs", "sm", "md", "lg", "xl"]);

function normalizeIconSize(size) {
  return ICON_SIZES.has(size) ? size : "md";
}

export function createIcon(iconName, size = "md") {
  const iconMarkup = ICONS[iconName];

  if (!iconMarkup) {
    return "";
  }

  return `<svg class="ui-icon ui-icon--${normalizeIconSize(size)}" viewBox="0 0 24 24" aria-hidden="true">${iconMarkup}</svg>`;
}

export function renderIcon(iconName, className = "ui-icon", size = "md") {
  const iconMarkup = ICONS[iconName];

  if (!iconMarkup) {
    return "";
  }

  return `<svg class="${className} ui-icon--${normalizeIconSize(size)}" viewBox="0 0 24 24" aria-hidden="true">${iconMarkup}</svg>`;
}

export function mountVisualIcons(root = document) {
  root.querySelectorAll("[data-visual-icon]").forEach((target) => {
    const iconName = target.getAttribute("data-visual-icon");
    const className = target.getAttribute("data-visual-class");
    const size = target.getAttribute("data-visual-size") || "md";
    target.innerHTML = className
      ? renderIcon(iconName, className, size)
      : createIcon(iconName, size);
  });
}
