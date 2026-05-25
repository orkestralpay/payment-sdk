/** Route paths for each hosted field iframe relative to `hostedFieldsUrl`. */
export interface FieldPaths {
  /** Path for the card number field. E.g. "/card-number" */
  cardNumber: string;
  /** Path for the CVV field. E.g. "/cvv" */
  cvv: string;
  /** Path for the expiry date field. E.g. "/expiry" */
  expiry: string;
}

/** Identifies one of the three credit card hosted fields. */
export type CreditCardFieldName = 'cardNumber' | 'cvv' | 'expiry';

/** SDK configuration provided by the merchant at initialization. */
export interface SDKConfig {
  /** Public key used to authenticate the merchant. */
  publicKey: string;

  /** Base URL of the hosted fields server. E.g. "https://fields.provider.com" */
  hostedFieldsUrl: string;

  /** Unique identifier that links all hosted field iframes to the same payment session. Auto-generated (32-char hex) if not provided. */
  sessionId?: string;

  /** Route paths for each hosted field iframe. */
  fieldPaths: FieldPaths;

  /** Timeout in milliseconds for tokenization requests. @default 30000 */
  tokenizeTimeout?: number;
}

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

/** Field configuration for individual hosted fields. */
export interface FieldConfig {
  /** Placeholder text displayed inside the field. */
  placeholder?: string;
  /** CSS selector for the container where the iframe will be injected. */
  selector: string;
  /** Per-field style overrides (merged with global styles, field wins). */
  styles?: FieldStyles;
}

/** Configuration for a credit card form with hosted fields. */
export interface CreditCardOptions {
  /** Configuration for the card number field. */
  cardNumber: FieldConfig;
  /** Configuration for the CVV field. */
  cvv: FieldConfig;
  /** Configuration for the expiry date field. */
  expiry: FieldConfig;
  /** Global styles applied to all fields (overridden by per-field styles). */
  styles?: FieldStyles;
}

/** Billing address details for cardholder verification. */
export interface BillingAddress {
  /** City name. */
  city?: string;
  /** ISO 3166-1 alpha-2 country code. E.g. "BR", "US" */
  country?: string;
  /** Postal/ZIP code. */
  postalCode?: string;
  /** State, province, or region. */
  state?: string;
  /** Street address line. */
  street?: string;
}

/** Options passed to `CreditCard.tokenize()`. */
export interface TokenizeOptions {
  /** Whether to vault the card for future payments. @default false */
  saveCard?: boolean;

  /** Required when `saveCard` is true. Associates the card with a customer. */
  customerId?: string;

  /** Cardholder's full name. */
  customerName?: string;

  /** Cardholder's tax ID or national document (e.g. CPF, DNI, RUT). */
  customerDocument?: string;

  /** Billing address associated with the card. */
  billingAddress?: BillingAddress;
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

/** Discriminated union representing a tokenization outcome. */
export type TokenizeResponse =
  | { data: TokenizeResult; success: true }
  | { error: TokenizeError; success: false };

/**
 * Event names emitted by hosted fields.
 *
 * Grouped semantically:
 * - Focus events: `blur`, `focus`
 * - State events: `change`, `validation`
 * - Lifecycle events: `error`, `ready`
 */
export type FieldEventName =
  | 'blur'
  | 'focus'

  | 'change'
  | 'validation'

  | 'error'
  | 'ready';

/** Emitted when a hosted field gains or loses focus. */
export interface FieldFocusEvent {
  /** Which field emitted the event. */
  field: CreditCardFieldName;
}

/** Emitted when a hosted field value changes. */
export interface FieldChangeEvent {
  /** Whether the field value is complete and valid. */
  complete: boolean;
  /** Whether the field is empty. */
  empty: boolean;
  /** Which field emitted the event. */
  field: CreditCardFieldName;
}

/** Emitted when field validation state changes. */
export interface FieldValidationEvent {
  /** Validation error message when `valid` is false. */
  error?: string;
  /** Which field emitted the event. */
  field: CreditCardFieldName;
  /** Whether the current value is valid. */
  valid: boolean;
}

/** Emitted when a hosted field iframe is fully loaded and ready. */
export interface FieldReadyEvent {
  /** Which field emitted the event. */
  field: CreditCardFieldName;
}

/** Emitted when an unexpected error occurs inside a hosted field. */
export interface FieldErrorEvent {
  /** Machine-readable error code. */
  code: string;
  /** Which field triggered the error, if identifiable. */
  field?: CreditCardFieldName;
  /** Human-readable error description. */
  message: string;
}

/** Maps event names to their respective payload interfaces. */
export interface FieldEventMap {
  /** Fired when a field loses focus. */
  blur: FieldFocusEvent;
  /** Fired when field content changes. */
  change: FieldChangeEvent;
  /** Fired on unexpected iframe errors. */
  error: FieldErrorEvent;
  /** Fired when a field gains focus. */
  focus: FieldFocusEvent;
  /** Fired when a field iframe is loaded and ready. */
  ready: FieldReadyEvent;
  /** Fired when field validation state changes. */
  validation: FieldValidationEvent;
}

/** Messages sent from the SDK to hosted field iframes. */
export type SDKToIframeMessage =
  /** Applies visual styles to the field input element. */
  | { action: 'applyStyles'; styles: FieldStyles }
  /** Sets the placeholder text of the field input. */
  | { action: 'setPlaceholder'; placeholder: string }
  /** Requests tokenization of the collected card data. */
  | { action: 'tokenize'; customerId?: string; saveCard: boolean; sessionId: string };

/** Messages sent from hosted field iframes back to the SDK. */
export type IframeToSDKMessage =
  /** The iframe has loaded and is ready to accept input. */
  | { field: string; type: 'ready' }

  /** The field lost focus. */
  | { field: string; type: 'blur' }
  /** The field gained focus. */
  | { field: string; type: 'focus' }

  /** The field value changed (empty/complete state updated). */
  | { complete: boolean; empty: boolean; field: string; type: 'change' }
  /** The field validation state changed. */
  | { error?: string; field: string; type: 'validation'; valid: boolean }

  /** Tokenization succeeded — contains the token data. */
  | { data: TokenizeResult; success: true; type: 'tokenizeResult' }
  /** Tokenization failed — contains error details. */
  | { error: TokenizeError; success: false; type: 'tokenizeResult' }

  /** An unexpected error occurred inside the iframe. */
  | { code: string; field?: string; message: string; type: 'error' };
