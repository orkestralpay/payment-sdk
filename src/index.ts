import type { SDKConfig } from './core/config/config.types';
import type { CreditCardOptions } from './methods/credit-card/credit-card.types';

import { validateConfig } from './core/config/config';
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
  FieldConfig,
  FieldStyles,
  TokenizeResult,
  TokenizeError,
  BillingAddress,
  CreditCardFieldName,
  CreditCardOptions,
  TokenizeOptions,
  TokenizeResponse,
} from './methods/credit-card/credit-card.types';
export type { FieldPaths, SDKConfig } from './core/config/config.types';
export type {
  FieldEventMap,
  FieldEventName,
  FieldFocusEvent,
  FieldChangeEvent,
  FieldValidationEvent,
  FieldReadyEvent,
  FieldErrorEvent,
} from './core/events/events.types';

export { ErrorCode } from './core/constants';
