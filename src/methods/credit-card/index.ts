import type { SDKConfig } from '../../core/config/config.types';
import type { FieldEventMap, FieldEventName } from '../../core/events/events.types';
import type { IframeToSDKMessage } from '../../core/messaging/messaging.types';
import type {
  CreditCardFieldName,
  CreditCardOptions,
  TokenizeOptions,
  TokenizeResponse,
} from './credit-card.types';

import { DEFAULT_TOKENIZE_TIMEOUT_MS, ErrorCode, VALID_FIELD_NAMES } from '../../core/constants';
import { EventEmitter } from '../../core/events/events';
import { Messenger } from '../../core/messaging/messaging';
import { IframeManager } from './iframe-manager';

/** Credit card payment method. Manages hosted fields for number, expiry, and CVV. */
export class CreditCard {
  readonly #config: SDKConfig;
  readonly #messenger: Messenger;
  readonly #events: EventEmitter;
  readonly #iframeManager: IframeManager;

  #destroyed = false;
  #tokenizing = false;

  constructor(config: SDKConfig, options: CreditCardOptions) {
    this.#config = config;
    this.#events = new EventEmitter();
    this.#messenger = new Messenger(config.hostedFieldsUrl);
    this.#iframeManager = new IframeManager(config, this.#messenger);

    this.#messenger.listen(this.#handleMessage.bind(this));
    this.#iframeManager.create(options);
  }

  /** Registers a listener for a field event. Returns `this` for chaining. */
  on<K extends FieldEventName>(event: K, callback: (payload: FieldEventMap[K]) => void): this {
    this.#events.on(event, callback);
    return this;
  }

  /** Removes a previously registered listener. Returns `this` for chaining. */
  off<K extends FieldEventName>(event: K, callback: (payload: FieldEventMap[K]) => void): this {
    this.#events.off(event, callback);
    return this;
  }

  /**
   * Tokenizes card data from the hosted fields.
   * Only one tokenization can be in progress at a time.
   * @param options.saveCard - Whether to vault the card. Requires `customerId`.
   */
  async tokenize(options: TokenizeOptions = {}): Promise<TokenizeResponse> {
    if (this.#destroyed) {
      return {
        success: false,

        error: {
          code: ErrorCode.SDK_DESTROYED,
          message: 'This CreditCard instance has been destroyed.',
        },
      };
    }

    if (this.#tokenizing) {
      return {
        success: false,

        error: {
          code: ErrorCode.TOKENIZE_BUSY,
          message: 'A tokenization request is already in progress.',
        },
      };
    }

    if (options.saveCard && !options.customerId) {
      return {
        success: false,

        error: {
          code: ErrorCode.MISSING_CUSTOMER_ID,
          message: 'customerId is required when saveCard is true.',
        },
      };
    }

    return new Promise<TokenizeResponse>((resolve) => {
      const cardNumberIframe = this.#iframeManager.getIframe('cardNumber');
      if (!cardNumberIframe) {
        resolve({
          success: false,

          error: {
            code: ErrorCode.IFRAME_NOT_FOUND,
            message: 'Card number iframe is not available.',
          },
        });
        return;
      }

      this.#tokenizing = true;

      let timeoutId: ReturnType<typeof setTimeout>;

      const cleanup = () => {
        this.#tokenizing = false;
        clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
      };

      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== this.#config.hostedFieldsUrl) return;
        if (!event.data || typeof event.data !== 'object') return;

        if (event.data.type === 'tokenizeResult') {
          cleanup();
          const response = event.data as Extract<IframeToSDKMessage, { type: 'tokenizeResult' }>;
          resolve(
            response.success
              ? { data: response.data, success: true }
              : { error: response.error, success: false },
          );
        } else if (event.data.type === 'error') {
          cleanup();
          resolve({
            success: false,

            error: {
              code: event.data.code ?? 'UNKNOWN_ERROR',
              field: event.data.field as CreditCardFieldName | undefined,
              message: event.data.message ?? 'An unexpected error occurred during tokenization.',
            },
          });
        }
      };

      window.addEventListener('message', messageHandler);

      this.#messenger.send(cardNumberIframe, {
        action: 'tokenize',
        sessionId: this.#config.sessionId!,

        customerId: options.customerId,
        saveCard: options.saveCard ?? false,
      });

      timeoutId = setTimeout(() => {
        cleanup();

        resolve({
          success: false,

          error: {
            code: ErrorCode.TOKENIZE_TIMEOUT,
            message: 'Tokenization request timed out.',
          },
        });
      }, this.#config.tokenizeTimeout ?? DEFAULT_TOKENIZE_TIMEOUT_MS);
    });
  }

  /** Destroys the instance, removing iframes and cleaning up listeners. */
  destroy(): void {
    this.#destroyed = true;

    this.#iframeManager.destroy();
    this.#messenger.destroy();
    this.#events.removeAllListeners();
  }

  /**
   * Handles messages from iframes and dispatches events.
   */
  #handleMessage(message: IframeToSDKMessage): void {
    // Validate field name for messages that carry one
    if ('field' in message && message.field != null) {
      if (!VALID_FIELD_NAMES.has(message.field)) return;
    }

    switch (message.type) {
      case 'ready':
        this.#iframeManager.markReady(message.field as CreditCardFieldName);
        this.#events.emit('ready', { field: message.field as CreditCardFieldName });
        break;

      case 'focus':
        this.#events.emit('focus', { field: message.field as CreditCardFieldName });
        break;

      case 'blur':
        this.#events.emit('blur', { field: message.field as CreditCardFieldName });
        break;

      case 'change':
        this.#events.emit('change', {
          field: message.field as CreditCardFieldName,

          complete: message.complete,
          empty: message.empty,
        });
        break;

      case 'validation':
        this.#events.emit('validation', {
          field: message.field as CreditCardFieldName,

          error: message.error,
          valid: message.valid,
        });
        break;

      case 'error':
        this.#events.emit('error', {
          field: message.field as CreditCardFieldName | undefined,

          code: message.code,
          message: message.message,
        });
        break;
    }
  }
}
