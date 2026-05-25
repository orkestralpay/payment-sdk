import type {
  CreditCardFieldName,
  CreditCardOptions,
  FieldEventMap,
  FieldEventName,
  SDKConfig,
  TokenizeOptions,
  TokenizeResponse,
} from './core/types';

import { validateConfig } from './core/config';
import { CreditCard } from './methods/credit-card';

/** Main entry point for the Payment SDK. */
export class PaymentSDK {
  readonly #config: SDKConfig;
  #creditCard: CreditCard | null = null;

  private constructor(config: SDKConfig) {
    this.#config = config;
  }

  /**
   * Initializes the SDK.
   * @param config - SDK configuration.
   */
  static init(config: SDKConfig): PaymentSDK {
    const validatedConfig = validateConfig(config);
    return new PaymentSDK(validatedConfig);
  }

  /**
   * Creates credit card hosted fields and injects iframes into the given containers.
   * @param options - Field selectors, styles, and placeholders.
   */
  createCreditCard(options: CreditCardOptions): CreditCard {
    this.#creditCard?.destroy();
    this.#creditCard = new CreditCard(this.#config, options);
    return this.#creditCard;
  }

  /** Returns the current session ID. */
  getSessionId(): string {
    // sessionId is guaranteed to be defined after validation
    return this.#config.sessionId!;
  }

  /** Destroys the SDK instance and releases all resources. */
  destroy(): void {
    this.#creditCard?.destroy();
    this.#creditCard = null;
  }
}

export type {
  SDKConfig,
  CreditCardOptions,
  TokenizeOptions,
  TokenizeResponse,
  FieldEventName,
  FieldEventMap,
  CreditCardFieldName,
};

export type {
  FieldConfig,
  FieldPaths,
  FieldStyles,
  TokenizeResult,
  TokenizeError,
  BillingAddress,
  FieldFocusEvent,
  FieldChangeEvent,
  FieldValidationEvent,
  FieldReadyEvent,
  FieldErrorEvent,
} from './core/types';

export { ErrorCode } from './core/constants';
