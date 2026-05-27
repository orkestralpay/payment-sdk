import type { SDKConfig } from './config.types';

import { DEFAULT_TOKENIZE_TIMEOUT_MS } from '../constants';

/**
 * Validates and normalizes the SDK configuration.
 *
 * Accepts `unknown` because this is the public entry boundary. The merchant
 * may be using plain JS or passing incorrect data. Runtime checks here guarantee
 * type safety before we trust the config internally.
 */
export function validateConfig(config: unknown): SDKConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('[PaymentSDK] Configuration object is required.');
  }

  const rawConfig = config as Record<string, unknown>;

  if (typeof rawConfig.publicKey !== 'string' || !rawConfig.publicKey) {
    throw new Error('[PaymentSDK] "publicKey" must be a non-empty string.');
  }

  if (typeof rawConfig.hostedFieldsUrl !== 'string' || !rawConfig.hostedFieldsUrl) {
    throw new Error('[PaymentSDK] "hostedFieldsUrl" must be a non-empty string.');
  }

  try {
    const url = new URL(rawConfig.hostedFieldsUrl);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('Invalid protocol');
    }
  } catch {
    throw new Error(
      '[PaymentSDK] "hostedFieldsUrl" must be a valid absolute URL (e.g. "https://fields.example.com").',
    );
  }

  if (!rawConfig.fieldPaths || typeof rawConfig.fieldPaths !== 'object') {
    throw new Error(
      '[PaymentSDK] "fieldPaths" must be an object with cardNumber, expiry, and cvv.',
    );
  }

  const fieldPaths = rawConfig.fieldPaths as Record<string, unknown>;

  for (const key of ['cardNumber', 'expiry', 'cvv'] as const) {
    if (typeof fieldPaths[key] !== 'string' || !fieldPaths[key]) {
      throw new Error(
        `[PaymentSDK] "fieldPaths.${key}" is required and must be a non-empty string.`,
      );
    }
  }

  const tokenizeTimeout =
    typeof rawConfig.tokenizeTimeout === 'number' && rawConfig.tokenizeTimeout > 0
      ? rawConfig.tokenizeTimeout
      : DEFAULT_TOKENIZE_TIMEOUT_MS;

  return {
    publicKey: rawConfig.publicKey,

    fieldPaths: {
      cardNumber: fieldPaths.cardNumber as string,
      cvv: fieldPaths.cvv as string,
      expiry: fieldPaths.expiry as string,
    },
    hostedFieldsUrl: removeTrailingSlashes(rawConfig.hostedFieldsUrl),
    sessionId: typeof rawConfig.sessionId === 'string' ? rawConfig.sessionId : generateSessionId(),
    tokenizeTimeout,
  };
}

/** Removes trailing slashes from a URL. */
function removeTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Generates a random hex session ID (32 chars). */
function generateSessionId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}
