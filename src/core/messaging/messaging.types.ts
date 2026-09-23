import type { FieldStyles, PaymentResult, TokenizeResult } from '../types';

/** Messages sent from the SDK to hosted field iframes. */
export type SDKToIframeMessage =
  /** Applies visual styles to the field input element. */
  | { action: 'applyStyles'; styles: FieldStyles }
  /** Sets the placeholder text of the field input. */
  | { action: 'setPlaceholder'; placeholder: string }
  | { action: 'tokenize'; correlationId: string; paymentIntentId: string }
  | { action: 'pay'; correlationId: string; paymentIntentId: string }
  | {
      action: 'payWithSavedCard';
      correlationId: string;
      paymentIntentId: string;
      token: string;
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

  | { correlationId: string; data: TokenizeResult; type: 'tokenizeResult' }
  | { correlationId: string; data: PaymentResult; type: 'payResult' }
  | { correlationId: string; data: PaymentResult; type: 'payWithSavedCardResult' }

  /** An unexpected error occurred inside the iframe. */
  | { code: string; correlationId?: string; field?: string; message: string; type: 'error' };
