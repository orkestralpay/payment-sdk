import { describe, test, expect, vi } from 'vitest';

import { EventEmitter } from './events';

describe('EventEmitter', () => {
  test('should call registered listener when event is emitted', () => {
    const emitter = new EventEmitter();
    const callback = vi.fn();

    emitter.on('focus', callback);
    emitter.emit('focus', { field: 'cardNumber' });

    expect(callback).toHaveBeenCalledWith({ field: 'cardNumber' });
  });

  test('should support multiple listeners for the same event', () => {
    const emitter = new EventEmitter();
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    emitter.on('blur', callback1);
    emitter.on('blur', callback2);

    emitter.emit('blur', { field: 'expiry' });

    expect(callback1).toHaveBeenCalledWith({ field: 'expiry' });
    expect(callback2).toHaveBeenCalledWith({ field: 'expiry' });
  });

  test('should not call listener for a different event', () => {
    const emitter = new EventEmitter();
    const callback = vi.fn();

    emitter.on('focus', callback);
    emitter.emit('blur', { field: 'cvv' });

    expect(callback).not.toHaveBeenCalled();
  });

  test('should remove a specific listener with off()', () => {
    const emitter = new EventEmitter();
    const callback = vi.fn();

    emitter.on('change', callback);
    emitter.off('change', callback);

    emitter.emit('change', { complete: false, empty: true, field: 'cardNumber' });

    expect(callback).not.toHaveBeenCalled();
  });

  test('should remove all listeners for a specific event', () => {
    const emitter = new EventEmitter();
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    emitter.on('validation', callback1);
    emitter.on('validation', callback2);

    emitter.removeAllListeners('validation');
    emitter.emit('validation', { field: 'cardNumber', valid: true });

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  test('should remove all listeners when called without arguments', () => {
    const emitter = new EventEmitter();
    const focusCallback = vi.fn();
    const blurCallback = vi.fn();

    emitter.on('focus', focusCallback);
    emitter.on('blur', blurCallback);

    emitter.removeAllListeners();

    emitter.emit('focus', { field: 'cardNumber' });
    emitter.emit('blur', { field: 'cardNumber' });

    expect(focusCallback).not.toHaveBeenCalled();
    expect(blurCallback).not.toHaveBeenCalled();
  });

  test('should not throw when emitting an event with no listeners', () => {
    const emitter = new EventEmitter();

    expect(() => emitter.emit('ready', { field: 'cardNumber' })).not.toThrow();
  });

  test('should catch errors thrown by listeners and continue execution', () => {
    const emitter = new EventEmitter();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const errorCallback = vi.fn(() => {
      throw new Error('listener error');
    });
    const normalCallback = vi.fn();

    emitter.on('focus', errorCallback);
    emitter.on('focus', normalCallback);

    emitter.emit('focus', { field: 'cardNumber' });

    expect(errorCallback).toHaveBeenCalled();
    expect(normalCallback).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error in "focus" event handler'),
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});
