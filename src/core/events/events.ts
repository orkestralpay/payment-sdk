import type { FieldEventMap, FieldEventName } from './events.types';

type Listener<T> = (payload: T) => void;

/** Typed event emitter for hosted field events. */
export class EventEmitter {
  #listeners: Map<string, Set<Listener<unknown>>> = new Map();

  /** Registers a listener for the given event. */
  on<K extends FieldEventName>(event: K, callback: Listener<FieldEventMap[K]>): void {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event)!.add(callback as Listener<unknown>);
  }

  /** Removes a previously registered listener. */
  off<K extends FieldEventName>(event: K, callback: Listener<FieldEventMap[K]>): void {
    this.#listeners.get(event)?.delete(callback as Listener<unknown>);
  }

  /** Emits an event, calling all registered listeners. */
  emit<K extends FieldEventName>(event: K, payload: FieldEventMap[K]): void {
    const callbacks = this.#listeners.get(event);

    if (!callbacks) return;

    for (const callback of callbacks) {
      try {
        callback(payload);
      } catch (error) {
        console.error(`[PaymentSDK] Error in "${event}" event handler:`, error);
      }
    }
  }

  /** Removes all listeners. If `event` is provided, only removes that event's listeners. */
  removeAllListeners(event?: FieldEventName): void {
    if (!event) {
      this.#listeners.clear();
      return;
    }

    this.#listeners.delete(event);
  }
}
