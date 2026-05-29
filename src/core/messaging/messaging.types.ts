import type { BillingAddress } from '../../methods/credit-card/credit-card.types';
import type { FieldStyles, TokenizeError, TokenizeResult } from '../types';

/** Messages sent from the SDK to hosted field iframes. */
export type SDKToIframeMessage =
  /** Applies visual styles to the field input element. */
  | { action: 'applyStyles'; styles: FieldStyles }
  /** Sets the placeholder text of the field input. */
  | { action: 'setPlaceholder'; placeholder: string }
  /** Requests tokenization of the collected card data. */
  | {
      action: 'tokenize';
      billingAddress?: BillingAddress;
      correlationId: string;
      customerDocument?: string;
      customerId?: string;
      customerName?: string;
      saveCard: boolean;
      sessionId: string;
    };

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
  | { correlationId: string; data: TokenizeResult; success: true; type: 'tokenizeResult' }
  /** Tokenization failed — contains error details. */
  | { correlationId: string; error: TokenizeError; success: false; type: 'tokenizeResult' }

  /** An unexpected error occurred inside the iframe. */
  | { code: string; field?: string; message: string; type: 'error' };
