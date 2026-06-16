import type { FieldStyles, TokenizeError, TokenizeResult } from '../../core/types';

export type { CreditCardFieldName, FieldStyles, TokenizeError, TokenizeResult } from '../../core/types';

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

/** Discriminated union representing a tokenization outcome. */
export type TokenizeResponse =
  | { data: TokenizeResult; success: true }
  | { error: TokenizeError; success: false };
