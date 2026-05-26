import type {
  CreditCardFieldName,
  CreditCardOptions,
  FieldConfig,
  FieldStyles,
  SDKConfig,
} from '../../core/types';

import { CREDIT_CARD_FIELD_COUNT } from '../../core/constants';
import { Messenger } from '../../core/messaging/messaging';

/** Manages creation and lifecycle of credit card hosted field iframes. */
export class IframeManager {
  readonly #config: SDKConfig;
  readonly #messenger: Messenger;

  #iframes: Map<CreditCardFieldName, HTMLIFrameElement> = new Map();
  #readyFields: Set<CreditCardFieldName> = new Set();

  constructor(config: SDKConfig, messenger: Messenger) {
    this.#config = config;
    this.#messenger = messenger;
  }

  /** Creates and injects iframes for all credit card fields. */
  create(options: CreditCardOptions): void {
    const fields: [CreditCardFieldName, FieldConfig][] = [
      ['cardNumber', options.cardNumber],
      ['expiry', options.expiry],
      ['cvv', options.cvv],
    ];

    for (const [fieldName, fieldConfig] of fields) {
      this.#createField(fieldName, fieldConfig, options.styles);
    }
  }

  /**
   * Creates a single hosted field iframe.
   */
  #createField(
    fieldName: CreditCardFieldName,
    fieldConfig: FieldConfig,
    globalStyles?: FieldStyles,
  ): void {
    const container = document.querySelector(fieldConfig.selector);
    if (!container) {
      throw new Error(
        `[PaymentSDK] Container not found for selector "${fieldConfig.selector}". ` +
        `Make sure the element exists in the DOM before calling createCreditCard().`,
      );
    }

    const iframe = document.createElement('iframe');

    iframe.src = this.#buildFieldUrl(fieldName);
    iframe.setAttribute('title', `Payment field: ${fieldName}`);
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('allowtransparency', 'true');

    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.display = 'block';
    iframe.style.overflow = 'hidden';

    // Security attributes
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');

    iframe.addEventListener('load', () => {
      this.#sendInitialConfiguration(fieldName, fieldConfig, globalStyles);
    });

    container.appendChild(iframe);
    this.#iframes.set(fieldName, iframe);
  }

  #buildFieldUrl(fieldName: CreditCardFieldName): string {
    const baseUrl = this.#config.hostedFieldsUrl;
    const path = this.#config.fieldPaths[fieldName];
    const params = new URLSearchParams({
      key: this.#config.publicKey,
      session: this.#config.sessionId!,
    });

    return `${baseUrl}${path}?${params.toString()}`;
  }

  /** Sends initial configuration (styles, placeholder) after iframe loads. */
  #sendInitialConfiguration(
    fieldName: CreditCardFieldName,
    fieldConfig: FieldConfig,
    globalStyles?: FieldStyles,
  ): void {
    const iframe = this.#iframes.get(fieldName);
    if (!iframe) return;

    // Merge global and per-field styles (field overrides global)
    const mergedStyles: FieldStyles = {
      ...globalStyles,
      ...fieldConfig.styles,
    };

    // Send styles to the iframe
    this.#messenger.send(iframe, {
      action: 'applyStyles',
      styles: mergedStyles,
    });

    // Send placeholder if configured
    if (fieldConfig.placeholder) {
      this.#messenger.send(iframe, {
        action: 'setPlaceholder',
        placeholder: fieldConfig.placeholder,
      });
    }
  }

  /** Marks a field as ready (iframe loaded and communicating). */
  markReady(field: CreditCardFieldName): void {
    this.#readyFields.add(field);
  }

  /** Returns true if all fields have reported ready. */
  isAllReady(): boolean {
    return this.#readyFields.size === CREDIT_CARD_FIELD_COUNT;
  }

  /** Returns the iframe element for a given field. */
  getIframe(fieldName: CreditCardFieldName): HTMLIFrameElement | undefined {
    return this.#iframes.get(fieldName);
  }

  /** Removes all iframes from the DOM and cleans up. */
  destroy(): void {
    for (const iframe of this.#iframes.values()) {
      iframe.remove();
    }

    this.#iframes.clear();
    this.#readyFields.clear();
  }
}
