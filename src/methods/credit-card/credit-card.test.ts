import type { SDKConfig } from '../../core/types';

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

import { CreditCard } from './index';

describe('CreditCard', () => {
  const config: SDKConfig = {
    fieldPaths: {
      cardNumber: '/card-number',
      cvv: '/cvv',
      expiry: '/expiry',
    },
    hostedFieldsUrl: 'https://fields.example.com',
    publicKey: 'pk_test_123',
    sessionId: 'test-session-id',
  };

  const options = {
    cardNumber: { selector: '#card-number' },
    cvv: { selector: '#card-cvv' },
    expiry: { selector: '#card-expiry' },
  };

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="card-number"></div>
      <div id="card-expiry"></div>
      <div id="card-cvv"></div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('event handling', () => {
    test('should emit focus event when iframe sends focus message', () => {
      const card = new CreditCard(config, options);
      const callback = vi.fn();

      card.on('focus', callback);

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { field: 'cardNumber', type: 'focus' },
          origin: 'https://fields.example.com',
        }),
      );

      expect(callback).toHaveBeenCalledWith({ field: 'cardNumber' });

      card.destroy();
    });

    test('should emit validation event with error details', () => {
      const card = new CreditCard(config, options);
      const callback = vi.fn();

      card.on('validation', callback);

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { error: 'Invalid CVV', field: 'cvv', type: 'validation', valid: false },
          origin: 'https://fields.example.com',
        }),
      );

      expect(callback).toHaveBeenCalledWith({
        error: 'Invalid CVV',
        field: 'cvv',
        valid: false,
      });

      card.destroy();
    });

    test('should support chaining on()', () => {
      const card = new CreditCard(config, options);

      const result = card.on('focus', vi.fn()).on('blur', vi.fn());

      expect(result).toBe(card);

      card.destroy();
    });
  });

  describe('tokenize', () => {
    test('should return error when instance is destroyed', async () => {
      const card = new CreditCard(config, options);

      card.destroy();

      const result = await card.tokenize();

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.code).toBe('SDK_DESTROYED');
      }
    });

    test('should return error when saveCard is true but customerId is missing', async () => {
      const card = new CreditCard(config, options);

      const result = await card.tokenize({ saveCard: true });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.code).toBe('MISSING_CUSTOMER_ID');
      }

      card.destroy();
    });

    test('should resolve with token when iframe responds successfully', async () => {
      const card = new CreditCard(config, options);

      const tokenizePromise = card.tokenize({ saveCard: false });

      // Simulate iframe response
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            data: {
              cardBrand: 'visa',
              lastFourDigits: '4242',
              token: 'tok_abc123',
            },
            success: true,
            type: 'tokenizeResult',
          },
          origin: 'https://fields.example.com',
        }),
      );

      const result = await tokenizePromise;

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.token).toBe('tok_abc123');
        expect(result.data.cardBrand).toBe('visa');
      }

      card.destroy();
    });

    test('should resolve with vaultId when saveCard is true', async () => {
      const card = new CreditCard(config, options);

      const tokenizePromise = card.tokenize({
        customerId: 'cust_123',
        saveCard: true,
      });

      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            data: {
              cardSaved: true,
              token: 'tok_xyz',
              vaultId: 'vault_abc',
            },
            success: true,
            type: 'tokenizeResult',
          },
          origin: 'https://fields.example.com',
        }),
      );

      const result = await tokenizePromise;

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.vaultId).toBe('vault_abc');
        expect(result.data.cardSaved).toBe(true);
      }

      card.destroy();
    });

    test('should resolve with error when iframe responds with failure', async () => {
      const card = new CreditCard(config, options);

      const tokenizePromise = card.tokenize();

      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            error: {
              code: 'INVALID_CARD',
              field: 'cardNumber',
              message: 'Card number is invalid',
            },
            success: false,
            type: 'tokenizeResult',
          },
          origin: 'https://fields.example.com',
        }),
      );

      const result = await tokenizePromise;

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.code).toBe('INVALID_CARD');
        expect(result.error.field).toBe('cardNumber');
      }

      card.destroy();
    });

    test('should return TOKENIZE_BUSY when concurrent tokenize is called', async () => {
      const card = new CreditCard(config, options);

      // Start first tokenize (will not resolve)
      const firstPromise = card.tokenize();

      // Immediately call second tokenize
      const secondResult = await card.tokenize();

      expect(secondResult.success).toBe(false);

      if (!secondResult.success) {
        expect(secondResult.error.code).toBe('TOKENIZE_BUSY');
      }

      // Resolve first tokenize to clean up
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { data: { token: 'tok_1' }, success: true, type: 'tokenizeResult' },
          origin: 'https://fields.example.com',
        }),
      );
      await firstPromise;

      card.destroy();
    });

    test('should resolve with error when iframe sends error message during tokenize', async () => {
      const card = new CreditCard(config, options);

      const tokenizePromise = card.tokenize();

      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            code: 'NETWORK_ERROR',
            field: 'cardNumber',
            message: 'Connection lost',
            type: 'error',
          },
          origin: 'https://fields.example.com',
        }),
      );

      const result = await tokenizePromise;

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.code).toBe('NETWORK_ERROR');
        expect(result.error.message).toBe('Connection lost');
      }

      card.destroy();
    });
  });

  describe('field validation', () => {
    test('should ignore messages with invalid field names', () => {
      const card = new CreditCard(config, options);
      const callback = vi.fn();

      card.on('focus', callback);

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { field: 'invalidField', type: 'focus' },
          origin: 'https://fields.example.com',
        }),
      );

      expect(callback).not.toHaveBeenCalled();

      card.destroy();
    });
  });

  describe('tokenize timeout', () => {
    test('should resolve with TOKENIZE_TIMEOUT when no response arrives', async () => {
      vi.useFakeTimers();

      const card = new CreditCard(config, options);

      const tokenizePromise = card.tokenize();

      await vi.advanceTimersByTimeAsync(30_000);

      const result = await tokenizePromise;

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.code).toBe('TOKENIZE_TIMEOUT');
      }

      card.destroy();
      vi.useRealTimers();
    });

    test('should respect custom tokenizeTimeout from config', async () => {
      vi.useFakeTimers();

      const customConfig = { ...config, tokenizeTimeout: 5000 };
      const card = new CreditCard(customConfig, options);

      const tokenizePromise = card.tokenize();

      // Not timed out yet at 4999ms
      await vi.advanceTimersByTimeAsync(4999);
      // Should still be pending — advance the rest
      await vi.advanceTimersByTimeAsync(1);

      const result = await tokenizePromise;

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.code).toBe('TOKENIZE_TIMEOUT');
      }

      card.destroy();
      vi.useRealTimers();
    });

    test('should allow tokenize again after previous one completes', async () => {
      const card = new CreditCard(config, options);

      // First tokenize
      const firstPromise = card.tokenize();

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { data: { token: 'tok_1' }, success: true, type: 'tokenizeResult' },
          origin: 'https://fields.example.com',
        }),
      );

      const first = await firstPromise;

      expect(first.success).toBe(true);

      // Second tokenize should NOT be blocked
      const secondPromise = card.tokenize();

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { data: { token: 'tok_2' }, success: true, type: 'tokenizeResult' },
          origin: 'https://fields.example.com',
        }),
      );

      const second = await secondPromise;

      expect(second.success).toBe(true);

      if (second.success) {
        expect(second.data.token).toBe('tok_2');
      }

      card.destroy();
    });
  });

  describe('off()', () => {
    test('should stop receiving events after off() is called', () => {
      const card = new CreditCard(config, options);
      const callback = vi.fn();

      card.on('focus', callback);
      card.off('focus', callback);

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { field: 'cardNumber', type: 'focus' },
          origin: 'https://fields.example.com',
        }),
      );

      expect(callback).not.toHaveBeenCalled();

      card.destroy();
    });
  });

  describe('origin validation', () => {
    test('should ignore messages from wrong origin', () => {
      const card = new CreditCard(config, options);
      const callback = vi.fn();

      card.on('focus', callback);

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { field: 'cardNumber', type: 'focus' },
          origin: 'https://malicious-site.com',
        }),
      );

      expect(callback).not.toHaveBeenCalled();

      card.destroy();
    });
  });

  describe('field validation', () => {
    test('should handle error message without field property', () => {
      const card = new CreditCard(config, options);
      const callback = vi.fn();

      card.on('error', callback);

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { code: 'UNKNOWN', message: 'Something failed', type: 'error' },
          origin: 'https://fields.example.com',
        }),
      );

      expect(callback).toHaveBeenCalledWith({
        code: 'UNKNOWN',
        field: undefined,
        message: 'Something failed',
      });

      card.destroy();
    });
  });

  describe('destroy', () => {
    test('should remove iframes from DOM', () => {
      const card = new CreditCard(config, options);

      expect(document.querySelectorAll('iframe').length).toBe(3);

      card.destroy();

      expect(document.querySelectorAll('iframe').length).toBe(0);
    });

    test('should stop emitting events after destroy', () => {
      const card = new CreditCard(config, options);
      const callback = vi.fn();

      card.on('focus', callback);
      card.destroy();

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { field: 'cardNumber', type: 'focus' },
          origin: 'https://fields.example.com',
        }),
      );

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
