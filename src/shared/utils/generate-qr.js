import QRCode from 'qrcode';

const DEFAULT_QR_OPTIONS = {
  errorCorrectionLevel: 'M',
  margin: 1,
  scale: 8,
  width: 320,
  color: {
    dark: '#0F172A',
    light: '#FFFFFF',
  },
};

export async function generateQRCode(url, options = {}) {
  const normalizedUrl = String(url || '').trim();

  if (!normalizedUrl) {
    return '';
  }

  return QRCode.toDataURL(normalizedUrl, {
    ...DEFAULT_QR_OPTIONS,
    ...options,
  });
}
