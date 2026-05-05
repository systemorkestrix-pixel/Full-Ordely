export const DEFAULT_HERO_IMAGE = '';
export const DEFAULT_MAPS_URL = '';

export const BASE_SITE_SETTINGS = {
  hero_image_url: DEFAULT_HERO_IMAGE,
  phone_number: '',
  google_maps_url: DEFAULT_MAPS_URL,
  whatsapp_url: '',
  messenger_url: '',
  telegram_url: '',
  facebook_url: '',
  instagram_url: '',
  tiktok_url: '',
  orders_enabled: false,
  service_country: '',
  service_region: '',
};

function withHttpsProtocol(value) {
  const trimmedValue = String(value || '').trim();
  if (!trimmedValue) {
    return '';
  }

  if (/^(https?:)?\/\//i.test(trimmedValue)) {
    return trimmedValue.startsWith('//') ? `https:${trimmedValue}` : trimmedValue;
  }

  return `https://${trimmedValue.replace(/^\/+/, '')}`;
}

function parseUrl(value) {
  const normalizedValue = withHttpsProtocol(value);
  if (!normalizedValue) {
    return null;
  }

  try {
    return new URL(normalizedValue);
  } catch {
    return null;
  }
}

function canonicalizeUrl(value) {
  const parsedUrl = parseUrl(value);
  if (!parsedUrl) {
    return '';
  }

  parsedUrl.protocol = 'https:';
  parsedUrl.hash = '';

  if (parsedUrl.pathname !== '/') {
    parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';
  }

  return parsedUrl.toString();
}

function normalizePhoneLikeValue(value) {
  const compactValue = String(value || '').trim().replace(/[^\d+]/g, '');
  if (!compactValue) {
    return '';
  }

  if (compactValue.startsWith('+')) {
    return `+${compactValue.slice(1).replace(/\+/g, '')}`;
  }

  return compactValue.replace(/\+/g, '');
}

function extractFirstPathSegment(value) {
  return String(value || '')
    .replace(/^\/+/, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0]
    .trim();
}

export function normalizePhoneNumber(value) {
  return normalizePhoneLikeValue(value);
}

export function normalizeUrl(value) {
  return canonicalizeUrl(value);
}

export function normalizePlainText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function normalizeBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  const normalizedValue = String(value || '').trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalizedValue);
}

export function normalizeWhatsAppValue(value) {
  const trimmedValue = String(value || '').trim();
  if (!trimmedValue) {
    return '';
  }

  const parsedUrl = parseUrl(trimmedValue);
  if (parsedUrl) {
    const hostName = parsedUrl.hostname.toLowerCase();
    if (hostName.includes('wa.me')) {
      return normalizePhoneLikeValue(extractFirstPathSegment(parsedUrl.pathname));
    }

    if (hostName.includes('whatsapp.com')) {
      return normalizePhoneLikeValue(
        parsedUrl.searchParams.get('phone') || extractFirstPathSegment(parsedUrl.pathname),
      );
    }
  }

  return normalizePhoneLikeValue(trimmedValue);
}

export function normalizeTelegramValue(value) {
  const trimmedValue = String(value || '').trim();
  if (!trimmedValue) {
    return '';
  }

  const parsedUrl = parseUrl(trimmedValue);
  let username = trimmedValue;

  if (parsedUrl) {
    const hostName = parsedUrl.hostname.toLowerCase();
    if (hostName.includes('t.me') || hostName.includes('telegram.me')) {
      username = extractFirstPathSegment(parsedUrl.pathname);
    }
  }

  username = String(username || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  if (!username) {
    return '';
  }

  return `@${username}`;
}

export function normalizeMessengerValue(value) {
  const trimmedValue = String(value || '').trim();
  if (!trimmedValue) {
    return '';
  }

  const parsedUrl = parseUrl(trimmedValue);
  let username = trimmedValue;

  if (parsedUrl) {
    const hostName = parsedUrl.hostname.toLowerCase();
    if (hostName.includes('m.me')) {
      username = extractFirstPathSegment(parsedUrl.pathname);
    } else if (hostName.includes('messenger.com')) {
      username = extractFirstPathSegment(parsedUrl.pathname.replace(/^\/t\//, '/'));
    }
  }

  username = String(username || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  return username;
}

export function normalizeSiteSettings(value) {
  const nextSettings = {
    ...BASE_SITE_SETTINGS,
    ...value,
  };

  return {
    hero_image_url: normalizeUrl(nextSettings.hero_image_url),
    phone_number: normalizePhoneNumber(nextSettings.phone_number),
    google_maps_url: normalizeUrl(nextSettings.google_maps_url),
    whatsapp_url: normalizeWhatsAppValue(nextSettings.whatsapp_url),
    messenger_url: normalizeMessengerValue(nextSettings.messenger_url),
    telegram_url: normalizeTelegramValue(nextSettings.telegram_url),
    facebook_url: normalizeUrl(nextSettings.facebook_url),
    instagram_url: normalizeUrl(nextSettings.instagram_url),
    tiktok_url: normalizeUrl(nextSettings.tiktok_url),
    orders_enabled: normalizeBoolean(nextSettings.orders_enabled),
    service_country: normalizePlainText(nextSettings.service_country),
    service_region: normalizePlainText(nextSettings.service_region),
  };
}
