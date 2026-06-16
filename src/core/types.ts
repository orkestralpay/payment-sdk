/** Identifies one of the three credit card hosted fields. */
export type CreditCardFieldName = 'cardNumber' | 'cvv' | 'expiry';

/** Controlled subset of CSS properties allowed inside hosted field iframes. */
export interface FieldStyles {
  /** Background color. E.g. "#ffffff" */
  backgroundColor?: string;
  /** Text color. E.g. "#333333" */
  color?: string;
  /** Font family. E.g. "Inter, sans-serif" */
  fontFamily?: string;
  /** Font size. E.g. "16px" */
  fontSize?: string;
  /** Font style. E.g. "normal", "italic" */
  fontStyle?: string;
  /** Font weight. E.g. "400", "bold" */
  fontWeight?: string;
  /** Letter spacing. E.g. "0.5px" */
  letterSpacing?: string;
  /** Line height. E.g. "1.5" */
  lineHeight?: string;
  /** Inner padding. E.g. "12px 16px" */
  padding?: string;
  /** Text alignment. E.g. "left", "center" */
  textAlign?: string;
  /** Text transform. E.g. "uppercase", "none" */
  textTransform?: string;
}

/** Successful tokenization result returned by `CreditCard.tokenize()`. */
export interface TokenizeResult {
  /** Detected card brand. E.g. "visa", "mastercard". */
  cardBrand?: string;
  /** Whether the card was successfully saved to the vault. */
  cardSaved?: boolean;
  /** Two-digit expiration month (01-12). */
  expiryMonth?: string;
  /** Four-digit expiration year. */
  expiryYear?: string;
  /** Last four digits of the card number. */
  lastFourDigits?: string;
  /** One-time use token representing the card data. */
  token: string;
  /** Returned when `saveCard: true`. Reusable identifier for future transactions. */
  vaultId?: string;
}

/** Error returned when tokenization fails. */
export interface TokenizeError {
  /** Machine-readable error code. E.g. "INVALID_CARD", "TOKENIZE_TIMEOUT". */
  code: string;
  /** Additional error context. */
  details?: Record<string, unknown>;
  /** Which field caused the error, if applicable. */
  field?: CreditCardFieldName;
  /** Human-readable error description. */
  message: string;
}
