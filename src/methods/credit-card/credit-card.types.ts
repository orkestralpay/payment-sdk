import type { FieldStyles, PaymentResult, TokenizeResult } from '../../core/types';

export type {
  CardMetadata,
  CreditCardFieldName,
  FieldStyles,
  PaymentResult,
  PaymentStatus,
  TokenizeResult,
  Transaction,
} from '../../core/types';

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

/** Options passed to `CreditCard.tokenize()`. */
export interface TokenizeOptions {
  paymentIntentId: string;
}

/** Options passed to `CreditCard.pay()`. */
export interface PayOptions {
  paymentIntentId: string;
}

/** Options passed to `CreditCard.payWithSavedCard()`. */
export interface PayWithSavedCardOptions extends PayOptions {
  token: string;
}

export type TokenizeResponse = TokenizeResult;
export type PayResponse = PaymentResult;
export type PayWithSavedCardResponse = PaymentResult;
