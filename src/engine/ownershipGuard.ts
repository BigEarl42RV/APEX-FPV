/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */

const CHAR_SIGNATURE = [
  83, 97, 109, 112, 115, 111, 110, 83, 121, 115, 116, 101, 109, 39, 115, 32, 76,
  76, 67,
]; // "SampsonSystem's LLC"

export const BRAND_IDENTITY = Object.freeze({
  studioName: "SampsonSystem's LLC",
  appTitle: 'Stratum FPV',
  copyrightYear: 2026,
  copyrightNotice: "© 2026 SampsonSystem's LLC. All Rights Reserved.",
  licenseTag: 'PROPRIETARY',
  proprietaryNotice:
    "Unauthorized copying, code cloning, reskinning, redistribution, or commercial hosting without written license from SampsonSystem's LLC is strictly prohibited.",
});

function computeFingerprint(seed: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `SS-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

export const BUILD_FINGERPRINT = computeFingerprint(
  `${BRAND_IDENTITY.studioName}|${BRAND_IDENTITY.appTitle}|${BRAND_IDENTITY.copyrightYear}|${BRAND_IDENTITY.licenseTag}`
);

export interface RuntimeIntegrityReport {
  authorized: boolean;
  integrityValid: boolean;
  hostname: string;
  reason: string;
  fingerprint: string;
  customOriginsCount: number;
}

const DEFAULT_TRUSTED_SUFFIXES = [
  '.run.app',
  '.googleusercontent.com',
  '.web.app',
  '.firebaseapp.com',
];

const DEFAULT_TRUSTED_EXACT = ['localhost', '127.0.0.1', '[::1]', ''];

function parseCustomAllowedOrigins(): string[] {
  try {
    const raw = (import.meta.env?.VITE_ALLOWED_ORIGINS as string | undefined) ?? '';
    return raw
      .split(',')
      .map((entry) =>
        entry
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/\/.*$/, '')
          .replace(/:\d+$/, '')
      )
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isHostnameAuthorized(hostname: string, customOrigins: string[]): boolean {
  const host = hostname.toLowerCase();
  if (DEFAULT_TRUSTED_EXACT.includes(host)) return true;
  if (DEFAULT_TRUSTED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;

  for (const allowed of customOrigins) {
    if (allowed.startsWith('*.')) {
      const suffix = allowed.slice(1); // ".domain.com"
      if (host.endsWith(suffix) || host === allowed.slice(2)) return true;
    } else if (allowed.startsWith('.')) {
      if (host.endsWith(allowed) || host === allowed.slice(1)) return true;
    } else if (host === allowed) {
      return true;
    }
  }
  return false;
}

function checkBrandIntegrity(): boolean {
  if (!Object.isFrozen(BRAND_IDENTITY)) return false;
  const expected = String.fromCharCode(...CHAR_SIGNATURE);
  if (BRAND_IDENTITY.studioName !== expected) return false;
  if (!BRAND_IDENTITY.copyrightNotice.includes(expected)) return false;
  return true;
}

export function verifyRuntimeIntegrity(): RuntimeIntegrityReport {
  const hostname =
    typeof window !== 'undefined' && window.location
      ? window.location.hostname || 'localhost'
      : 'localhost';

  const customOrigins = parseCustomAllowedOrigins();
  const integrityValid = checkBrandIntegrity();
  const authorized = isHostnameAuthorized(hostname, customOrigins);

  let reason = 'Authorized origin and verified brand integrity';
  if (!integrityValid) {
    reason = 'Brand attribution signature mismatch detected';
  } else if (!authorized) {
    reason = `Unauthorized deployment host: ${hostname}`;
  }

  return {
    authorized,
    integrityValid,
    hostname,
    reason,
    fingerprint: BUILD_FINGERPRINT,
    customOriginsCount: customOrigins.length,
  };
}

let consoleSigned = false;

export function installStudioConsoleSignature(): void {
  if (consoleSigned || typeof console === 'undefined') return;
  consoleSigned = true;
  try {
    console.info(
      `%c ${BRAND_IDENTITY.appTitle.toUpperCase()} %c ${BRAND_IDENTITY.copyrightNotice} · Proprietary Software [${BUILD_FINGERPRINT}] `,
      'background:#f59e0b;color:#09090b;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px;',
      'background:#18181b;color:#e4e4e7;border:1px solid #3f3f46;padding:2px 8px;border-radius:0 3px 3px 0;'
    );
  } catch {
    // Ignore restricted console environments
  }
}
