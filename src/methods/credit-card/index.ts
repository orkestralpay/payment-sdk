import type { SDKConfig } from '../../core/config/config.types';
import type { FieldEventMap, FieldEventName } from '../../core/events/events.types';
import type { IframeToSDKMessage } from '../../core/messaging/messaging.types';
import type {
  CreditCardFieldName,
  CreditCardOptions,
  PayOptions,
  PayResponse,
  PayWithSavedCardOptions,
  PayWithSavedCardResponse,
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
  #operationInProgress = false;

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

  /** Tokenizes and saves the card collected by the hosted fields. */
  async tokenize(options: TokenizeOptions): Promise<TokenizeResponse> {
    return this.#runOperation('tokenize', options);
  }

  async pay(options: PayOptions): Promise<PayResponse> {
    return this.#runOperation('pay', options);
  }

  async payWithSavedCard(options: PayWithSavedCardOptions): Promise<PayWithSavedCardResponse> {
    return this.#runOperation('payWithSavedCard', options);
  }

  async #runOperation(
    action: 'tokenize',
    options: TokenizeOptions,
  ): Promise<TokenizeResponse>;
  async #runOperation(action: 'pay', options: PayOptions): Promise<PayResponse>;
  async #runOperation(
    action: 'payWithSavedCard',
    options: PayWithSavedCardOptions,
  ): Promise<PayWithSavedCardResponse>;
  async #runOperation(
    action: 'pay' | 'payWithSavedCard' | 'tokenize',
    options: PayOptions | PayWithSavedCardOptions | TokenizeOptions,
  ): Promise<PayResponse | PayWithSavedCardResponse | TokenizeResponse> {
    if (this.#destroyed) {
      throw new Error(ErrorCode.SDK_DESTROYED);
    }

    if (this.#operationInProgress) {
      throw new Error(ErrorCode.TOKENIZE_BUSY);
    }

    if (!this.#iframeManager.isAllReady()) {
      throw new Error(ErrorCode.FIELDS_NOT_READY);
    }

    return new Promise((resolve, reject) => {
      const aggregatorIframe = this.#iframeManager.getAggregatorIframe();

      if (!aggregatorIframe) {
        reject(new Error(ErrorCode.IFRAME_NOT_FOUND));
        return;
      }

      this.#operationInProgress = true;

      const correlationId = crypto.randomUUID();
      let timeoutId: ReturnType<typeof setTimeout>;

      const cleanup = () => {
        this.#operationInProgress = false;
        clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
      };

      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== this.#config.hostedFieldsUrl) return;
        if (event.source !== aggregatorIframe.contentWindow) return;
        if (!event.data || typeof event.data !== 'object') return;

        const expectedType = `${action}Result`;
        if (event.data.type === expectedType) {
          if (event.data.correlationId !== correlationId) return;
          cleanup();
          resolve(event.data.data);

        } else if (event.data.type === 'error') {
          if (event.data.correlationId !== correlationId) return;
          cleanup();
          reject(new Error(event.data.code ?? 'UNKNOWN_ERROR'));
        }
      };

      window.addEventListener('message', messageHandler);

      if (action === 'payWithSavedCard') {
        this.#messenger.send(aggregatorIframe, {
          action,
          correlationId,
          paymentIntentId: options.paymentIntentId,
          token: (options as PayWithSavedCardOptions).token,
        });
      } else {
        this.#messenger.send(aggregatorIframe, {
          action,
          correlationId,
          paymentIntentId: options.paymentIntentId,
        });
      }

      timeoutId = setTimeout(() => {
        cleanup();

        reject(new Error(ErrorCode.TOKENIZE_TIMEOUT));
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
      if (message.field !== 'aggregator' && !VALID_FIELD_NAMES.has(message.field)) return;
    }

    switch (message.type) {
      case 'ready':
        if (message.field === 'aggregator') {
          this.#iframeManager.markAggregatorReady();
          break;
        }
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
