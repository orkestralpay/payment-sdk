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

/** Non-sensitive card metadata returned by payment operations. */
export interface CardMetadata {
  brand: string;
  lastFourDigits: string;
}

/** Payment status returned by the backend. */
export type PaymentStatus =
  | 'APPROVED'
  | 'CHARGEBACK'
  | 'DECLINED'
  | 'DENIED'
  | 'ERROR'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'REFUND_ERROR'
  | 'SETTLED'
  | 'WAITING_CUSTOMER_PAYMENT'
  | 'WAITING_PAYMENT_METHOD'
  | 'WAITING_PSP_PAYMENT'
  | 'WAITING_REFUND';

/** Backend transaction payload. Replace with the concrete backend DTO once finalized. */
export type Transaction = Record<string, unknown>;

/** Result returned after a card is persisted in the vault. */
export interface TokenizeResult {
  card: CardMetadata;
  error: string;
  token: string;
}

/** Result returned after a payment attempt. */
export interface PaymentResult {
  card: CardMetadata;
  error: string;
  result: PaymentStatus;
  transaction: Transaction;
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
