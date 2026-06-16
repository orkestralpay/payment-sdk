import type { IframeToSDKMessage, SDKToIframeMessage } from './messaging.types';

type MessageHandler = (message: IframeToSDKMessage) => void;

/**
 * Handles postMessage communication between SDK and hosted field iframes.
 * Validates origins on both incoming and outgoing messages.
 */
export class Messenger {
  readonly #allowedOrigin: string;
  #messageHandler: MessageHandler | null = null;
  #messageListener: ((event: MessageEvent) => void) | null = null;

  /** @param allowedOrigin - The origin URL accepted for incoming/outgoing messages. */
  constructor(allowedOrigin: string) {
    this.#allowedOrigin = allowedOrigin;
  }

  /** Starts listening for postMessage events from iframes. */
  listen(handler: MessageHandler): void {
    this.#messageHandler = handler;

    this.#messageListener = (event: MessageEvent) => {
      if (event.origin !== this.#allowedOrigin) return;
      if (!event.data || typeof event.data !== 'object' || !event.data.type) return;

      this.#messageHandler?.(event.data as IframeToSDKMessage);
    };

    window.addEventListener('message', this.#messageListener);
  }

  /** Sends a message to a specific iframe. */
  send(iframe: HTMLIFrameElement, message: SDKToIframeMessage): void {
    if (!iframe.contentWindow) {
      console.warn('[PaymentSDK] Cannot send message: iframe contentWindow is null.');
      return;
    }

    iframe.contentWindow.postMessage(message, this.#allowedOrigin);
  }

  /** Stops listening and cleans up event handlers. */
  destroy(): void {
    if (this.#messageListener) {
      window.removeEventListener('message', this.#messageListener);
      this.#messageListener = null;
    }

    this.#messageHandler = null;
  }
}
