/** Default timeout in milliseconds for tokenization requests. */
export const DEFAULT_TOKENIZE_TIMEOUT_MS = 30000;

/** Number of hosted fields in a credit card form. */
export const CREDIT_CARD_FIELD_COUNT = 3;

/** Valid credit card field names. */
export const VALID_FIELD_NAMES = new Set(['cardNumber', 'expiry', 'cvv']);

/** Error codes returned by the SDK. */
export const ErrorCode = {
  IFRAME_NOT_FOUND: 'IFRAME_NOT_FOUND',
  MISSING_CUSTOMER_ID: 'MISSING_CUSTOMER_ID',
  SDK_DESTROYED: 'SDK_DESTROYED',
  TOKENIZE_BUSY: 'TOKENIZE_BUSY',
  TOKENIZE_TIMEOUT: 'TOKENIZE_TIMEOUT',
} as const;
