/** Route paths for each hosted field iframe relative to `hostedFieldsUrl`. */
export interface FieldPaths {
  /** Path for the card number field. E.g. "/card-number" */
  cardNumber: string;
  /** Path for the CVV field. E.g. "/cvv" */
  cvv: string;
  /** Path for the expiry date field. E.g. "/expiry" */
  expiry: string;
}

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
