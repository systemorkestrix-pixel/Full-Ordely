import {
  normalizeMessengerValue,
  normalizePhoneNumber,
  normalizeTelegramValue,
  normalizeUrl,
  normalizeWhatsAppValue,
} from './site-settings.js';
import { CHANNEL_ENGINE_UI_TEXT } from '../shared/constants/ui-text.ar.js';

function normalizePhoneLikeDigits(value) {
  return String(value || '').trim().replace(/[^\d+]/g, '');
}

export function buildContactLink(channel, value, options = {}) {
  if (!value) {
    return '';
  }

  if (channel === 'phone_number') {
    const normalizedPhone = normalizePhoneLikeDigits(normalizePhoneNumber(value));
    return normalizedPhone ? `tel:${normalizedPhone}` : '';
  }

  if (channel === 'whatsapp_url') {
    const digitsOnly = normalizeWhatsAppValue(value).replace(/\D/g, '');
    if (!digitsOnly) {
      return '';
    }

    const message = String(options.message || '').trim();
    const query = message ? `?text=${encodeURIComponent(message)}` : '';
    return `https://wa.me/${digitsOnly}${query}`;
  }

  if (channel === 'messenger_url') {
    const username = normalizeMessengerValue(value);
    return username ? `https://m.me/${username}` : '';
  }

  if (channel === 'telegram_url') {
    const username = normalizeTelegramValue(value).replace(/^@/, '');
    return username ? `https://t.me/${username}` : '';
  }

  return normalizeUrl(value);
}

export function generateMessage(template, payload = {}) {
  const baseTemplate = String(template || '').trim()
    || CHANNEL_ENGINE_UI_TEXT.defaultTemplateLines.join('\n');

  return baseTemplate.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => {
    return String(payload[key] ?? '').trim();
  }).trim();
}
