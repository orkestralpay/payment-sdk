import type { CreditCardFieldName } from '../types';

/**
 * Event names emitted by hosted fields.
 *
 * Grouped semantically:
 * - Focus events: `blur`, `focus`
 * - State events: `change`, `validation`
 * - Lifecycle events: `error`, `ready`
 */
export type FieldEventName =
  | 'blur'
  | 'focus'

  | 'change'
  | 'validation'

  | 'error'
  | 'ready';

/** Emitted when a hosted field gains or loses focus. */
export interface FieldFocusEvent {
  /** Which field emitted the event. */
  field: CreditCardFieldName;
}

/** Emitted when a hosted field value changes. */
export interface FieldChangeEvent {
  /** Whether the field value is complete and valid. */
  complete: boolean;
  /** Whether the field is empty. */
  empty: boolean;
  /** Which field emitted the event. */
  field: CreditCardFieldName;
}

/** Emitted when field validation state changes. */
export interface FieldValidationEvent {
  /** Validation error message when `valid` is false. */
  error?: string;
  /** Which field emitted the event. */
  field: CreditCardFieldName;
  /** Whether the current value is valid. */
  valid: boolean;
}

/** Emitted when a hosted field iframe is fully loaded and ready. */
export interface FieldReadyEvent {
  /** Which field emitted the event. */
  field: CreditCardFieldName;
}

/** Emitted when an unexpected error occurs inside a hosted field. */
export interface FieldErrorEvent {
  /** Machine-readable error code. */
  code: string;
  /** Which field triggered the error, if identifiable. */
  field?: CreditCardFieldName;
  /** Human-readable error description. */
  message: string;
}

/** Maps event names to their respective payload interfaces. */
export interface FieldEventMap {
  /** Fired when a field loses focus. */
  blur: FieldFocusEvent;
  /** Fired when field content changes. */
  change: FieldChangeEvent;
  /** Fired on unexpected iframe errors. */
  error: FieldErrorEvent;
  /** Fired when a field gains focus. */
  focus: FieldFocusEvent;
  /** Fired when a field iframe is loaded and ready. */
  ready: FieldReadyEvent;
  /** Fired when field validation state changes. */
  validation: FieldValidationEvent;
}
